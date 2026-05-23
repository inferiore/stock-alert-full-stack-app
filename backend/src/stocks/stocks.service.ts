import { Injectable } from '@nestjs/common';

export interface CandlePoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const BASE_PRICES: Record<string, number> = {
  AAPL: 210,
  GOOGL: 175,
  TSLA: 250,
  MSFT: 420,
  NVDA: 900,
  AMZN: 200,
  META: 550,
};

// Finnhub free tier does not include historical candle data (/stock/candle
// requires a paid plan). We generate a deterministic random-walk so the chart
// renders with realistic-looking data without a premium key.
@Injectable()
export class StocksService {
  getCandles(symbol: string, days = 30): CandlePoint[] {
    const upper = symbol.toUpperCase();
    const basePrice = BASE_PRICES[upper] ?? 100;

    // Simple seeded PRNG (mulberry32) so results are stable per symbol.
    let seed = [...upper].reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const rand = () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const now = Math.floor(Date.now() / 1000);
    const points: CandlePoint[] = [];
    let price = basePrice;

    for (let i = days - 1; i >= 0; i--) {
      const ts = now - i * 86400;
      const change = (rand() - 0.48) * price * 0.03;
      const open = price;
      price = Math.max(1, price + change);
      const close = price;
      const high = Math.max(open, close) * (1 + rand() * 0.01);
      const low = Math.min(open, close) * (1 - rand() * 0.01);
      points.push({
        timestamp: ts,
        open: +open.toFixed(2),
        high: +high.toFixed(2),
        low: +low.toFixed(2),
        close: +close.toFixed(2),
        volume: Math.floor(rand() * 50_000_000 + 10_000_000),
      });
    }

    return points;
  }
}
