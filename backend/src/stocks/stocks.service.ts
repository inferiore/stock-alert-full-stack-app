import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface CandlePoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface FinnhubCandleResponse {
  s: 'ok' | 'no_data';
  t: number[];
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
}

@Injectable()
export class StocksService {
  private readonly logger = new Logger(StocksService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  async getCandles(symbol: string, days = 30): Promise<CandlePoint[]> {
    const to = Math.floor(Date.now() / 1000);
    const from = to - days * 24 * 60 * 60;
    const apiKey = this.config.get<string>('FINNHUB_API_KEY', '');

    const url = 'https://finnhub.io/api/v1/stock/candle';

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<FinnhubCandleResponse>(url, {
          params: {
            symbol: symbol.toUpperCase(),
            resolution: 'D',
            from,
            to,
            token: apiKey,
          },
        }),
      );

      if (data.s !== 'ok' || !data.t?.length) return [];

      return data.t.map((ts, i) => ({
        timestamp: ts,
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        volume: data.v[i],
      }));
    } catch (err) {
      this.logger.error(`Failed to fetch candles for ${symbol}`, err);
      return [];
    }
  }
}
