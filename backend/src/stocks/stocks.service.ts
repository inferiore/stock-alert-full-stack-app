import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IStocksService } from './interfaces/stocks.service.interface';

export interface QuotePoint {
  symbol: string;
  price: number;       // current price
  change: number;      // change vs prev close
  changePercent: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
}

export interface CandlePoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

@Injectable()
export class StocksService implements IStocksService {
  private readonly logger = new Logger(StocksService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  async searchSymbols(query: string): Promise<{ symbol: string; description: string; type: string }[]> {
    const apiKey = this.config.get<string>('FINNHUB_API_KEY', '');
    interface FinnhubSearchResult { symbol: string; description: string; displaySymbol: string; type: string; }
    interface FinnhubSearchResponse { count: number; result: FinnhubSearchResult[]; }

    const { data } = await firstValueFrom(
      this.httpService.get<FinnhubSearchResponse>('https://finnhub.io/api/v1/search', {
        params: { q: query, token: apiKey },
      }),
    );
    return (data.result ?? [])
      .filter((r) => r.type === 'Common Stock')
      .slice(0, 10)
      .map((r) => ({ symbol: r.displaySymbol, description: r.description, type: r.type }));
  }

  async getQuote(symbol: string): Promise<QuotePoint> {
    const apiKey = this.config.get<string>('FINNHUB_API_KEY', '');
    const upper = symbol.toUpperCase();

    interface FinnhubQuote { c: number; d: number; dp: number; h: number; l: number; o: number; pc: number; }
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<FinnhubQuote>('https://finnhub.io/api/v1/quote', {
          params: { symbol: upper, token: apiKey },
        }),
      );
      return {
        symbol: upper,
        price: data.c,
        change: data.d,
        changePercent: data.dp,
        high: data.h,
        low: data.l,
        open: data.o,
        prevClose: data.pc,
      };
    } catch (err) {
      this.logger.error(`Failed to fetch quote for ${upper}`, err);
      throw err;
    }
  }

  async getCandles(symbol: string): Promise<CandlePoint[]> {
    const upper = symbol.toUpperCase();

    interface YahooResponse {
      chart: {
        result: {
          timestamp: number[];
          indicators: { quote: { open: number[]; high: number[]; low: number[]; close: number[]; volume: number[] }[] };
        }[];
        error: unknown;
      };
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<YahooResponse>(
          `https://query1.finance.yahoo.com/v8/finance/chart/${upper}`,
          {
            params: { interval: '1d', range: '1mo' },
            headers: { 'User-Agent': 'Mozilla/5.0' },
          },
        ),
      );

      const result = data.chart.result?.[0];
      if (!result) throw new Error('No data from Yahoo Finance');

      const timestamps = result.timestamp;
      const quote = result.indicators.quote[0];

      return timestamps
        .map((ts, i) => ({
          timestamp: ts,
          open:   +(quote.open[i]?.toFixed(2)   ?? 0),
          high:   +(quote.high[i]?.toFixed(2)   ?? 0),
          low:    +(quote.low[i]?.toFixed(2)    ?? 0),
          close:  +(quote.close[i]?.toFixed(2)  ?? 0),
          volume: quote.volume[i] ?? 0,
        }))
        .filter((p) => p.close > 0);
    } catch (err) {
      this.logger.error(`Failed to fetch candles for ${upper}`, err);
      throw err;
    }
  }
}
