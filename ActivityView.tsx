import React, { useState, useMemo } from 'react';
import { useTrading } from '../context/TradingContext';
import { formatCurrency } from '../services/marketData';
import { A } from '../services/financialEngine';
import { FileSpreadsheet, Download } from 'lucide-react';

export const ActivityView: React.FC = () => {
  const { user, journals, orders } = useTrading();

  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ledger' | 'orders'>('ledger');

  // Generate month list
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toISOString().slice(0, 7);
    });
  }, []);

  // Filter journals
  const filteredJournals = useMemo(() => {
    return journals.filter(j => {
      if (!selectedMonth) return true;
      const jMonth = new Date(j.createdAt).toISOString().slice(0, 7);
      return jMonth === selectedMonth;
    });
  }, [journals, selectedMonth]);

  if (!user) return null;

  // Compute cash delta for a journal
  const getCashDelta = (lines: Array<{ acct: string; dr: number; cr: number }>) => {
    const cashLine = lines.filter(l => l.acct === A.cash(user.uid));
    return cashLine.reduce((sum, l) => sum + (l.cr - l.dr), 0);
  };

  // Export CSV Statement
  const handleExportCsv = () => {
    const rows = [
      ['Date', 'Time (UTC)', 'Journal ID', 'Type', 'Description', 'Reference', 'Cash Change (USD)'],
      ...filteredJournals.map(j => {
        const d = new Date(j.createdAt);
        const delta = getCashDelta(j.lines);
        return [
          d.toISOString().slice(0, 10),
          d.toISOString().slice(11, 19),
          j.id,
          j.type,
          j.memo,
          j.ref || '',
          (delta / 100).toFixed(2),
        ];
      }),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `xfunds-statement-${user.accountId}-${selectedMonth || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-[#17191B]/15">
        <div>
          <div className="text-[10px] uppercase font-mono tracking-widest text-[#9B8055] font-semibold">
            Institutional Accounting · GAAP Double-Entry
          </div>
          <h1 className="font-serif text-3xl font-normal text-[#17191B] tracking-tight mt-1">
            Activity & Regulatory Ledger
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-[#FFFFFF] border border-[#17191B]/15 px-3 py-2 text-xs font-mono text-[#17191B] focus:outline-none focus:border-[#17191B]"
          >
            <option value="">All Statement Periods</option>
            {months.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2 bg-[#17191B] hover:bg-[#34383B] text-[#FFFFFF] font-mono font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#9B8055]" />
            Statement (CSV)
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#17191B]/15 pb-2">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer border ${
            activeTab === 'ledger'
              ? 'bg-[#17191B] text-[#FFFFFF] border-[#17191B]'
              : 'bg-[#FFFFFF] text-[#17191B]/70 border-[#17191B]/15 hover:text-[#17191B]'
          }`}
        >
          General Ledger ({filteredJournals.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer border ${
            activeTab === 'orders'
              ? 'bg-[#17191B] text-[#FFFFFF] border-[#17191B]'
              : 'bg-[#FFFFFF] text-[#17191B]/70 border-[#17191B]/15 hover:text-[#17191B]'
          }`}
        >
          Order Audit Log ({orders.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-[#FFFFFF] border border-[#17191B]/15 p-6">
        {activeTab === 'ledger' ? (
          <div className="overflow-x-auto">
            {filteredJournals.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#17191B]/60 space-y-2">
                <p className="font-serif text-lg text-[#17191B]">No ledger postings for this statement period.</p>
                <p className="font-mono text-xs text-[#17191B]/50">
                  Transactions will automatically register here upon wire clearance or trade settlement.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[#17191B]/60 border-b border-[#17191B]/15 uppercase tracking-wider text-[10px] font-mono">
                    <th className="py-3 font-semibold">Timestamp (UTC)</th>
                    <th className="py-3 font-semibold">Classification & Description</th>
                    <th className="py-3 font-semibold">Reference</th>
                    <th className="py-3 font-semibold text-right">Debit / Credit Total</th>
                    <th className="py-3 font-semibold text-right">Cash Ledger Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#17191B]/10">
                  {filteredJournals.map(j => {
                    const delta = getCashDelta(j.lines);
                    const isPositive = delta > 0;

                    return (
                      <tr key={j.id} className="hover:bg-[#F4F1EA]/50 transition-colors">
                        <td className="py-3.5 font-mono text-[11px] text-[#17191B]/60 whitespace-nowrap">
                          {new Date(j.createdAt).toLocaleDateString()}{' '}
                          {new Date(j.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3.5">
                          <div className="font-sans font-medium text-[#17191B]">{j.memo}</div>
                          <div className="text-[10px] font-mono text-[#9B8055] uppercase mt-0.5">
                            Type: {j.type} · ID: {j.id.slice(0, 16)}...
                          </div>
                        </td>
                        <td className="py-3.5 font-mono text-[11px] text-[#17191B]/60">{j.ref || '—'}</td>
                        <td className="py-3.5 text-right font-mono text-[#17191B]/80 font-medium">
                          {formatCurrency(j.totalMinor)}
                        </td>
                        <td className="py-3.5 text-right font-mono font-bold">
                          {delta === 0 ? (
                            <span className="text-[#17191B]/40">—</span>
                          ) : (
                            <span className={isPositive ? 'text-emerald-800' : 'text-rose-800'}>
                              {isPositive ? '+' : ''}
                              {formatCurrency(delta)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {orders.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#17191B]/60 space-y-2">
                <p className="font-serif text-lg text-[#17191B]">No orders recorded in audit log.</p>
                <p className="font-mono text-xs text-[#17191B]/50">
                  All executed or submitted order tickets are cryptographically preserved here.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[#17191B]/60 border-b border-[#17191B]/15 uppercase tracking-wider text-[10px] font-mono">
                    <th className="py-3 font-semibold">Order ID</th>
                    <th className="py-3 font-semibold">Side / Symbol</th>
                    <th className="py-3 font-semibold">Type</th>
                    <th className="py-3 font-semibold text-right">Shares Filled</th>
                    <th className="py-3 font-semibold text-right">Average Execution</th>
                    <th className="py-3 font-semibold text-center">Status</th>
                    <th className="py-3 font-semibold text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#17191B]/10">
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-[#F4F1EA]/50 transition-colors">
                      <td className="py-3.5 font-mono text-[11px] text-[#17191B]/60">{o.id}</td>
                      <td className="py-3.5">
                        <span
                          className={`font-mono font-bold uppercase text-[10px] px-1.5 py-0.5 border mr-2 ${
                            o.side === 'buy'
                              ? 'bg-[#17191B] text-[#FFFFFF] border-[#17191B]'
                              : 'bg-rose-900 text-[#FFFFFF] border-rose-900'
                          }`}
                        >
                          {o.side}
                        </span>
                        <span className="font-mono font-bold text-[#17191B]">{o.symbol}</span>
                      </td>
                      <td className="py-3.5 uppercase text-[#17191B]/70 font-mono text-[11px]">{o.type}</td>
                      <td className="py-3.5 text-right font-mono text-[#17191B]">
                        {o.filledQty}/{o.qty}
                      </td>
                      <td className="py-3.5 text-right font-mono text-[#17191B] font-semibold">
                        {o.avgFillMinor ? formatCurrency(o.avgFillMinor) : '—'}
                      </td>
                      <td className="py-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono uppercase font-semibold border ${
                            o.status === 'filled'
                              ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
                              : o.status === 'open'
                              ? 'bg-amber-50 text-amber-950 border-amber-300'
                              : o.status === 'canceled'
                              ? 'bg-[#F4F1EA] text-[#17191B]/70 border-[#17191B]/20'
                              : 'bg-rose-50 text-rose-950 border-rose-300'
                          }`}
                        >
                          {o.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 text-right font-mono text-[11px] text-[#17191B]/60">
                        {new Date(o.createdAt).toLocaleDateString()} {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
