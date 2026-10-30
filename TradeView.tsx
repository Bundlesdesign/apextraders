import React, { useState, useMemo } from 'react';
import { useTrading } from '../context/TradingContext';
import { formatCurrency, generateOrderBook } from '../services/marketData';
import { fee } from '../services/financialEngine';
import { InteractiveChart } from './InteractiveChart';
import {
  TrendingUp,
  TrendingDown,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowUpDown,
  Sliders,
  Loader2,
  Building2,
  ShieldCheck,
} from 'lucide-react';

export const TradeView: React.FC = () => {
  const {
    account,
    positions,
    instruments,
    selectedSymbol,
    setSelectedSymbol,
    placeOrder,
  } = useTrading();

  const [searchQuery, setSearchQuery] = useState('');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [qtyStr, setQtyStr] = useState<string>('10');
  const [limitPriceStr, setLimitPriceStr] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; bad?: boolean } | null>(null);

  const currentInst = useMemo(() => {
    return instruments.find(i => i.symbol === selectedSymbol) || instruments[0];
  }, [instruments, selectedSymbol]);

  const heldPosition = useMemo(() => {
    return positions.find(p => p.symbol === currentInst.symbol);
  }, [positions, currentInst]);

  const sellableShares = heldPosition ? heldPosition.qty - heldPosition.held : 0;

  // Order calculations
  const qty = parseInt(qtyStr, 10) || 0;
  const currentPriceMinor = currentInst.currentPrice;
  const targetPriceMinor =
    orderType === 'limit' && limitPriceStr
      ? Math.round(parseFloat(limitPriceStr) * 100)
      : currentPriceMinor;

  const grossMinor = qty * targetPriceMinor;
  const commissionMinor = fee(grossMinor);
  const estimatedTotalMinor =
    side === 'buy' ? grossMinor + commissionMinor : grossMinor - commissionMinor;

  const availableCash = account ? account.cash : 0;
  const canAfford = side === 'buy' ? availableCash >= estimatedTotalMinor : sellableShares >= qty;

  const orderBook = useMemo(() => {
    return generateOrderBook(currentInst.symbol, 6);
  }, [currentInst.symbol, currentInst.currentPrice]);

  const filteredInstruments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return instruments;
    return instruments.filter(
      i => i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)
    );
  }, [instruments, searchQuery]);

  const handleReviewOrder = () => {
    if (qty <= 0) {
      setStatusMessage({ text: 'Please enter a valid whole quantity.', bad: true });
      return;
    }
    if (orderType === 'limit' && (!targetPriceMinor || targetPriceMinor <= 0)) {
      setStatusMessage({ text: 'Please enter a valid limit price.', bad: true });
      return;
    }
    if (!canAfford) {
      setStatusMessage({
        text: side === 'buy' ? 'Insufficient settled cash in account. Balance allocation required.' : 'Insufficient sellable shares held in portfolio.',
        bad: true,
      });
      return;
    }
    setStatusMessage(null);
    setShowConfirmModal(true);
  };

  const handleExecuteOrder = async () => {
    try {
      setIsSubmitting(true);
      await placeOrder({
        symbol: currentInst.symbol,
        side,
        type: orderType,
        qty,
        limitPrice: orderType === 'limit' ? limitPriceStr : undefined,
      });
      setShowConfirmModal(false);
      setStatusMessage({
        text: `Execution confirmed: ${side.toUpperCase()} ${qty} ${currentInst.symbol} settled into custody account.`,
      });
    } catch (e: any) {
      setStatusMessage({ text: e.message || 'Execution declined.', bad: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!account) return null;

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-4 border-b border-[#17191B]/15">
        <div>
          <div className="text-[10px] uppercase font-mono tracking-widest text-[#9B8055] font-semibold">
            Institutional Order Router · Real-Time Market Access
          </div>
          <h1 className="font-serif text-3xl font-normal text-[#17191B] tracking-tight mt-1">
            Execution Terminal
          </h1>
        </div>
        <div className="text-right text-xs font-mono text-[#17191B]/60">
          Settlement: <span className="text-[#17191B] font-semibold">T+1 DvP</span> · Custody Account:{' '}
          <span className="text-[#17191B] font-semibold">{account.accountId}</span>
        </div>
      </div>

      {/* Top Trading Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Search & Symbol List */}
        <div className="bg-[#FFFFFF] border border-[#17191B]/15 p-4 lg:col-span-1 flex flex-col h-[680px]">
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#17191B]/40" />
            <input
              type="text"
              placeholder="Search ticker or title..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#F4F1EA]/60 border border-[#17191B]/15 pl-8 pr-3 py-2 text-xs font-mono text-[#17191B] placeholder:text-[#17191B]/40 focus:bg-white focus:outline-none focus:border-[#17191B] transition-colors"
            />
          </div>

          <div className="overflow-y-auto divide-y divide-[#17191B]/10 flex-1 pr-1">
            {filteredInstruments.map(inst => {
              const isSelected = inst.symbol === currentInst.symbol;
              const isUp = inst.change >= 0;
              return (
                <button
                  key={inst.symbol}
                  onClick={() => {
                    setSelectedSymbol(inst.symbol);
                    if (orderType === 'limit') {
                      setLimitPriceStr((inst.currentPrice / 100).toFixed(2));
                    }
                  }}
                  className={`w-full py-2.5 px-3 flex items-center justify-between text-left transition-colors cursor-pointer ${
                    isSelected ? 'bg-[#17191B] text-[#FFFFFF]' : 'hover:bg-[#F4F1EA]/60 text-[#17191B]'
                  }`}
                >
                  <div>
                    <div className="font-mono font-bold text-xs">{inst.symbol}</div>
                    <div className={`text-[11px] truncate max-w-[120px] ${isSelected ? 'text-[#B7B1A6]' : 'text-[#17191B]/60'}`}>
                      {inst.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs font-semibold">
                      {formatCurrency(inst.currentPrice)}
                    </div>
                    <div
                      className={`text-[10px] font-mono font-semibold ${
                        isSelected
                          ? isUp ? 'text-emerald-300' : 'text-rose-300'
                          : isUp ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {isUp ? '+' : ''}
                      {inst.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Chart & Order Book */}
        <div className="lg:col-span-2 space-y-4">
          {/* Symbol Header Banner */}
          <div className="bg-[#FFFFFF] border border-[#17191B]/15 p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2.5">
                <h1 className="font-serif text-3xl font-normal text-[#17191B] tracking-tight">{currentInst.symbol}</h1>
                <span className="text-xs text-[#17191B]/70 font-medium">{currentInst.name}</span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono bg-[#F4F1EA] text-[#17191B] border border-[#17191B]/15 font-semibold">
                  {currentInst.exchange}
                </span>
              </div>
              <div className="text-xs font-mono text-[#17191B]/60 mt-1">
                Volume: <span className="text-[#17191B] font-semibold">{currentInst.volume}</span> · MktCap:{' '}
                <span className="text-[#17191B] font-semibold">{currentInst.marketCap}</span> · Class: Equity
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-mono font-bold text-[#17191B]">
                {formatCurrency(currentInst.currentPrice)}
              </div>
              <div
                className={`text-xs font-mono font-semibold flex items-center justify-end gap-1 ${
                  currentInst.change >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {currentInst.change >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {currentInst.change >= 0 ? '+' : ''}
                {formatCurrency(currentInst.change)} ({currentInst.changePercent.toFixed(2)}%)
              </div>
            </div>
          </div>

          {/* Interactive Chart */}
          <InteractiveChart symbol={currentInst.symbol} />

          {/* Order Book / Market Depth */}
          <div className="bg-[#FFFFFF] border border-[#17191B]/15 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#17191B]/15 mb-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#17191B] flex items-center gap-2">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#9B8055]" />
                Electronic Order Book Depth
              </h3>
              <span className="text-[10px] font-mono text-[#17191B]/60">Matching Engine: Active</span>
            </div>
            <div className="grid grid-cols-2 gap-8 text-xs font-mono">
              {/* Bids */}
              <div>
                <div className="flex justify-between text-[10px] uppercase font-mono text-[#17191B]/50 pb-1.5 border-b border-[#17191B]/10 font-semibold">
                  <span>Bid Qty</span>
                  <span>Bid Price</span>
                </div>
                <div className="space-y-1 mt-2">
                  {orderBook.bids.map((b, i) => (
                    <div key={i} className="flex justify-between text-emerald-800">
                      <span>{b.qty}</span>
                      <span className="font-semibold">{formatCurrency(b.price)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Asks */}
              <div>
                <div className="flex justify-between text-[10px] uppercase font-mono text-[#17191B]/50 pb-1.5 border-b border-[#17191B]/10 font-semibold">
                  <span>Ask Price</span>
                  <span>Ask Qty</span>
                </div>
                <div className="space-y-1 mt-2">
                  {orderBook.asks.map((a, i) => (
                    <div key={i} className="flex justify-between text-rose-800">
                      <span className="font-semibold">{formatCurrency(a.price)}</span>
                      <span>{a.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Order Execution Ticket */}
        <div className="bg-[#FFFFFF] border border-[#17191B]/15 p-5 lg:col-span-1 space-y-4">
          <div className="pb-3 border-b border-[#17191B]/15">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#17191B] flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-[#9B8055]" />
              Order Ticket
            </h2>
            <div className="text-[10px] font-mono text-[#17191B]/60 mt-0.5">Direct DMA Broker Routing</div>
          </div>

          {/* Side Toggle: Buy vs Sell */}
          <div className="grid grid-cols-2 gap-1 bg-[#F4F1EA] p-1 border border-[#17191B]/15 font-mono font-bold text-xs">
            <button
              onClick={() => setSide('buy')}
              className={`py-2 transition-colors cursor-pointer ${
                side === 'buy' ? 'bg-[#17191B] text-[#FFFFFF]' : 'text-[#17191B]/70 hover:text-[#17191B]'
              }`}
            >
              BUY / LONG
            </button>
            <button
              onClick={() => setSide('sell')}
              className={`py-2 transition-colors cursor-pointer ${
                side === 'sell' ? 'bg-rose-900 text-[#FFFFFF]' : 'text-[#17191B]/70 hover:text-[#17191B]'
              }`}
            >
              SELL / SHORT
            </button>
          </div>

          {/* Order Type: Market vs Limit */}
          <div>
            <label className="block text-[10px] uppercase font-mono font-bold text-[#17191B]/70 tracking-wider mb-1">
              Order Type
            </label>
            <div className="grid grid-cols-2 gap-1 bg-[#F4F1EA] p-1 border border-[#17191B]/15 font-mono text-xs">
              <button
                onClick={() => setOrderType('market')}
                className={`py-1.5 transition-colors cursor-pointer ${
                  orderType === 'market' ? 'bg-[#FFFFFF] text-[#17191B] font-bold border border-[#17191B]/15' : 'text-[#17191B]/60'
                }`}
              >
                Market Order
              </button>
              <button
                onClick={() => {
                  setOrderType('limit');
                  if (!limitPriceStr) setLimitPriceStr((currentInst.currentPrice / 100).toFixed(2));
                }}
                className={`py-1.5 transition-colors cursor-pointer ${
                  orderType === 'limit' ? 'bg-[#FFFFFF] text-[#17191B] font-bold border border-[#17191B]/15' : 'text-[#17191B]/60'
                }`}
              >
                Limit Order
              </button>
            </div>
          </div>

          {/* Limit Price Input if limit order */}
          {orderType === 'limit' && (
            <div>
              <label className="block text-[10px] uppercase font-mono font-bold text-[#17191B]/70 tracking-wider mb-1">
                Limit Price (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-[#17191B]/40 font-mono text-xs">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={limitPriceStr}
                  onChange={e => setLimitPriceStr(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#17191B]/15 pl-7 pr-3 py-2 text-xs font-mono text-[#17191B] focus:border-[#17191B] focus:outline-none transition-colors"
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          {/* Quantity Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] uppercase font-mono font-bold text-[#17191B]/70 tracking-wider">
                Quantity (Shares)
              </label>
              <span className="text-[10px] text-[#17191B]/60 font-mono">
                {side === 'buy'
                  ? `Max Afford: ${Math.floor(availableCash / currentPriceMinor)}`
                  : `Held: ${heldPosition?.qty || 0} (${sellableShares} free)`}
              </span>
            </div>
            <input
              type="number"
              min="1"
              step="1"
              value={qtyStr}
              onChange={e => setQtyStr(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#17191B]/15 px-3 py-2 text-xs font-mono text-[#17191B] focus:border-[#17191B] focus:outline-none transition-colors"
              placeholder="10"
            />
            {/* Quick share buttons */}
            <div className="grid grid-cols-4 gap-1 mt-1.5 font-mono text-[11px]">
              {[1, 5, 25, 50].map(n => (
                <button
                  key={n}
                  onClick={() => setQtyStr(n.toString())}
                  className="py-1 bg-[#F4F1EA] hover:bg-[#17191B] hover:text-[#FFFFFF] text-[#17191B] border border-[#17191B]/15 transition-colors cursor-pointer"
                >
                  +{n}
                </button>
              ))}
            </div>
          </div>

          {/* Calculations Summary Card */}
          <div className="bg-[#F4F1EA] border border-[#17191B]/15 p-3.5 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-[#17191B]/70">
              <span>Gross Notional:</span>
              <span className="text-[#17191B] font-semibold">{formatCurrency(grossMinor)}</span>
            </div>
            <div className="flex justify-between text-[#17191B]/70">
              <span>Commission (0.10%):</span>
              <span className="text-[#17191B] font-semibold">{formatCurrency(commissionMinor)}</span>
            </div>
            <div className="flex justify-between font-bold pt-2 border-t border-[#17191B]/15 text-[#17191B]">
              <span>Estimated Settlement:</span>
              <span className={side === 'buy' ? 'text-[#17191B] font-bold' : 'text-rose-900 font-bold'}>
                {formatCurrency(estimatedTotalMinor)}
              </span>
            </div>
            <div className="text-[10px] text-[#17191B]/60 pt-1 border-t border-[#17191B]/10">
              Available Cash: <span className="text-[#17191B] font-semibold">{formatCurrency(availableCash)}</span>
            </div>
          </div>

          {statusMessage && (
            <div
              className={`p-3 text-xs flex items-start gap-2 border ${
                statusMessage.bad
                  ? 'bg-rose-50 text-rose-900 border-rose-200'
                  : 'bg-emerald-50 text-emerald-950 border-emerald-200'
              }`}
            >
              {statusMessage.bad ? (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-700" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
              )}
              <span className="font-mono text-[11px] leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          <button
            onClick={handleReviewOrder}
            disabled={qty <= 0 || !canAfford}
            className={`w-full py-3 text-xs uppercase font-mono font-bold tracking-widest transition-colors cursor-pointer ${
              qty > 0 && canAfford
                ? side === 'buy'
                  ? 'bg-[#17191B] text-[#FFFFFF] hover:bg-[#34383B]'
                  : 'bg-rose-900 text-[#FFFFFF] hover:bg-rose-950'
                : 'bg-[#B7B1A6]/30 text-[#17191B]/40 cursor-not-allowed border border-[#17191B]/15'
            }`}
          >
            Review & Transmit Order
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-[#17191B]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#17191B] max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#17191B]/15">
              <Building2 className="w-4 h-4 text-[#9B8055]" />
              <h3 className="font-serif text-xl font-normal text-[#17191B]">Confirm Institutional Execution</h3>
            </div>

            <p className="text-xs text-[#17191B]/70 leading-relaxed font-sans">
              You are about to submit an institutional execution order for clearing through X-FUNDS execution desk.
            </p>

            <div className="bg-[#F4F1EA] border border-[#17191B]/15 p-4 space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[#17191B]/60">Symbol:</span>
                <span className="font-bold text-[#17191B]">{currentInst.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#17191B]/60">Action:</span>
                <span className={`font-bold uppercase ${side === 'buy' ? 'text-emerald-800' : 'text-rose-800'}`}>
                  {side}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#17191B]/60">Order Type:</span>
                <span className="font-bold uppercase text-[#17191B]">{orderType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#17191B]/60">Quantity:</span>
                <span className="font-bold text-[#17191B]">{qty} Units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#17191B]/60">Execution Price:</span>
                <span className="font-bold text-[#17191B]">{formatCurrency(targetPriceMinor)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#17191B]/15 font-bold">
                <span>Total Consideration:</span>
                <span className="text-[#17191B]">{formatCurrency(estimatedTotalMinor)}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="flex-1 py-2.5 border border-[#17191B]/20 font-mono text-xs uppercase tracking-wider text-[#17191B] hover:bg-[#F4F1EA] cursor-pointer"
              >
                Abort
              </button>
              <button
                onClick={handleExecuteOrder}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-[#17191B] font-mono text-xs uppercase tracking-widest text-[#FFFFFF] hover:bg-[#34383B] flex items-center justify-center gap-2 cursor-pointer font-bold"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-[#9B8055]" />}
                Authorize & Transmit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
