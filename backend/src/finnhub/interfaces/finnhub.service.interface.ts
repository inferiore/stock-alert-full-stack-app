export const FINNHUB_SERVICE_TOKEN = 'FINNHUB_SERVICE_TOKEN';

export interface IFinnhubService {
  subscribe(symbol: string): void;
  unsubscribe(symbol: string): void;
}
