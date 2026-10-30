import React, { useState, useMemo } from 'react';
import { useTrading } from '../context/TradingContext';
import { formatCurrency } from '../services/marketData';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  Clock,
  Briefcase,
  FileText,
  Mail,
  ChevronRight,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  Signal,
  Calendar,
  Newspaper,
  BarChart3,
  Bell,
  LineChart,
  BookOpen,
  X,
  Plus,
  HelpCircle,
  Eye,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    user,
    account,
    positions,
    orders,
    journals,
    executions,
    fundingHistory,
    instruments,
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    setSelectedSymbol,
    setActiveView,
    cancelOrder,
    setKycModalOpen,
  } = useTrading();

  // Active Tab in Central Workspace
  const [workspaceTab, setWorkspaceTab] = useState<'open' | 'pending' | 'closed' | 'history'>('open');

  // Active Right Column Tab
  const [marketTab, setMarketTab] = useState<'overview' | 'watchlist'>('overview');

  // Copy Account ID Feedback
  const [copiedId, setCopiedId] = useState(false);

  // Data & Insights Modal State
  const [activeModal, setActiveModal] = useState<
    'signals' | 'calendar' | 'news' | 'insights' | 'alerts' | 'performance' | 'journal' | null
  >(null);

  // Price alert input in modal
  const [alertSymbol, setAlertSymbol] = useState('NVDA');
  const [alertTargetPrice, setAlertTargetPrice] = useState('');
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);

  // Journal note in modal
  const [journalNote, setJournalNote] = useState('');
  const [journalEntries, setJournalEntries] = useState<Array<{ id: string; text: string; date: string }>>([]);

  if (!account || !user) return null;

  const isKycApproved = user.kycStatus === 'approved';

  const mostTraded = useMemo(() => {
    const counts = new Map<string, number>();
    orders.forEach(o => counts.set(o.symbol, (counts.get(o.symbol) || 0) + 1));
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([symbol, count]) => {
        const inst = instruments.find(i => i.symbol === symbol);
        return inst ? { symbol, count, price: inst.currentPrice, pct: inst.changePercent } : null;
      })
      .filter((x): x is { symbol: string; count: number; price: number; pct: number } => x !== null);
  }, [orders, instruments]);

  const [marketOpen, setMarketOpen] = useState(false);

  // Format member since date
  const memberSinceFormatted = useMemo(() => {
    const d = new Date(user.createdAt || Date.now());
    const day = d.getDate();
    const suffix =
      day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
    const month = d.toLocaleDateString('en-US', { month: 'long' });
    const year = d.getFullYear();
    return `${month} ${day}${suffix} ${year}`;
  }, [user.createdAt]);

  // Compute portfolio valuation
  const portfolio = useMemo(() => {
    let investedValue = 0;
    let totalCostBasis = 0;
    let dailyChange = 0;

    const enrichedPositions = positions
      .filter(p => p.qty > 0)
      .map(p => {
        const inst = instruments.find(i => i.symbol === p.symbol);
        const currentPx = inst ? inst.currentPrice : 10000;
        const prevPx = inst ? inst.prevClose : currentPx;
        const positionValue = p.qty * currentPx;
        const unrealizedPnl = positionValue - p.costBasisMinor;
        const dayChange = p.qty * (currentPx - prevPx);

        investedValue += positionValue;
        totalCostBasis += p.costBasisMinor;
        dailyChange += dayChange;

        return {
          ...p,
          currentPx,
          positionValue,
          unrealizedPnl,
          dayChange,
          inst,
        };
      });

    const unrealizedPnl = investedValue - totalCostBasis;
    const totalEquity = account.cash + account.reserved + account.hold + investedValue;
    const percentAllocated = totalEquity > 0 ? ((investedValue / totalEquity) * 100).toFixed(1) : '100.0';

    return {
      investedValue,
      totalCostBasis,
      unrealizedPnl,
      dailyChange,
      totalEquity,
      percentAllocated,
      positions: enrichedPositions,
    };
  }, [account, instruments, positions]);

  const openOrders = useMemo(() => {
    return orders.filter(o => o.status === 'open' || o.status === 'partially_filled');
  }, [orders]);

  const closedExecutions = useMemo(() => {
    return [...executions].sort((a, b) => b.createdAt - a.createdAt).slice(0, 15);
  }, [executions]);

  const handleCopyAccountId = () => {
    navigator.clipboard.writeText(user.accountId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleAddJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalNote.trim()) return;
    const newEntry = {
      id: `jn-${Date.now()}`,
      text: journalNote.trim(),
      date: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    setJournalEntries(prev => [newEntry, ...prev]);
    setJournalNote('');
  };

  return (
    <div className="space-y-6 select-none font-interface">
      {/* =========================================================================
          TOP ROW: Alert Banner (Left), Account ID (Center), Balance Pill (Right)
          Matches structural arrangement of reference IMG_2491
         ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Top Left: Information & Verification Prompt Banner */}
        <div className="md:col-span-4">
          {!isKycApproved ? (
            <div className="bg-[#EBF3FC] border border-[#CBDFF7] p-3 text-xs text-[#1E3A8A] flex items-center justify-between gap-3 shadow-none">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] shrink-0" />
                <span>
                  We still require some information from you before you can begin trading.{' '}
                  <button
                    onClick={() => setKycModalOpen(true)}
                    className="font-semibold underline hover:text-[#172554] cursor-pointer"
                  >
                    Complete registration
                  </button>
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-[#FFFFFF] border border-[#B7B1A6]/50 p-3 text-xs text-[#17191B] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#9B8055] shrink-0" />
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#34383B]">
                  Custodial Account Active · Tier 1 Prime Cleared
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Top Center: Account ID with copy button and member tenure */}
        <div className="md:col-span-4 text-center">
          <div className="inline-flex items-center gap-2 text-sm font-mono font-semibold text-[#17191B]">
            <span>ID: {user.accountId}</span>
            <button
              onClick={handleCopyAccountId}
              className="p-1 text-[#34383B] hover:text-[#17191B] transition-colors cursor-pointer"
              title="Copy Account ID"
              aria-label="Copy Account ID"
            >
              {copiedId ? (
                <Check className="w-3.5 h-3.5 text-emerald-700" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <div className="text-[11px] font-mono text-[#34383B] mt-0.5">
            X-FUNDS member since {memberSinceFormatted}
          </div>
        </div>

        {/* Top Right: Total Balance & P&L percentage */}
        <div className="md:col-span-4 flex justify-start md:justify-end">
          <div className="bg-[#FFFFFF] border border-[#B7B1A6]/50 px-4 py-2 flex items-center gap-2 shadow-none">
            <span className="font-mono font-bold text-sm text-[#17191B]">
              {formatCurrency(portfolio.totalEquity)}
            </span>
            <span className="font-mono text-xs text-[#34383B]">
              ({portfolio.percentAllocated}%)
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MAIN 3-COLUMN RESPONSIVE LAYOUT
          Column 1 (Left): Most Traded (1 hr), Mobile promo, Quick Actions, Setup Trading prompt, Data & Insights
          Column 2 (Middle): Account Checklist, Tabs [Open | Pending | Closed | Balance History], Empty Vault Illustration / Tables
          Column 3 (Right): Market Overview / Watchlist with quotes
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =====================================================================
            LEFT COLUMN (lg:col-span-3)
           ===================================================================== */}
        <div className="lg:col-span-3 space-y-4 order-2 lg:order-1 min-w-0">
          {/* Card: Most-traded instruments */}
          <div className="bg-[#FFFFFF] border border-[#B7B1A6]/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#17191B] font-mono">
                Most-traded instruments
              </h2>
            </div>

            {mostTraded.length === 0 ? (
              <p className="text-[11px] text-[#34383B] border border-dashed border-[#B7B1A6] p-3 text-center">
                No orders placed yet. Instruments you trade will appear here.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {mostTraded.map(item => (
                  <button
                    type="button"
                    key={item.symbol}
                    className="text-left border border-[#B7B1A6]/40 p-2.5 bg-[#FAF8F5] hover:border-[#17191B] min-w-0"
                    onClick={() => {
                      setSelectedSymbol(item.symbol);
                      setActiveView('trade');
                    }}
                  >
                    <div className="text-[10px] font-mono uppercase font-bold text-[#34383B]">{item.symbol}</div>
                    <div className="font-mono font-bold text-sm text-[#17191B] mt-0.5 truncate">
                      {formatCurrency(item.price)}
                    </div>
                    <div className={`text-[10px] font-mono ${item.pct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {item.pct >= 0 ? '+' : ''}{item.pct.toFixed(2)}%
                    </div>
                    <div className="text-[9px] text-[#34383B] font-mono">{item.count} order{item.count === 1 ? '' : 's'}</div>
                  </button>
                ))}
              </div>
            )}
            <p className="text-[10px] font-mono text-[#34383B]">Simulated prices</p>
          </div>

          {/* Card: Mobile App Promo / Callout */}
          <div className="bg-[#FFFFFF] border border-[#B7B1A6]/50 p-4 text-center space-y-2">
            <div className="w-8 h-8 mx-auto bg-[#17191B] text-[#F4F1EA] flex items-center justify-center font-mono text-xs">
              <Smartphone className="w-4 h-4 text-[#9B8055]" />
            </div>
            <h3 className="text-xs font-bold text-[#17191B]">
              Have you downloaded our new mobile app yet?
            </h3>
            <p className="text-[11px] text-[#34383B] leading-relaxed">
              Everything a trader would expect & more! Real-time custodial streaming and multi-factor authorization.
            </p>
            <div className="pt-1">
              <span className="inline-block px-3 py-1 bg-[#17191B] text-[#F4F1EA] text-[10px] font-mono uppercase tracking-wider">
                iOS & Android Ready
              </span>
            </div>
          </div>

          {/* Quick Account Actions Row (Deposit, Withdraw, Transaction history, Payment history) */}
          <div className="bg-[#FFFFFF] border border-[#B7B1A6]/50 p-2.5">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#34383B] mb-2 px-1">
              Quick Account Actions
            </div>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
              <button
                onClick={() => setActiveView('funding')}
                className="px-2.5 py-2 bg-[#FAF8F5] hover:bg-[#17191B] hover:text-[#F4F1EA] text-[#17191B] border border-[#B7B1A6]/40 transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ArrowDownLeft className="w-3 h-3 text-[#9B8055]" />
                <span>Deposit</span>
              </button>
              <button
                onClick={() => setActiveView('funding')}
                className="px-2.5 py-2 bg-[#FAF8F5] hover:bg-[#17191B] hover:text-[#F4F1EA] text-[#17191B] border border-[#B7B1A6]/40 transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ArrowUpRight className="w-3 h-3 text-[#34383B]" />
                <span>Withdraw</span>
              </button>
              <button
                onClick={() => {
                  setWorkspaceTab('history');
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className="px-2.5 py-2 bg-[#FAF8F5] hover:bg-[#17191B] hover:text-[#F4F1EA] text-[#17191B] border border-[#B7B1A6]/40 transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5 text-[10px]"
              >
                <FileText className="w-3 h-3 text-[#34383B]" />
                <span>Ledger History</span>
              </button>
              <button
                onClick={() => setActiveView('activity')}
                className="px-2.5 py-2 bg-[#FAF8F5] hover:bg-[#17191B] hover:text-[#F4F1EA] text-[#17191B] border border-[#B7B1A6]/40 transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5 text-[10px]"
              >
                <Clock className="w-3 h-3 text-[#34383B]" />
                <span>Payment History</span>
              </button>
            </div>
          </div>

          {/* Account Setup Prompt with Trader Illustration */}
          <div className="bg-[#FFFFFF] border border-[#B7B1A6]/50 p-5 text-center space-y-3">
            {/* Minimal Vector Trading Monitor Illustration */}
            <div className="w-28 h-20 mx-auto flex items-center justify-center">
              <svg viewBox="0 0 160 120" className="w-full h-full text-[#17191B]" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Desk Base */}
                <rect x="20" y="86" width="120" height="4" fill="#34383B" />
                <rect x="35" y="90" width="6" height="26" fill="#34383B" />
                <rect x="119" y="90" width="6" height="26" fill="#34383B" />

                {/* Left Screen */}
                <rect x="24" y="38" width="34" height="26" rx="1" fill="#FFFFFF" stroke="#17191B" strokeWidth="2" />
                <line x1="28" y1="46" x2="54" y2="46" stroke="#9B8055" strokeWidth="1.5" />
                <line x1="28" y1="52" x2="48" y2="52" stroke="#B7B1A6" strokeWidth="1" />
                <rect x="38" y="64" width="6" height="8" fill="#17191B" />

                {/* Center Main Screen */}
                <rect x="62" y="26" width="36" height="30" rx="1" fill="#FFFFFF" stroke="#17191B" strokeWidth="2" />
                <polyline points="66,48 72,42 78,45 84,36 94,40" stroke="#10B981" strokeWidth="1.5" fill="none" />
                <rect x="77" y="56" width="6" height="12" fill="#17191B" />

                {/* Right Screen */}
                <rect x="102" y="38" width="34" height="26" rx="1" fill="#FFFFFF" stroke="#17191B" strokeWidth="2" />
                <line x1="106" y1="46" x2="132" y2="46" stroke="#EF4444" strokeWidth="1.5" />
                <line x1="106" y1="52" x2="126" y2="52" stroke="#B7B1A6" strokeWidth="1" />
                <rect x="116" y="64" width="6" height="8" fill="#17191B" />

                {/* Trader Figure Silhouetted */}
                <circle cx="80" cy="74" r="6" fill="#2563EB" />
                <path d="M72 86 C72 80 88 80 88 86" fill="#2563EB" />
              </svg>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-[#17191B]">
                {account.cash > 0 ? 'Trading Account Active' : "You haven't yet set up a trading account."}
              </h4>
              <p className="text-[11px] text-[#34383B] leading-relaxed">
                {account.cash > 0
                  ? 'Your account is verified and ready for paper trading.'
                  : 'You need to complete verification and obtain deposit instructions before you can make a deposit.'}
              </p>
            </div>

            <button
              onClick={() => {
                if (!isKycApproved) setKycModalOpen(true);
                else setActiveView('funding');
              }}
              className="w-full py-2 bg-[#17191B] hover:bg-[#34383B] text-[#F4F1EA] text-[11px] font-mono uppercase tracking-wider transition-colors cursor-pointer"
            >
              {!isKycApproved ? 'Complete Verification' : 'Open Deposit Desk'}
            </button>
          </div>

          {/* Section: Data & Insights Grid */}
          <div className="bg-[#FFFFFF] border border-[#B7B1A6]/50 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#B7B1A6]/30 pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#17191B] font-mono">
                Data & Insights
              </h3>
              <span className="text-[10px] font-mono text-[#9B8055]">PRO FEED</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              {/* Tile 1: Trade Signals */}
              <button
                onClick={() => setActiveModal('signals')}
                className="p-2.5 bg-[#FAF8F5] hover:bg-[#17191B] hover:text-[#F4F1EA] border border-[#B7B1A6]/40 transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer group"
              >
                <Signal className="w-4 h-4 text-[#9B8055] group-hover:text-[#F4F1EA]" />
                <span className="text-[10px] font-medium leading-tight">Trade Signals</span>
              </button>

              {/* Tile 2: Economic Calendar */}
              <button
                onClick={() => setActiveModal('calendar')}
                className="p-2.5 bg-[#FAF8F5] hover:bg-[#17191B] hover:text-[#F4F1EA] border border-[#B7B1A6]/40 transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer group"
              >
                <Calendar className="w-4 h-4 text-[#34383B] group-hover:text-[#F4F1EA]" />
                <span className="text-[10px] font-medium leading-tight">Economic calendar</span>
              </button>

              {/* Tile 3: News */}
              <button
                onClick={() => setActiveModal('news')}
                className="p-2.5 bg-[#FAF8F5] hover:bg-[#17191B] hover:text-[#F4F1EA] border border-[#B7B1A6]/40 transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer group"
              >
                <Newspaper className="w-4 h-4 text-[#34383B] group-hover:text-[#F4F1EA]" />
                <span className="text-[10px] font-medium leading-tight">News</span>
              </button>

              {/* Tile 4: Insights */}
              <button
                onClick={() => setActiveModal('insights')}
                className="p-2.5 bg-[#FAF8F5] hover:bg-[#17191B] hover:text-[#F4F1EA] border border-[#B7B1A6]/40 transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer group"
              >
                <BarChart3 className="w-4 h-4 text-[#34383B] group-hover:text-[#F4F1EA]" />
                <span className="text-[10px] font-medium leading-tight">Insights</span>
              </button>

              {/* Tile 5: Price Alerts */}
              <button
                onClick={() => setActiveModal('alerts')}
                className="p-2.5 bg-[#FAF8F5] hover:bg-[#17191B] hover:text-[#F4F1EA] border border-[#B7B1A6]/40 transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer group"
              >
                <Bell className="w-4 h-4 text-[#9B8055] group-hover:text-[#F4F1EA]" />
                <span className="text-[10px] font-medium leading-tight">Price alerts</span>
              </button>

              {/* Tile 6: Performance */}
              <button
                onClick={() => setActiveModal('performance')}
                className="p-2.5 bg-[#FAF8F5] hover:bg-[#17191B] hover:text-[#F4F1EA] border border-[#B7B1A6]/40 transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer group"
              >
                <LineChart className="w-4 h-4 text-[#34383B] group-hover:text-[#F4F1EA]" />
                <span className="text-[10px] font-medium leading-tight">Performance</span>
              </button>
            </div>

            {/* Tile 7: Journal */}
            <button
              onClick={() => setActiveModal('journal')}
              className="w-full p-2.5 bg-[#FAF8F5] hover:bg-[#17191B] hover:text-[#F4F1EA] border border-[#B7B1A6]/40 transition-colors flex items-center justify-center gap-2 cursor-pointer group"
            >
              <BookOpen className="w-4 h-4 text-[#9B8055] group-hover:text-[#F4F1EA]" />
              <span className="text-xs font-medium">Trading Journal ({journalEntries.length} entries)</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            MIDDLE COLUMN (lg:col-span-6)
           ===================================================================== */}
        <div className="lg:col-span-6 space-y-4 order-1 lg:order-2 min-w-0">
          {/* Account Setup Checklist Card */}
          <div className="bg-[#FFFFFF] border border-[#B7B1A6]/50 divide-y divide-[#B7B1A6]/30">
            {/* Checklist Item 1: Personal details */}
            <button
              onClick={() => setActiveView('settings')}
              className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-[#FAF8F5] transition-colors cursor-pointer group"
            >
              <span className="text-xs font-medium text-[#17191B]">Personal details</span>
              <ChevronRight className="w-4 h-4 text-[#34383B] group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Checklist Item 2: Set up trading account */}
            <button
              onClick={() => setActiveView('trade')}
              className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-[#FAF8F5] transition-colors cursor-pointer group"
            >
              <span className="text-xs font-medium text-[#17191B]">Set up trading account</span>
              <ChevronRight className="w-4 h-4 text-[#34383B] group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Checklist Item 3: Verification [Required / Verified] */}
            <button
              onClick={() => setKycModalOpen(true)}
              className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-[#FAF8F5] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-[#17191B]">Verification</span>
                {!isKycApproved ? (
                  <span className="px-2 py-0.5 border border-rose-300 text-rose-700 bg-rose-50 text-[10px] font-mono uppercase font-bold">
                    Required
                  </span>
                ) : (
                  <span className="px-2 py-0.5 border border-emerald-300 text-emerald-800 bg-emerald-50 text-[10px] font-mono uppercase font-bold">
                    Verified
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-[#34383B] group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Checklist Item 4: Security */}
            <button
              onClick={() => setActiveView('settings')}
              className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-[#FAF8F5] transition-colors cursor-pointer group"
            >
              <span className="text-xs font-medium text-[#17191B]">Security</span>
              <ChevronRight className="w-4 h-4 text-[#34383B] group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Checklist Item 5: General settings */}
            <button
              onClick={() => setActiveView('settings')}
              className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-[#FAF8F5] transition-colors cursor-pointer group"
            >
              <span className="text-xs font-medium text-[#17191B]">General settings</span>
              <ChevronRight className="w-4 h-4 text-[#34383B] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Central Workspace Tabbed Navigation */}
          <div className="flex items-center gap-1 border-b border-[#B7B1A6]/40 pb-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setWorkspaceTab('open')}
              className={`px-4 py-2 text-xs font-semibold tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                workspaceTab === 'open'
                  ? 'border border-[#17191B] bg-white text-[#17191B] shadow-none font-bold'
                  : 'text-[#34383B] hover:text-[#17191B]'
              }`}
            >
              Open Positions ({portfolio.positions.length})
            </button>
            <button
              onClick={() => setWorkspaceTab('pending')}
              className={`px-4 py-2 text-xs font-semibold tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                workspaceTab === 'pending'
                  ? 'border border-[#17191B] bg-white text-[#17191B] shadow-none font-bold'
                  : 'text-[#34383B] hover:text-[#17191B]'
              }`}
            >
              Pending ({openOrders.length})
            </button>
            <button
              onClick={() => setWorkspaceTab('closed')}
              className={`px-4 py-2 text-xs font-semibold tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                workspaceTab === 'closed'
                  ? 'border border-[#17191B] bg-white text-[#17191B] shadow-none font-bold'
                  : 'text-[#34383B] hover:text-[#17191B]'
              }`}
            >
              Closed ({closedExecutions.length})
            </button>
            <button
              onClick={() => setWorkspaceTab('history')}
              className={`px-4 py-2 text-xs font-semibold tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                workspaceTab === 'history'
                  ? 'border border-[#17191B] bg-white text-[#17191B] shadow-none font-bold'
                  : 'text-[#34383B] hover:text-[#17191B]'
              }`}
            >
              Balance history
            </button>
          </div>

          {/* Tab 1: Open Positions Workspace */}
          {workspaceTab === 'open' && (
            <div>
              {portfolio.positions.length === 0 ? (
                /* EXACT Stylized 3D Isometric Chest / Vault Illustration from Reference */
                <div className="bg-[#FFFFFF] border border-[#B7B1A6]/50 py-16 px-6 flex flex-col items-center justify-center text-center">
                  <div className="w-52 h-44 mb-6 relative flex items-center justify-center">
                    <svg
                      viewBox="0 0 240 200"
                      className="w-full h-full drop-shadow-sm"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* Subtle circular pedestal */}
                      <ellipse cx="120" cy="165" rx="75" ry="24" fill="#E8EEF5" />

                      {/* Chest Base - Front Left Face */}
                      <polygon
                        points="60,120 120,155 120,175 60,140"
                        fill="#2A3E59"
                        stroke="#1E293B"
                        strokeWidth="1.5"
                      />
                      {/* Horizontal ridges on Front Left */}
                      <line x1="60" y1="128" x2="120" y2="163" stroke="#1E293B" strokeWidth="1" />
                      <line x1="60" y1="134" x2="120" y2="169" stroke="#1E293B" strokeWidth="1" />

                      {/* Chest Base - Front Right Face */}
                      <polygon
                        points="120,155 180,120 180,140 120,175"
                        fill="#3B5373"
                        stroke="#1E293B"
                        strokeWidth="1.5"
                      />
                      {/* Horizontal ridges on Front Right */}
                      <line x1="120" y1="163" x2="180" y2="128" stroke="#1E293B" strokeWidth="1" />
                      <line x1="120" y1="169" x2="180" y2="134" stroke="#1E293B" strokeWidth="1" />

                      {/* Chest Rim / Inner Floor */}
                      <polygon
                        points="60,120 120,155 180,120 120,85"
                        fill="#1C2836"
                        stroke="#1E293B"
                        strokeWidth="1.5"
                      />

                      {/* Inner Chest Shadow / Depth */}
                      <polygon
                        points="68,118 120,148 172,118 120,92"
                        fill="#0F172A"
                      />

                      {/* Open Chest Lid (Tilted back-left in 3D isometric) */}
                      <polygon
                        points="50,65 110,30 145,55 85,90"
                        fill="#1E2D40"
                        stroke="#0F172A"
                        strokeWidth="1.5"
                      />
                      <polygon
                        points="85,90 145,55 145,70 85,105"
                        fill="#2A3E59"
                        stroke="#0F172A"
                        strokeWidth="1.5"
                      />
                      <polygon
                        points="50,65 85,90 85,105 50,80"
                        fill="#3B5373"
                        stroke="#0F172A"
                        strokeWidth="1.5"
                      />

                      {/* Metallic Rim Accent on Chest Opening */}
                      <polyline
                        points="60,120 120,155 180,120"
                        stroke="#9B8055"
                        strokeWidth="2.5"
                        fill="none"
                      />
                      {/* Metallic Corner Plates */}
                      <rect x="58" y="118" width="4" height="22" fill="#B79963" />
                      <rect x="118" y="153" width="4" height="22" fill="#B79963" />
                      <rect x="178" y="118" width="4" height="22" fill="#B79963" />
                    </svg>
                  </div>

                  <h3 className="text-base font-semibold text-[#17191B] mb-1">
                    You currently have no open positions.
                  </h3>
                  <p className="text-xs text-[#34383B] max-w-sm mb-6">
                    Open an order via the institutional execution terminal or browse current market quotes to deploy capital.
                  </p>

                  <button
                    onClick={() => setActiveView('trade')}
                    className="px-6 py-2.5 bg-[#17191B] hover:bg-[#34383B] text-[#F4F1EA] text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Open Execution Terminal
                  </button>
                </div>
              ) : (
                <div className="bg-[#FFFFFF] border border-[#B7B1A6]/50 overflow-x-auto">
                  <table className="w-full text-left text-xs font-interface">
                    <thead className="bg-[#FAF8F5] border-b border-[#B7B1A6]/40 text-[10px] font-mono uppercase text-[#34383B]">
                      <tr>
                        <th className="p-3">Symbol</th>
                        <th className="p-3">Quantity</th>
                        <th className="p-3">Cost Basis</th>
                        <th className="p-3">Current Px</th>
                        <th className="p-3">Value</th>
                        <th className="p-3">Unrealized P&L</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#B7B1A6]/20 font-mono">
                      {portfolio.positions.map(pos => {
                        const isProfit = pos.unrealizedPnl >= 0;
                        return (
                          <tr key={pos.symbol} className="hover:bg-[#FAF8F5]">
                            <td className="p-3">
                              <span className="font-bold text-[#17191B]">{pos.symbol}</span>
                              <div className="text-[10px] text-[#34383B] font-interface">
                                {pos.inst?.name || 'Equity'}
                              </div>
                            </td>
                            <td className="p-3 text-[#17191B]">{formatNumber(pos.qty)}</td>
                            <td className="p-3 text-[#34383B]">{formatCurrency(pos.costBasisMinor)}</td>
                            <td className="p-3 text-[#17191B]">{formatCurrency(pos.currentPx)}</td>
                            <td className="p-3 font-bold text-[#17191B]">
                              {formatCurrency(pos.positionValue)}
                            </td>
                            <td className={`p-3 font-bold ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {isProfit ? '+' : ''}
                              {formatCurrency(pos.unrealizedPnl)}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => {
                                  setSelectedSymbol(pos.symbol);
                                  setActiveView('trade');
                                }}
                                className="px-2.5 py-1 bg-[#17191B] text-[#F4F1EA] text-[10px] uppercase font-mono tracking-wider hover:bg-[#34383B] cursor-pointer"
                              >
                                Trade
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Pending Orders */}
          {workspaceTab === 'pending' && (
            <div className="bg-[#FFFFFF] border border-[#B7B1A6]/50 p-4">
              {openOrders.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#34383B]">
                  <p className="font-semibold text-[#17191B]">You currently have no pending orders.</p>
                  <p className="mt-1">Limit orders awaiting execution will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-interface">
                    <thead className="bg-[#FAF8F5] border-b border-[#B7B1A6]/40 text-[10px] font-mono uppercase text-[#34383B]">
                      <tr>
                        <th className="p-3">Order ID</th>
                        <th className="p-3">Symbol</th>
                        <th className="p-3">Side</th>
                        <th className="p-3">Qty</th>
                        <th className="p-3">Limit Price</th>
                        <th className="p-3">Reserved</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#B7B1A6]/20 font-mono">
                      {openOrders.map(ord => (
                        <tr key={ord.id} className="hover:bg-[#FAF8F5]">
                          <td className="p-3 text-[11px] text-[#34383B]">{ord.id}</td>
                          <td className="p-3 font-bold text-[#17191B]">{ord.symbol}</td>
                          <td className="p-3">
                            <span
                              className={`px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                ord.side === 'buy'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {ord.side}
                            </span>
                          </td>
                          <td className="p-3 text-[#17191B]">{formatNumber(ord.qty)}</td>
                          <td className="p-3 text-[#17191B]">
                            {ord.limitMinor ? formatCurrency(ord.limitMinor) : 'MKT'}
                          </td>
                          <td className="p-3 text-[#34383B]">{formatCurrency(ord.reservedMinor)}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => cancelOrder(ord.id)}
                              className="px-2 py-1 border border-rose-300 text-rose-700 bg-rose-50 text-[10px] uppercase font-mono tracking-wider hover:bg-rose-100 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Closed Trades */}
          {workspaceTab === 'closed' && (
            <div className="bg-[#FFFFFF] border border-[#B7B1A6]/50 p-4">
              {closedExecutions.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#34383B]">
                  <p className="font-semibold text-[#17191B]">No closed positions or filled trades recorded.</p>
                  <p className="mt-1">Completed fills will be archived here with exact timestamp executions.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-interface">
                    <thead className="bg-[#FAF8F5] border-b border-[#B7B1A6]/40 text-[10px] font-mono uppercase text-[#34383B]">
                      <tr>
                        <th className="p-3">Time</th>
                        <th className="p-3">Symbol</th>
                        <th className="p-3">Side</th>
                        <th className="p-3">Qty</th>
                        <th className="p-3">Fill Price</th>
                        <th className="p-3">Gross Total</th>
                        <th className="p-3 text-right">Realized P&L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#B7B1A6]/20 font-mono">
                      {closedExecutions.map(exec => {
                        const isProfit = exec.realizedPnlMinor >= 0;
                        return (
                          <tr key={exec.id} className="hover:bg-[#FAF8F5]">
                            <td className="p-3 text-[11px] text-[#34383B]">
                              {new Date(exec.createdAt).toLocaleTimeString()}
                            </td>
                            <td className="p-3 font-bold text-[#17191B]">{exec.symbol}</td>
                            <td className="p-3">
                              <span
                                className={`px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                  exec.side === 'buy'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {exec.side}
                              </span>
                            </td>
                            <td className="p-3 text-[#17191B]">{formatNumber(exec.qty)}</td>
                            <td className="p-3 text-[#17191B]">{formatCurrency(exec.priceMinor)}</td>
                            <td className="p-3 text-[#34383B]">{formatCurrency(exec.grossMinor)}</td>
                            <td className="p-3 text-right">
                              {exec.realizedPnlMinor !== 0 ? (
                                <span
                                  className={`font-bold ${
                                    isProfit ? 'text-emerald-700' : 'text-rose-700'
                                  }`}
                                >
                                  {isProfit ? '+' : ''}
                                  {formatCurrency(exec.realizedPnlMinor)}
                                </span>
                              ) : (
                                <span className="text-[#34383B]">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Balance History Ledger */}
          {workspaceTab === 'history' && (
            <div className="bg-[#FFFFFF] border border-[#B7B1A6]/50 p-4">
              <div className="text-[10px] font-mono text-[#34383B] uppercase mb-3 flex items-center justify-between">
                <span>Double-Entry Immutable Cash Ledger</span>
                <span>Available Cash: {formatCurrency(account.cash)}</span>
              </div>
              {journals.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#34383B]">
                  <p className="font-semibold text-[#17191B]">No ledger entries found.</p>
                  <p className="mt-1">All verified deposits, withdrawals, and fills post permanently here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-interface">
                    <thead className="bg-[#FAF8F5] border-b border-[#B7B1A6]/40 text-[10px] font-mono uppercase text-[#34383B]">
                      <tr>
                        <th className="p-3">Journal Ref</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Description</th>
                        <th className="p-3 text-right">Debit / Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#B7B1A6]/20 font-mono">
                      {journals.slice(0, 15).map(j => (
                        <tr key={j.id} className="hover:bg-[#FAF8F5]">
                          <td className="p-3 text-[11px] font-bold text-[#17191B]">{j.id}</td>
                          <td className="p-3 text-[11px] text-[#34383B]">
                            {new Date(j.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <span className="px-1.5 py-0.5 bg-[#FAF8F5] border border-[#B7B1A6]/40 text-[9px] uppercase font-bold text-[#17191B]">
                              {j.type}
                            </span>
                          </td>
                          <td className="p-3 text-[#34383B] font-interface text-[11px]">{j.memo}</td>
                          <td className="p-3 text-right font-bold text-[#17191B]">
                            {formatCurrency(j.totalMinor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* =====================================================================
            RIGHT COLUMN (lg:col-span-3)
           ===================================================================== */}
        <div className="lg:col-span-3 space-y-4 order-3 min-w-0">
          <button
            type="button"
            onClick={() => setMarketOpen(o => !o)}
            aria-expanded={marketOpen}
            className="lg:hidden w-full flex items-center justify-between border border-[#B7B1A6]/50 bg-white px-4 py-3 text-xs font-bold uppercase tracking-wider font-mono"
          >
            <span>Market overview and watchlist</span>
            <span>{marketOpen ? 'Hide' : 'Show'}</span>
          </button>
          <div className={`${marketOpen ? '' : 'hidden'} lg:block bg-[#FFFFFF] border border-[#B7B1A6]/50 p-4 space-y-3`}>
            {/* Header Tabs: Market Overview vs Watchlist */}
            <div className="flex items-center justify-between border-b border-[#B7B1A6]/40 pb-2">
              <button
                onClick={() => setMarketTab('overview')}
                className={`text-xs font-semibold uppercase tracking-wider font-mono cursor-pointer transition-colors ${
                  marketTab === 'overview'
                    ? 'text-[#17191B] border-b-2 border-[#17191B] pb-1'
                    : 'text-[#34383B] hover:text-[#17191B]'
                }`}
              >
                Market Overview
              </button>
              <button
                onClick={() => setMarketTab('watchlist')}
                className={`text-xs font-semibold uppercase tracking-wider font-mono cursor-pointer transition-colors ${
                  marketTab === 'watchlist'
                    ? 'text-[#17191B] border-b-2 border-[#17191B] pb-1'
                    : 'text-[#34383B] hover:text-[#17191B]'
                }`}
              >
                Watchlist ({watchlist.length})
              </button>
            </div>

            <p className="text-[10px] font-mono text-[#34383B]">Simulated prices, not live market data</p>
            {marketTab === 'watchlist' && watchlist.length === 0 && (
              <p className="text-[11px] text-[#34383B] border border-dashed border-[#B7B1A6] p-3 text-center">
                Your watchlist is empty. Add instruments from Markets.
              </p>
            )}
            {/* List of Quotes */}
            <div className="divide-y divide-[#B7B1A6]/20">
              {instruments
                .filter(i => (marketTab === 'watchlist' ? watchlist.includes(i.symbol) : true))
                .slice(0, 8)
                .map(inst => {
                  const isUp = inst.change >= 0;
                  return (
                    <div
                      key={inst.symbol}
                      onClick={() => {
                        setSelectedSymbol(inst.symbol);
                        setActiveView('trade');
                      }}
                      className="py-2.5 flex items-center justify-between hover:bg-[#FAF8F5] px-1 cursor-pointer transition-colors group"
                    >
                      <div>
                        <div className="font-mono font-bold text-xs text-[#17191B] group-hover:text-[#9B8055] transition-colors">
                          {inst.symbol}
                        </div>
                        <div className="text-[10px] text-[#34383B] truncate max-w-[130px]">
                          {inst.name}
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <div className="font-bold text-xs text-[#17191B]">
                          {formatCurrency(inst.currentPrice)}
                        </div>
                        <div
                          className={`text-[10px] font-semibold flex items-center justify-end gap-0.5 ${
                            isUp ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isUp ? (
                            <TrendingUp className="w-2.5 h-2.5 inline" />
                          ) : (
                            <TrendingDown className="w-2.5 h-2.5 inline" />
                          )}
                          <span>
                            {isUp ? '+' : ''}
                            {inst.changePercent.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Live Exchange Feed Status Footer */}
            <div className="pt-2 border-t border-[#B7B1A6]/30 flex items-center justify-between text-[10px] font-mono text-[#34383B]">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[#9B8055] rounded-full" />
                Simulated quotes
              </span>
              <span>Not live market data</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          DATA & INSIGHTS INTERACTIVE MODALS
         ========================================================================= */}

      {/* 1. Trade Signals Modal */}
      {activeModal === 'signals' && (
        <div className="fixed inset-0 z-50 bg-[#17191B]/60 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white border border-[#17191B] max-w-lg w-full max-h-[90dvh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#B7B1A6]/40 pb-3">
              <h3 className="font-editorial text-xl font-bold text-[#17191B]">Trade Statistics Feed</h3>
              <button onClick={() => setActiveModal(null)} aria-label="Close" className="p-1 text-[#34383B] hover:text-[#17191B]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="border border-dashed border-[#B7B1A6] p-6 text-center text-sm text-[#34383B] space-y-1">
              <p className="font-medium text-[#17191B]">No data source connected</p>
              <p>This section needs a licensed market-data provider. Nothing is shown until one is integrated, so no placeholder figures are displayed.</p>
            </div>
            <button onClick={() => setActiveModal(null)} className="w-full py-2 bg-[#17191B] text-[#F4F1EA] text-xs font-mono uppercase tracking-wider">Close</button>
          </div>
        </div>
      )}
      {/* 2. Economic Calendar Modal */}
      {activeModal === 'calendar' && (
        <div className="fixed inset-0 z-50 bg-[#17191B]/60 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white border border-[#17191B] max-w-lg w-full max-h-[90dvh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#B7B1A6]/40 pb-3">
              <h3 className="font-editorial text-xl font-bold text-[#17191B]">Economic Calendar</h3>
              <button onClick={() => setActiveModal(null)} aria-label="Close" className="p-1 text-[#34383B] hover:text-[#17191B]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="border border-dashed border-[#B7B1A6] p-6 text-center text-sm text-[#34383B] space-y-1">
              <p className="font-medium text-[#17191B]">No data source connected</p>
              <p>This section needs a licensed market-data provider. Nothing is shown until one is integrated, so no placeholder figures are displayed.</p>
            </div>
            <button onClick={() => setActiveModal(null)} className="w-full py-2 bg-[#17191B] text-[#F4F1EA] text-xs font-mono uppercase tracking-wider">Close</button>
          </div>
        </div>
      )}
      {/* 3. News Feed Modal */}
      {activeModal === 'news' && (
        <div className="fixed inset-0 z-50 bg-[#17191B]/60 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white border border-[#17191B] max-w-lg w-full max-h-[90dvh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#B7B1A6]/40 pb-3">
              <h3 className="font-editorial text-xl font-bold text-[#17191B]">Market News</h3>
              <button onClick={() => setActiveModal(null)} aria-label="Close" className="p-1 text-[#34383B] hover:text-[#17191B]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="border border-dashed border-[#B7B1A6] p-6 text-center text-sm text-[#34383B] space-y-1">
              <p className="font-medium text-[#17191B]">No data source connected</p>
              <p>This section needs a licensed market-data provider. Nothing is shown until one is integrated, so no placeholder figures are displayed.</p>
            </div>
            <button onClick={() => setActiveModal(null)} className="w-full py-2 bg-[#17191B] text-[#F4F1EA] text-xs font-mono uppercase tracking-wider">Close</button>
          </div>
        </div>
      )}
      {/* 4. Insights Modal */}
      {activeModal === 'insights' && (
        <div className="fixed inset-0 z-50 bg-[#17191B]/60 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white border border-[#17191B] max-w-lg w-full max-h-[90dvh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#B7B1A6]/40 pb-3">
              <h3 className="font-editorial text-xl font-bold text-[#17191B]">Market Insights</h3>
              <button onClick={() => setActiveModal(null)} aria-label="Close" className="p-1 text-[#34383B] hover:text-[#17191B]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="border border-dashed border-[#B7B1A6] p-6 text-center text-sm text-[#34383B] space-y-1">
              <p className="font-medium text-[#17191B]">No data source connected</p>
              <p>This section needs a licensed market-data provider. Nothing is shown until one is integrated, so no placeholder figures are displayed.</p>
            </div>
            <button onClick={() => setActiveModal(null)} className="w-full py-2 bg-[#17191B] text-[#F4F1EA] text-xs font-mono uppercase tracking-wider">Close</button>
          </div>
        </div>
      )}
      {/* 5. Price Alerts Modal */}
      {activeModal === 'alerts' && (
        <div className="fixed inset-0 z-50 bg-[#17191B]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#17191B] max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#B7B1A6]/40 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#9B8055]" />
                <h3 className="font-editorial text-xl font-bold text-[#17191B]">Price Alerts Management</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-[#34383B] hover:text-[#17191B] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {alertSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-mono">
                {alertSuccess}
              </div>
            )}

            <form
              onSubmit={e => {
                e.preventDefault();
                setAlertSuccess(`Alert armed for ${alertSymbol} at $${alertTargetPrice}`);
                setTimeout(() => setAlertSuccess(null), 3500);
              }}
              className="space-y-3 font-mono text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-[#34383B] mb-1">Symbol</label>
                  <select
                    value={alertSymbol}
                    onChange={e => setAlertSymbol(e.target.value)}
                    className="w-full p-2 bg-[#FAF8F5] border border-[#B7B1A6]/60 text-[#17191B]"
                  >
                    {instruments.map(i => (
                      <option key={i.symbol} value={i.symbol}>
                        {i.symbol} ({formatCurrency(i.currentPrice)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-[#34383B] mb-1">Target Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={alertTargetPrice}
                    onChange={e => setAlertTargetPrice(e.target.value)}
                    className="w-full p-2 bg-[#FAF8F5] border border-[#B7B1A6]/60 text-[#17191B]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-[#17191B] text-[#F4F1EA] text-xs font-mono uppercase tracking-wider cursor-pointer"
              >
                Arm Alert Trigger
              </button>
            </form>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2 border border-[#17191B] text-[#17191B] text-xs font-mono uppercase tracking-wider cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 6. Performance Analytics Modal */}
      {activeModal === 'performance' && (
        <div className="fixed inset-0 z-50 bg-[#17191B]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#17191B] max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#B7B1A6]/40 pb-3">
              <div className="flex items-center gap-2">
                <LineChart className="w-4 h-4 text-[#9B8055]" />
                <h3 className="font-editorial text-xl font-bold text-[#17191B]">Custodial Portfolio Performance</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-[#34383B] hover:text-[#17191B] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 border border-[#B7B1A6]/40 bg-[#FAF8F5]">
                <div className="text-[10px] uppercase text-[#34383B]">Total Net Equity</div>
                <div className="text-base font-bold text-[#17191B] mt-1">
                  {formatCurrency(portfolio.totalEquity)}
                </div>
              </div>

              <div className="p-3 border border-[#B7B1A6]/40 bg-[#FAF8F5]">
                <div className="text-[10px] uppercase text-[#34383B]">Realized P&L</div>
                <div className="text-base font-bold text-[#17191B] mt-1">
                  {formatCurrency(account.realizedPnlMinor)}
                </div>
              </div>

              <div className="p-3 border border-[#B7B1A6]/40 bg-[#FAF8F5]">
                <div className="text-[10px] uppercase text-[#34383B]">Active Positions Value</div>
                <div className="text-base font-bold text-[#17191B] mt-1">
                  {formatCurrency(portfolio.investedValue)}
                </div>
              </div>

              <div className="p-3 border border-[#B7B1A6]/40 bg-[#FAF8F5]">
                <div className="text-[10px] uppercase text-[#34383B]">Available Unencumbered Cash</div>
                <div className="text-base font-bold text-[#17191B] mt-1">
                  {formatCurrency(account.cash)}
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2 bg-[#17191B] text-[#F4F1EA] text-xs font-mono uppercase tracking-wider cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 7. Trading Journal Modal */}
      {activeModal === 'journal' && (
        <div className="fixed inset-0 z-50 bg-[#17191B]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#17191B] max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#B7B1A6]/40 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#9B8055]" />
                <h3 className="font-editorial text-xl font-bold text-[#17191B]">Trader Execution Journal</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-[#34383B] hover:text-[#17191B] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddJournal} className="space-y-2">
              <textarea
                value={journalNote}
                onChange={e => setJournalNote(e.target.value)}
                placeholder="Log macro observation, trade thesis, or risk parameter..."
                rows={3}
                className="w-full p-2.5 bg-[#FAF8F5] border border-[#B7B1A6]/60 text-xs font-interface text-[#17191B]"
              />
              <button
                type="submit"
                className="w-full py-2 bg-[#17191B] text-[#F4F1EA] text-xs font-mono uppercase tracking-wider cursor-pointer"
              >
                Append Journal Entry
              </button>
            </form>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {journalEntries.length === 0 && (
                <p className="text-[11px] text-[#34383B] border border-dashed border-[#B7B1A6] p-3 text-center">No journal entries yet.</p>
              )}
              {journalEntries.map(entry => (
                <div key={entry.id} className="p-2.5 border border-[#B7B1A6]/30 bg-[#FAF8F5] text-xs">
                  <div className="text-[10px] font-mono text-[#34383B]">{entry.date}</div>
                  <p className="text-[#17191B] mt-1 font-interface">{entry.text}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2 border border-[#17191B] text-[#17191B] text-xs font-mono uppercase tracking-wider cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
