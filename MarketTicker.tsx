import React from 'react';
import { useTrading } from '../context/TradingContext';
import { formatCurrency } from '../services/marketData';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const MarketTicker: React.FC = () => {
  const { instruments, setSelectedSymbol, setActiveView } = useTrading();

  const handleSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
    setActiveView('trade');
  };

  return (
    <div className="bg-[#FFFFFF] border-b border-[#B7B1A6]/30 py-2 px-4 overflow-hidden select-none">
      <div className="max-w-7xl mx-auto flex items-center gap-6 overflow-x-auto scrollbar-none text-xs whitespace-nowrap">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#9B8055] font-bold flex items-center gap-1.5 shrink-0 border-r border-[#B7B1A6]/40 pr-4">
          <span className="w-1.5 h-1.5 bg-[#9B8055]" />
          SIMULATED QUOTES · NOT LIVE
        </span>

        {instruments.map(inst => {
          const isUp = inst.change >= 0;
          return (
            <button
              key={inst.symbol}
              onClick={() => handleSelect(inst.symbol)}
              className="flex items-center gap-2 px-2 py-0.5 hover:bg-[#F4F1EA] transition-colors shrink-0 group focus:outline-none cursor-pointer"
            >
              <span className="font-mono font-bold text-[#17191B] group-hover:text-[#9B8055] transition-colors">
                {inst.symbol}
              </span>
              <span className="font-mono text-[#34383B]">
                {formatCurrency(inst.currentPrice)}
              </span>
              <span
                className={`font-mono text-[11px] flex items-center gap-0.5 font-semibold ${
                  isUp ? 'text-[#9B8055]' : 'text-rose-700'
                }`}
              >
                {isUp ? (
                  <TrendingUp className="w-2.5 h-2.5" />
                ) : (
                  <TrendingDown className="w-2.5 h-2.5" />
                )}
                {isUp ? '+' : ''}
                {inst.changePercent.toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
