import React, { useMemo } from 'react';
import { useTrading } from '../context/TradingContext';
import { formatCurrency } from '../services/marketData';
import { Briefcase, ArrowUpRight } from 'lucide-react';

export const PortfolioView: React.FC = () => {
  const {
    account,
    positions,
    instruments,
    setSelectedSymbol,
    setActiveView,
  } = useTrading();

  const enrichedPositions = useMemo(() => {
    return positions
      .filter(p => p.qty > 0)
      .map(p => {
        const inst = instruments.find(i => i.symbol === p.symbol);
        const currentPx = inst ? inst.currentPrice : 10000;
        const prevPx = inst ? inst.prevClose : currentPx;
        const totalValue = p.qty * currentPx;
        const avgCost = p.qty > 0 ? Math.round(p.costBasisMinor / p.qty) : 0;
        const unrealizedPnl = totalValue - p.costBasisMinor;
        const returnPercent = p.costBasisMinor > 0 ? (unrealizedPnl / p.costBasisMinor) * 100 : 0;
        const dayChange = p.qty * (currentPx - prevPx);

        return {
          ...p,
          inst,
          currentPx,
          avgCost,
          totalValue,
          unrealizedPnl,
          returnPercent,
          dayChange,
        };
      });
  }, [instruments, positions]);

  const totalInvested = enrichedPositions.reduce((acc, p) => acc + p.totalValue, 0);
  const totalCost = enrichedPositions.reduce((acc, p) => acc + p.costBasisMinor, 0);
  const totalUnrealized = totalInvested - totalCost;
  const totalReturnPercent = totalCost > 0 ? (totalUnrealized / totalCost) * 100 : 0;
  const availableCash = account ? account.cash + account.reserved + account.hold : 0;
  const totalEquity = availableCash + totalInvested;

  const handleAction = (sym: string) => {
    setSelectedSymbol(sym);
    setActiveView('trade');
  };

  if (!account) return null;

  return (
    <div className="space-y-6">
      {/* Portfolio Summary Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-[#17191B]/15">
        <div>
          <div className="text-[10px] uppercase font-mono tracking-widest text-[#9B8055] font-semibold">
            Custody Portfolio · Mark-to-Market Valuation
          </div>
          <h1 className="font-serif text-3xl font-normal text-[#17191B] tracking-tight mt-1">
            Holdings & Position Analytics
          </h1>
        </div>
        <div className="text-right text-xs font-mono text-[#17191B]/60">
          Valuation Engine: <span className="text-[#17191B] font-semibold">Real-Time NAV</span> · Account:{' '}
          <span className="text-[#17191B] font-semibold">{account.accountId}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] border border-[#17191B]/15 p-5">
          <div className="text-[10px] font-mono uppercase text-[#17191B]/60 font-semibold tracking-wider">
            Invested Value
          </div>
          <div className="text-2xl font-mono font-bold text-[#17191B] mt-1">
            {formatCurrency(totalInvested)}
          </div>
          <div className="text-xs font-mono text-[#17191B]/60 mt-1.5 pt-1.5 border-t border-[#17191B]/10">
            Total NAV: <span className="text-[#17191B] font-bold">{formatCurrency(totalEquity)}</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#17191B]/15 p-5">
          <div className="text-[10px] font-mono uppercase text-[#17191B]/60 font-semibold tracking-wider">
            Total Cost Basis
          </div>
          <div className="text-2xl font-mono font-bold text-[#17191B] mt-1">
            {formatCurrency(totalCost)}
          </div>
          <div className="text-xs font-mono text-[#17191B]/60 mt-1.5 pt-1.5 border-t border-[#17191B]/10">
            Weighted Book Value
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#17191B]/15 p-5">
          <div className="text-[10px] font-mono uppercase text-[#17191B]/60 font-semibold tracking-wider">
            Unrealized Gain / Loss
          </div>
          <div
            className={`text-2xl font-mono font-bold mt-1 ${
              totalUnrealized >= 0 ? 'text-emerald-800' : 'text-rose-800'
            }`}
          >
            {totalUnrealized >= 0 ? '+' : ''}
            {formatCurrency(totalUnrealized)}
          </div>
          <div
            className={`text-xs font-mono font-semibold mt-1.5 pt-1.5 border-t border-[#17191B]/10 ${
              totalReturnPercent >= 0 ? 'text-emerald-800' : 'text-rose-800'
            }`}
          >
            {totalReturnPercent >= 0 ? '+' : ''}
            {totalReturnPercent.toFixed(2)}% Return
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#17191B]/15 p-5">
          <div className="text-[10px] font-mono uppercase text-[#17191B]/60 font-semibold tracking-wider">
            Realized Closed P&L
          </div>
          <div
            className={`text-2xl font-mono font-bold mt-1 ${
              account.realizedPnlMinor >= 0 ? 'text-emerald-800' : 'text-rose-800'
            }`}
          >
            {account.realizedPnlMinor >= 0 ? '+' : ''}
            {formatCurrency(account.realizedPnlMinor)}
          </div>
          <div className="text-xs font-mono text-[#17191B]/60 mt-1.5 pt-1.5 border-t border-[#17191B]/10">
            Net Accumulated P&L
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="bg-[#FFFFFF] border border-[#17191B]/15 p-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#17191B]/15 mb-4">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#9B8055]" />
            <h2 className="font-serif text-xl font-normal text-[#17191B]">
              Active Positions ({enrichedPositions.length})
            </h2>
          </div>
          <div className="text-xs font-mono text-[#17191B]/60">
            Broker Custody: Depository Trust Company (DTC)
          </div>
        </div>

        <div className="overflow-x-auto">
          {enrichedPositions.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#17191B]/60 space-y-3">
              <p className="font-serif text-lg text-[#17191B]">No active securities held in custody.</p>
              <p className="text-xs max-w-md mx-auto text-[#17191B]/60">
                Execute market or limit orders through the X-FUNDS institutional terminal to establish positions.
              </p>
              <button
                onClick={() => setActiveView('trade')}
                className="mt-2 px-5 py-2.5 bg-[#17191B] hover:bg-[#34383B] text-[#FFFFFF] font-mono text-xs uppercase tracking-widest transition-colors cursor-pointer"
              >
                Launch Execution Terminal
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[#17191B]/60 border-b border-[#17191B]/15 uppercase tracking-wider text-[10px] font-mono">
                  <th className="py-3 font-semibold">Instrument</th>
                  <th className="py-3 font-semibold text-right">Shares Held</th>
                  <th className="py-3 font-semibold text-right">Average Cost</th>
                  <th className="py-3 font-semibold text-right">Market Price</th>
                  <th className="py-3 font-semibold text-right">Market Value</th>
                  <th className="py-3 font-semibold text-right">Unrealized P&L</th>
                  <th className="py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#17191B]/10">
                {enrichedPositions.map(p => {
                  const isUp = p.unrealizedPnl >= 0;
                  return (
                    <tr key={p.symbol} className="hover:bg-[#F4F1EA]/50 transition-colors">
                      <td className="py-4">
                        <div className="font-mono font-bold text-[#17191B] text-sm">{p.symbol}</div>
                        <div className="text-[11px] text-[#17191B]/60">{p.inst?.name}</div>
                      </td>
                      <td className="py-4 text-right font-mono text-[#17191B]">
                        {p.qty}
                        {p.held > 0 && (
                          <span className="block text-[10px] text-amber-800">
                            ({p.held} in pending order)
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-right font-mono text-[#17191B]/70">
                        {formatCurrency(p.avgCost)}
                      </td>
                      <td className="py-4 text-right font-mono text-[#17191B] font-semibold">
                        {formatCurrency(p.currentPx)}
                      </td>
                      <td className="py-4 text-right font-mono font-bold text-[#17191B]">
                        {formatCurrency(p.totalValue)}
                      </td>
                      <td className="py-4 text-right font-mono">
                        <span className={`font-bold ${isUp ? 'text-emerald-800' : 'text-rose-800'}`}>
                          {isUp ? '+' : ''}
                          {formatCurrency(p.unrealizedPnl)}
                        </span>
                        <span
                          className={`block text-[10px] font-semibold ${
                            isUp ? 'text-emerald-800' : 'text-rose-800'
                          }`}
                        >
                          ({isUp ? '+' : ''}
                          {p.returnPercent.toFixed(2)}%)
                        </span>
                      </td>
                      <td className="py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleAction(p.symbol)}
                          className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-[#F4F1EA] hover:bg-[#17191B] hover:text-[#FFFFFF] text-[#17191B] border border-[#17191B]/15 transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          Trade <ArrowUpRight className="w-3 h-3" />
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
    </div>
  );
};
