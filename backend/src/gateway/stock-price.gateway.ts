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
import {
  PRICE_UPDATE_EVENT,
  PriceUpdatePayload,
} from '../common/events.constants';
import {
  FINNHUB_SERVICE_TOKEN,
  IFinnhubService,
} from '../finnhub/interfaces/finnhub.service.interface';
import { WsJwtGuard } from './ws-jwt.guard';

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
    void client.join(upper);
    this.finnhubService.subscribe(upper);
    this.logger.log(
      `${(client.data as SocketData).email} subscribed to ${upper}`,
    );
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('unsubscribe-symbol')
  handleUnsubscribe(client: Socket, symbol: string): void {
    const upper = symbol.toUpperCase();
    void client.leave(upper);
    this.logger.log(`Client ${client.id} unsubscribed from ${upper}`);
  }

  @OnEvent(PRICE_UPDATE_EVENT)
  broadcastPrice(payload: PriceUpdatePayload): void {
    this.server.to(payload.symbol).emit('price', {
      symbol: payload.symbol,
      price: payload.price,
      timestamp: payload.timestamp,
    });
  }
}
