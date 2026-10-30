import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { formatCurrency } from '../services/marketData';
import {
  BookmarkCheck,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Bell,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';

export const WatchlistView: React.FC = () => {
  const {
    watchlist,
    priceAlerts,
    instruments,
    addToWatchlist,
    removeFromWatchlist,
    addPriceAlert,
    removePriceAlert,
    setSelectedSymbol,
    setActiveView,
  } = useTrading();

  const [symbolToAdd, setSymbolToAdd] = useState('AMZN');
  const [alertSymbol, setAlertSymbol] = useState('NVDA');
  const [alertDirection, setAlertDirection] = useState<'above' | 'below'>('above');
  const [alertPrice, setAlertPrice] = useState('');
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const watchedInstruments = instruments.filter(i => watchlist.includes(i.symbol));
  const availableToAdd = instruments.filter(i => !watchlist.includes(i.symbol));

  const handleTrade = (sym: string) => {
    setSelectedSymbol(sym);
    setActiveView('trade');
  };

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertPrice || parseFloat(alertPrice) <= 0) return;

    addPriceAlert(alertSymbol, alertDirection, alertPrice);
    setAlertPrice('');
    setAlertMsg(`Trigger armed: ${alertSymbol} ${alertDirection} $${parseFloat(alertPrice).toFixed(2)}`);
    setTimeout(() => setAlertMsg(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-[#17191B]/15">
        <div>
          <div className="text-[10px] uppercase font-mono tracking-widest text-[#9B8055] font-semibold">
            Market Intelligence · Real-Time Surveillance
          </div>
          <h1 className="font-serif text-3xl font-normal text-[#17191B] tracking-tight mt-1">
            Watchlist & Price Targets
          </h1>
        </div>
        <div className="text-right text-xs font-mono text-[#17191B]/60">
          Surveillance Engine: <span className="text-[#17191B] font-semibold">Active</span> · Threshold Dispatcher
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Watchlist Table */}
        <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#17191B]/15 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#17191B]/15">
            <div className="flex items-center gap-2">
              <BookmarkCheck className="w-4 h-4 text-[#9B8055]" />
              <h2 className="font-serif text-xl font-normal text-[#17191B]">
                Watched Equities ({watchlist.length})
              </h2>
            </div>

            {availableToAdd.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={symbolToAdd}
                  onChange={e => setSymbolToAdd(e.target.value)}
                  className="bg-[#F4F1EA] border border-[#17191B]/15 px-2.5 py-1.5 text-xs text-[#17191B] font-mono focus:outline-none"
                >
                  {availableToAdd.map(i => (
                    <option key={i.symbol} value={i.symbol}>
                      {i.symbol} - {i.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => addToWatchlist(symbolToAdd)}
                  className="px-3 py-1.5 bg-[#17191B] hover:bg-[#34383B] text-[#FFFFFF] font-mono text-xs uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#9B8055]" />
                  Add
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            {watchedInstruments.length === 0 ? (
              <p className="py-12 text-center text-xs font-serif text-[#17191B]/60">Your watchlist is currently empty.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[#17191B]/60 border-b border-[#17191B]/15 uppercase tracking-wider text-[10px] font-mono">
                    <th className="py-2.5 font-semibold">Instrument</th>
                    <th className="py-2.5 font-semibold text-right">Price</th>
                    <th className="py-2.5 font-semibold text-right">24h Delta</th>
                    <th className="py-2.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#17191B]/10">
                  {watchedInstruments.map(inst => {
                    const isUp = inst.change >= 0;
                    return (
                      <tr key={inst.symbol} className="hover:bg-[#F4F1EA]/50 transition-colors">
                        <td className="py-3.5">
                          <div className="font-mono font-bold text-[#17191B] text-sm">{inst.symbol}</div>
                          <div className="text-[11px] text-[#17191B]/60">{inst.name}</div>
                        </td>
                        <td className="py-3.5 text-right font-mono text-sm font-bold text-[#17191B]">
                          {formatCurrency(inst.currentPrice)}
                        </td>
                        <td className="py-3.5 text-right font-mono">
                          <span
                            className={`font-semibold inline-flex items-center gap-0.5 ${
                              isUp ? 'text-emerald-800' : 'text-rose-800'
                            }`}
                          >
                            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {isUp ? '+' : ''}
                            {inst.changePercent.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-3.5 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => handleTrade(inst.symbol)}
                            className="px-2.5 py-1 text-xs font-mono uppercase tracking-wider bg-[#F4F1EA] hover:bg-[#17191B] hover:text-[#FFFFFF] text-[#17191B] border border-[#17191B]/15 transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            Trade <ArrowUpRight className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeFromWatchlist(inst.symbol)}
                            className="p-1 text-[#17191B]/40 hover:text-rose-800 transition-colors cursor-pointer"
                            title="Remove from watchlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Price Alerts Panel */}
        <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#17191B]/15 p-6 space-y-4">
          <div className="pb-3 border-b border-[#17191B]/15">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#17191B] flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-[#9B8055]" />
              Price Trigger Dispatcher
            </h2>
            <div className="text-[10px] font-mono text-[#17191B]/60 mt-0.5">Automated algorithmic surveillance</div>
          </div>

          <form onSubmit={handleCreateAlert} className="space-y-3 bg-[#F4F1EA] p-4 border border-[#17191B]/15">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-mono font-bold text-[#17191B]/70 uppercase tracking-wider mb-1">
                  Symbol
                </label>
                <select
                  value={alertSymbol}
                  onChange={e => setAlertSymbol(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#17191B]/15 px-2.5 py-1.5 text-xs text-[#17191B] font-mono focus:outline-none"
                >
                  {instruments.map(i => (
                    <option key={i.symbol} value={i.symbol}>
                      {i.symbol}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-[#17191B]/70 uppercase tracking-wider mb-1">
                  Condition
                </label>
                <select
                  value={alertDirection}
                  onChange={e => setAlertDirection(e.target.value as 'above' | 'below')}
                  className="w-full bg-[#FFFFFF] border border-[#17191B]/15 px-2.5 py-1.5 text-xs text-[#17191B] font-mono focus:outline-none"
                >
                  <option value="above">rises above (≥)</option>
                  <option value="below">falls below (≤)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold text-[#17191B]/70 uppercase tracking-wider mb-1">
                Target Price (USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={alertPrice}
                onChange={e => setAlertPrice(e.target.value)}
                placeholder="e.g. 150.00"
                className="w-full bg-[#FFFFFF] border border-[#17191B]/15 px-3 py-1.5 text-xs text-[#17191B] font-mono focus:outline-none"
              />
            </div>

            {alertMsg && (
              <div className="p-2.5 bg-emerald-50 text-emerald-950 border border-emerald-300 text-xs flex items-center gap-1.5 font-mono text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                {alertMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-[#17191B] hover:bg-[#34383B] text-[#FFFFFF] font-mono font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer"
            >
              Arm Price Trigger
            </button>
          </form>

          {/* Active Alerts List */}
          <div className="space-y-2 pt-2">
            <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#17191B]/60">
              Active Trigger Queue ({priceAlerts.length})
            </h3>
            {priceAlerts.length === 0 ? (
              <p className="py-4 text-center text-xs font-mono text-[#17191B]/40">No price alerts armed</p>
            ) : (
              <div className="divide-y divide-[#17191B]/10 max-h-56 overflow-y-auto pr-1">
                {priceAlerts.map(a => (
                  <div key={a.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono font-bold text-[#17191B] flex items-center gap-1.5">
                        {a.symbol}
                        <span className="text-[10px] uppercase font-normal text-[#17191B]/60">
                          {a.direction}
                        </span>
                        <span className="font-mono text-[#9B8055] font-bold">
                          {formatCurrency(a.priceMinor)}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#17191B]/50 font-mono mt-0.5">
                        {a.active ? (
                          <span className="text-emerald-800 font-medium">Monitoring Feed</span>
                        ) : (
                          <span className="text-amber-800 font-medium">Triggered</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => removePriceAlert(a.id)}
                      className="p-1 text-[#17191B]/40 hover:text-rose-800 transition-colors cursor-pointer"
                      title="Disarm alert"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
