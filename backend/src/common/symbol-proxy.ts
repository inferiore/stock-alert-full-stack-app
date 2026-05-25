// Finnhub free-tier only delivers real-time WebSocket trades for crypto.
// Maps each US stock display symbol to a Binance pair that actually streams data.
export const CRYPTO_PROXY: Record<string, string> = {
  AAPL:  'BINANCE:BTCUSDT',
  GOOGL: 'BINANCE:ETHUSDT',
  TSLA:  'BINANCE:SOLUSDT',
  MSFT:  'BINANCE:BNBUSDT',
  AMZN:  'BINANCE:XRPUSDT',
  NVDA:  'BINANCE:ADAUSDT',
};

// Reverse map: crypto pair → display symbol
export const REVERSE_PROXY: Record<string, string> = Object.fromEntries(
  Object.entries(CRYPTO_PROXY).map(([stock, crypto]) => [crypto, stock]),
);
