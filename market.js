// SIMULATED market data. Deterministic, so browser and server agree. Prices are integer cents.
export const INSTRUMENTS = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK', exchange: 'NASDAQ', base: 21400 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'STOCK', exchange: 'NASDAQ', base: 43500 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'STOCK', exchange: 'NASDAQ', base: 14200 },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'STOCK', exchange: 'NASDAQ', base: 26800 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'STOCK', exchange: 'NASDAQ', base: 19600 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'STOCK', exchange: 'NASDAQ', base: 18100 },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', type: 'STOCK', exchange: 'NYSE', base: 25300 },
  { symbol: 'XOM', name: 'Exxon Mobil Corp.', type: 'STOCK', exchange: 'NYSE', base: 11400 },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', type: 'ETF', exchange: 'NYSE Arca', base: 58200 },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', type: 'ETF', exchange: 'NASDAQ', base: 49800 },
  { symbol: 'VTI', name: 'Vanguard Total Market ETF', type: 'ETF', exchange: 'NYSE Arca', base: 29600 },
  { symbol: 'GLD', name: 'SPDR Gold Shares', type: 'ETF', exchange: 'NYSE Arca', base: 28900 },
];
export const BY_SYMBOL = Object.fromEntries(INSTRUMENTS.map(i => [i.symbol, i]));
const hash = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
export function priceAt(symbol, t = Date.now()) {
  const i = BY_SYMBOL[symbol]; if (!i) return null;
  const h = hash(symbol), b = Math.floor(t / 15000) * 15000;
  const x = Math.sin(b / 5400000 + (h % 97)) * 0.04 + Math.sin(b / 260000 + (h % 13)) * 0.01 + Math.sin(b / 45000 + (h % 7)) * 0.003;
  return Math.max(1, Math.round(i.base * (1 + x)));
}
export const prevClose = (symbol, t = Date.now()) => priceAt(symbol, Math.floor(t / 86400000) * 86400000);
export function series(symbol, points = 60, stepMs = 180000, t = Date.now()) {
  return Array.from({ length: points }, (_, k) => priceAt(symbol, t - (points - 1 - k) * stepMs));
}
