import React, { useState, useMemo } from 'react';
import { generateCandles, formatCurrency } from '../services/marketData';
import { BarChart3, LineChart } from 'lucide-react';

interface InteractiveChartProps {
  symbol: string;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({ symbol }) => {
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '1Y' | 'ALL'>('1D');
  const [chartMode, setChartMode] = useState<'candlestick' | 'area'>('area');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const candles = useMemo(() => {
    return generateCandles(symbol, timeframe, 60);
  }, [symbol, timeframe]);

  const activeCandle = hoverIndex !== null && candles[hoverIndex] ? candles[hoverIndex] : candles[candles.length - 1];

  // Boundaries calculation
  const { minPrice, maxPrice, priceRange } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    candles.forEach(c => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    });
    const pad = (max - min) * 0.08 || 100;
    return {
      minPrice: Math.max(1, min - pad),
      maxPrice: max + pad,
      priceRange: max + pad - Math.max(1, min - pad),
    };
  }, [candles]);

  const width = 800;
  const height = 300;
  const chartBottom = height - 30;

  const getX = (index: number) => (index / (candles.length - 1)) * (width - 40) + 10;
  const getY = (val: number) => chartBottom - ((val - minPrice) / priceRange) * (chartBottom - 20);

  // SVG Area path
  const areaPath = useMemo(() => {
    if (candles.length === 0) return '';
    const points = candles.map((c, i) => `${getX(i).toFixed(1)},${getY(c.close).toFixed(1)}`);
    const linePath = points.join(' L ');
    return `M ${points[0]} L ${linePath} L ${getX(candles.length - 1)},${chartBottom} L ${getX(0)},${chartBottom} Z`;
  }, [candles, minPrice, priceRange]);

  const linePath = useMemo(() => {
    if (candles.length === 0) return '';
    return candles.map((c, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)},${getY(c.close).toFixed(1)}`).join(' ');
  }, [candles, minPrice, priceRange]);

  const isUp = candles.length > 1 ? candles[candles.length - 1].close >= candles[0].open : true;
  const strokeColor = isUp ? '#2563eb' : '#e11d48';
  const fillColor = isUp ? 'url(#blueGradient)' : 'url(#roseGradient)';

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-4 flex flex-col gap-3 shadow-xs">
      {/* Chart Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="font-mono">
            <span className="text-xl font-extrabold text-slate-900">
              {formatCurrency(activeCandle.close)}
            </span>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              <span>O: <span className="text-slate-800 font-medium">{formatCurrency(activeCandle.open)}</span></span>
              <span>H: <span className="text-slate-800 font-medium">{formatCurrency(activeCandle.high)}</span></span>
              <span>L: <span className="text-slate-800 font-medium">{formatCurrency(activeCandle.low)}</span></span>
              <span>Vol: <span className="text-slate-800 font-medium">{(activeCandle.volume / 1000).toFixed(1)}K</span></span>
            </div>
          </div>
        </div>

        {/* Timeframe & Mode Controls */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
            <button
              onClick={() => setChartMode('area')}
              className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                chartMode === 'area' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Area Line Chart"
            >
              <LineChart className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartMode('candlestick')}
              className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                chartMode === 'candlestick' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Candlestick Chart"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Timeframe Buttons */}
          <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 font-mono text-xs">
            {(['1D', '1W', '1M', '1Y', 'ALL'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  timeframe === tf ? 'bg-[#0F172A] text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive SVG Chart Viewport */}
      <div className="relative w-full h-[280px] select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          onMouseMove={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width;
            const idx = Math.min(candles.length - 1, Math.max(0, Math.round(relX * (candles.length - 1))));
            setHoverIndex(idx);
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="roseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e11d48" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0.2, 0.4, 0.6, 0.8].map(ratio => {
            const y = chartBottom * ratio;
            const price = Math.round(maxPrice - ratio * priceRange);
            return (
              <g key={ratio}>
                <line x1="0" y1={y} x2={width} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                <text x={width - 5} y={y - 4} fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="end">
                  {formatCurrency(price)}
                </text>
              </g>
            );
          })}

          {/* Area Chart Mode */}
          {chartMode === 'area' && (
            <>
              <path d={areaPath} fill={fillColor} />
              <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" />
            </>
          )}

          {/* Candlestick Mode */}
          {chartMode === 'candlestick' && (
            candles.map((c, i) => {
              const x = getX(i);
              const candleUp = c.close >= c.open;
              const color = candleUp ? '#2563eb' : '#e11d48';
              const yHigh = getY(c.high);
              const yLow = getY(c.low);
              const yOpen = getY(c.open);
              const yClose = getY(c.close);
              const bodyTop = Math.min(yOpen, yClose);
              const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));
              const bodyWidth = Math.max(3, (width / candles.length) * 0.7);

              return (
                <g key={i}>
                  {/* Wick */}
                  <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1.2" />
                  {/* Body */}
                  <rect
                    x={x - bodyWidth / 2}
                    y={bodyTop}
                    width={bodyWidth}
                    height={bodyHeight}
                    fill={color}
                    rx="1"
                  />
                </g>
              );
            })
          )}

          {/* Hover Crosshair & Pointer */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={0}
                x2={getX(hoverIndex)}
                y2={chartBottom}
                stroke="#64748b"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(activeCandle.close)}
                r="4.5"
                fill="#fff"
                stroke={strokeColor}
                strokeWidth="2.5"
              />
            </g>
          )}
        </svg>

        {/* Date / Time footer */}
        <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-100">
          <span>{new Date(candles[0].time).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
          <span>
            {new Date(activeCandle.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span>{new Date(candles[candles.length - 1].time).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>
    </div>
  );
};
