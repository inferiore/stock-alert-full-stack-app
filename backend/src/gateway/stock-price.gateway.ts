import { Inject, Logger, UseGuards } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { PRICE_UPDATE_EVENT } from '../common/events.constants';
import type { PriceUpdatePayload } from '../common/events.constants';
import { FINNHUB_SERVICE_TOKEN } from '../finnhub/interfaces/finnhub.service.interface';
import type { IFinnhubService } from '../finnhub/interfaces/finnhub.service.interface';
import { WsJwtGuard } from './ws-jwt.guard';
import { CRYPTO_PROXY, REVERSE_PROXY } from '../common/symbol-proxy';

interface SocketData {
  userId: string;
  email: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/stocks',
})
export class StockPriceGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server: Server;

  private readonly logger = new Logger(StockPriceGateway.name);

  constructor(
    @Inject(FINNHUB_SERVICE_TOKEN)
    private readonly finnhubService: IFinnhubService,
  ) {}

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('subscribe-symbol')
  handleSubscribe(client: Socket, symbol: string): void {
    const upper = symbol.toUpperCase();
    // Client joins the room identified by the display symbol (e.g. "AAPL")
    void client.join(upper);
    // Internally subscribe to the crypto proxy so Finnhub free tier delivers data
    const finnhubSymbol = CRYPTO_PROXY[upper] ?? upper;
    this.finnhubService.subscribe(finnhubSymbol);
    this.logger.log(
      `${(client.data as SocketData).email} subscribed to ${upper} → ${finnhubSymbol}`,
    );
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('unsubscribe-symbol')
  handleUnsubscribe(client: Socket, symbol: string): void {
    const upper = symbol.toUpperCase();
    void client.leave(upper);
    const finnhubSymbol = CRYPTO_PROXY[upper] ?? upper;
    this.finnhubService.unsubscribe(finnhubSymbol);
    this.logger.log(`Client ${client.id} unsubscribed from ${upper}`);
  }

  @OnEvent(PRICE_UPDATE_EVENT)
  broadcastPrice(payload: PriceUpdatePayload): void {
    // Translate crypto pair back to display symbol before sending to clients
    const displaySymbol = REVERSE_PROXY[payload.symbol] ?? payload.symbol;
    this.server.to(displaySymbol).emit('price', {
      symbol: displaySymbol,
      price: payload.price,
      timestamp: payload.timestamp,
    });
  }
}
