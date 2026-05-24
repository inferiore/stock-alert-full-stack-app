import { CandlePoint, QuotePoint } from '../stocks.service';

export const STOCKS_SERVICE_TOKEN = 'STOCKS_SERVICE_TOKEN';

export interface IStocksService {
  searchSymbols(query: string): Promise<{ symbol: string; description: string; type: string }[]>;
  getQuote(symbol: string): Promise<QuotePoint>;
  getCandles(symbol: string): Promise<CandlePoint[]>;
}
