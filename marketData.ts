import { Instrument } from '../types';

export const INITIAL_INSTRUMENTS: Omit<Instrument, 'currentPrice' | 'change' | 'changePercent' | 'high' | 'low' | 'prevClose'>[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK', exchange: 'NASDAQ', base: 21400, volume: '48.2M', marketCap: '$3.28T' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'STOCK', exchange: 'NASDAQ', base: 43500, volume: '22.1M', marketCap: '$3.23T' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'STOCK', exchange: 'NASDAQ', base: 14200, volume: '89.4M', marketCap: '$3.49T' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'STOCK', exchange: 'NASDAQ', base: 26800, volume: '64.7M', marketCap: '$856B' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'STOCK', exchange: 'NASDAQ', base: 19600, volume: '34.9M', marketCap: '$2.04T' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'STOCK', exchange: 'NASDAQ', base: 18100, volume: '28.3M', marketCap: '$2.22T' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', type: 'STOCK', exchange: 'NYSE', base: 25300, volume: '12.4M', marketCap: '$724B' },
  { symbol: 'XOM', name: 'Exxon Mobil Corp.', type: 'STOCK', exchange: 'NYSE', base: 11400, volume: '16.8M', marketCap: '$452B' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', type: 'ETF', exchange: 'NYSE Arca', base: 58200, volume: '51.3M', marketCap: '$580B' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', type: 'ETF', exchange: 'NASDAQ', base: 49800, volume: '41.7M', marketCap: '$290B' },
  { symbol: 'VTI', name: 'Vanguard Total Market ETF', type: 'ETF', exchange: 'NYSE Arca', base: 29600, volume: '3.8M', marketCap: '$410B' },
  { symbol: 'GLD', name: 'SPDR Gold Shares', type: 'ETF', exchange: 'NYSE Arca', base: 28900, volume: '7.1M', marketCap: '$78B' },
];

export const BY_SYMBOL = Object.fromEntries(INITIAL_INSTRUMENTS.map(i => [i.symbol, i]));

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

export function priceAt(symbol: string, t: number = Date.now()): number {
  const i = BY_SYMBOL[symbol];
  if (!i) return 10000;
  const h = hash(symbol);
  const b = Math.floor(t / 15000) * 15000;
  const x = Math.sin(b / 5400000 + (h % 97)) * 0.04 +
            Math.sin(b / 260000 + (h % 13)) * 0.01 +
            Math.sin(b / 45000 + (h % 7)) * 0.003;
  return Math.max(1, Math.round(i.base * (1 + x)));
}

export function prevClose(symbol: string, t: number = Date.now()): number {
  return priceAt(symbol, Math.floor(t / 86400000) * 86400000);
}

export function getFullInstrument(symbol: string, t: number = Date.now()): Instrument {
  const i = BY_SYMBOL[symbol] || INITIAL_INSTRUMENTS[0];
  const currentPrice = priceAt(symbol, t);
  const close = prevClose(symbol, t);
  const change = currentPrice - close;
  const changePercent = close > 0 ? (change / close) * 100 : 0;
  const high = Math.round(currentPrice * 1.018);
  const low = Math.round(currentPrice * 0.982);

  return {
    ...i,
    currentPrice,
    prevClose: close,
    change,
    changePercent,
    high,
    low,
  };
}

export function getAllInstruments(t: number = Date.now()): Instrument[] {
  return INITIAL_INSTRUMENTS.map(i => getFullInstrument(i.symbol, t));
}

export interface Candlestick {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function generateCandles(
  symbol: string,
  timeframe: '1D' | '1W' | '1M' | '1Y' | 'ALL' = '1D',
  count: number = 60
): Candlestick[] {
  const now = Date.now();
  let stepMs = 3 * 60 * 1000; // 3 min default for 1D

  if (timeframe === '1W') stepMs = 30 * 60 * 1000;
  else if (timeframe === '1M') stepMs = 2 * 3600 * 1000;
  else if (timeframe === '1Y') stepMs = 24 * 3600 * 1000;
  else if (timeframe === 'ALL') stepMs = 7 * 24 * 3600 * 1000;

  const candles: Candlestick[] = [];
  const basePrice = priceAt(symbol, now);
  const h = hash(symbol);

  for (let k = 0; k < count; k++) {
    const candleTime = now - (count - 1 - k) * stepMs;
    const base = priceAt(symbol, candleTime);
    const noise = Math.sin((k + h) * 0.4) * (base * 0.004) + Math.cos((k + h) * 0.9) * (base * 0.003);
    const close = Math.round(base + noise);
    const prevC = k > 0 ? candles[k - 1].close : Math.round(close * 0.998);
    const open = prevC;
    const spread = Math.abs(close - open);
    const high = Math.round(Math.max(open, close) + Math.random() * (spread * 0.8 + base * 0.002));
    const low = Math.round(Math.min(open, close) - Math.random() * (spread * 0.8 + base * 0.002));
    const volume = Math.round(5000 + Math.sin(k) * 2000 + (spread / base) * 50000);

    candles.push({
      time: candleTime,
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return candles;
}

export interface OrderBookLevel {
  price: number;
  qty: number;
  total: number;
}

export function generateOrderBook(symbol: string, depth: number = 7): { bids: OrderBookLevel[]; asks: OrderBookLevel[] } {
  const mid = priceAt(symbol);
  const bids: OrderBookLevel[] = [];
  const asks: OrderBookLevel[] = [];

  let bidTotal = 0;
  let askTotal = 0;

  for (let i = 1; i <= depth; i++) {
    const bidPrice = Math.max(1, mid - i * Math.round(mid * 0.0006));
    const bidQty = Math.round(15 + Math.random() * 80 + i * 10);
    bidTotal += bidQty;
    bids.push({ price: bidPrice, qty: bidQty, total: bidTotal });

    const askPrice = mid + i * Math.round(mid * 0.0006);
    const askQty = Math.round(15 + Math.random() * 80 + i * 10);
    askTotal += askQty;
    asks.push({ price: askPrice, qty: askQty, total: askTotal });
  }

  return { bids, asks };
}

export function formatCurrency(cents: number): string {
  const isNegative = cents < 0;
  const abs = Math.abs(cents);
  const formatted = (abs / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${isNegative ? '-' : ''}$${formatted}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}
