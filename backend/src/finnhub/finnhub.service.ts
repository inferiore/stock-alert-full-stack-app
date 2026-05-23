import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import WebSocket from 'ws';
import {
  PRICE_UPDATE_EVENT,
  PriceUpdatePayload,
} from '../common/events.constants';
import { IFinnhubService } from './interfaces/finnhub.service.interface';

interface FinnhubTradeMessage {
  type: 'trade';
  data: Array<{ s: string; p: number; t: number }>;
}

@Injectable()
export class FinnhubService
  implements IFinnhubService, OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(FinnhubService.name);
  private ws: WebSocket | null = null;
  private readonly subscribedSymbols = new Set<string>();
  private reconnectDelay = 1000;
  private readonly maxReconnectDelay = 30000;
  private destroyed = false;

  constructor(
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onApplicationBootstrap() {
    this.connect();
  }

  onApplicationShutdown() {
    this.destroyed = true;
    this.ws?.close();
  }

  subscribe(symbol: string): void {
    const upperSymbol = symbol.toUpperCase();
    this.subscribedSymbols.add(upperSymbol);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'subscribe', symbol: upperSymbol });
    }
  }

  unsubscribe(symbol: string): void {
    const upperSymbol = symbol.toUpperCase();
    this.subscribedSymbols.delete(upperSymbol);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'unsubscribe', symbol: upperSymbol });
    }
  }

  private connect(): void {
    const apiKey = this.config.get<string>('FINNHUB_API_KEY', '');
    const url = `wss://ws.finnhub.io?token=${apiKey}`;

    this.logger.log('Connecting to Finnhub WebSocket…');
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on('open', () => {
      this.logger.log('Finnhub WebSocket connected');
      this.reconnectDelay = 1000;
      for (const symbol of this.subscribedSymbols) {
        this.send({ type: 'subscribe', symbol });
      }
    });

    ws.on('message', (raw: Buffer) => {
      this.handleMessage(raw.toString('utf-8'));
    });

    ws.on('error', (err) => {
      this.logger.error('Finnhub WS error', err.message);
    });

    ws.on('close', () => {
      if (!this.destroyed) {
        this.logger.warn(
          `Finnhub WS closed. Reconnecting in ${this.reconnectDelay}ms…`,
        );
        setTimeout(() => this.connect(), this.reconnectDelay);
        this.reconnectDelay = Math.min(
          this.reconnectDelay * 2,
          this.maxReconnectDelay,
        );
      }
    });
  }

  private handleMessage(raw: string): void {
    try {
      const msg = JSON.parse(raw) as FinnhubTradeMessage;
      if (msg.type !== 'trade' || !msg.data?.length) return;

      for (const trade of msg.data) {
        const payload: PriceUpdatePayload = {
          symbol: trade.s,
          price: trade.p,
          timestamp: trade.t,
        };
        this.eventEmitter.emit(PRICE_UPDATE_EVENT, payload);
      }
    } catch {
      // malformed message — ignore
    }
  }

  private send(data: object): void {
    this.ws?.send(JSON.stringify(data));
  }
}
