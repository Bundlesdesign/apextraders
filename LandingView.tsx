import React, { useState, useMemo } from 'react';
import { useTrading } from '../context/TradingContext';
import {
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Search,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  Loader2,
  Building2,
  X,
  Phone,
  FileText,
  Briefcase,
  Layers,
  ChevronRight,
  Globe,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency, formatNumber, INITIAL_INSTRUMENTS, priceAt } from '../services/marketData';

export const LandingView: React.FC = () => {
  const { login, register, sendPasswordReset, instruments } = useTrading();

  // Navigation & Modal states
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [isForgotMode, setIsForgotMode] = useState(false);

  // Informational modals
  const [infoModal, setInfoModal] = useState<'about' | 'opportunities' | 'support' | null>(null);

  // Market inventory filters
  const [marketFilter, setMarketFilter] = useState<'ALL' | 'STOCK' | 'ETF'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChartSymbol, setSelectedChartSymbol] = useState('NVDA');

  // Auth Form State
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Support inquiry state
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportInstitution, setSupportInstitution] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubmitted, setSupportSubmitted] = useState(false);

  const resetAuthFeedback = () => {
    setAuthError(null);
    setAuthSuccess(null);
  };

  const openAuthWithMode = (mode: 'login' | 'register') => {
    setAuthTab(mode);
    setIsForgotMode(false);
    resetAuthFeedback();
    setAuthModalOpen(true);
  };

  const mapFirebaseError = (err: any): string => {
    const code = err?.code || '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Invalid credentials. Please verify your email and institutional access password.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'An institutional account is already registered with this email address. Please sign in.';
    }
    if (code === 'auth/weak-password') {
      return 'Institutional passwords must contain at least 8 characters including letters and numerals.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Account temporarily throttled due to multiple attempts. Please try again shortly or reset your credentials.';
    }
    return err?.message || 'Authentication error. Please re-enter your credentials.';
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAuthFeedback();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthError('Please provide a valid institutional email address.');
      return;
    }
    if (!password) {
      setAuthError('Please enter your account password.');
      return;
    }

    try {
      setIsSubmitting(true);
      await login(cleanEmail, password);
      setAuthModalOpen(false);
    } catch (err: any) {
      setAuthError(mapFirebaseError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAuthFeedback();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = displayName.trim();

    if (!cleanName) {
      setAuthError('Please provide your full legal name or entity title.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthError('Please provide a valid institutional email address.');
      return;
    }
    if (password.length < 8) {
      setAuthError('Password must contain at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setAuthError('Password confirmation does not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      await register(cleanName, cleanEmail, password);
      setAuthModalOpen(false);
    } catch (err: any) {
      setAuthError(mapFirebaseError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAuthFeedback();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthError('Please enter the email associated with your institutional account.');
      return;
    }

    try {
      setIsSubmitting(true);
      await sendPasswordReset(cleanEmail);
      setAuthSuccess(`Password recovery instructions have been dispatched to ${cleanEmail}.`);
    } catch (err: any) {
      setAuthError(mapFirebaseError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInstruments = useMemo(() => {
    return instruments.filter(item => {
      const matchFilter = marketFilter === 'ALL' || item.type === marketFilter;
      const matchSearch =
        item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [instruments, marketFilter, searchQuery]);

  const activeInstrument = useMemo(() => {
    return instruments.find(i => i.symbol === selectedChartSymbol) || instruments[0] || INITIAL_INSTRUMENTS[0];
  }, [instruments, selectedChartSymbol]);

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#17191B] flex flex-col font-interface selection:bg-[#9B8055]/20 selection:text-[#17191B]">
      {/* 1. MINIMAL INSTITUTIONAL HEADER */}
      <header className="sticky top-0 z-30 bg-[#F4F1EA] border-b border-[#B7B1A6]/30 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Wordmark */}
            <div className="flex items-center gap-4">
              <a href="#" className="flex items-center gap-3 group focus:outline-none">
                <div className="w-9 h-9 rounded-none bg-[#17191B] text-[#F4F1EA] flex items-center justify-center font-editorial font-bold text-xl border border-[#34383B]">
                  X
                </div>
                <div className="flex flex-col">
                  <span className="font-editorial text-2xl font-bold tracking-tight text-[#17191B] leading-none">
                    X-FUNDS
                  </span>
                  <span className="text-[10px] font-mono tracking-widest text-[#34383B] uppercase mt-1">
                    EST. 2018 · PRIVATE WEALTH
                  </span>
                </div>
              </a>
            </div>

            {/* Editorial Nav items */}
            <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-wider font-medium text-[#34383B]">
              <a
                href="#markets"
                className="hover:text-[#17191B] transition-colors border-b border-transparent hover:border-[#9B8055] pb-0.5"
              >
                Markets
              </a>
              <button
                onClick={() => setInfoModal('opportunities')}
                className="hover:text-[#17191B] transition-colors border-b border-transparent hover:border-[#9B8055] pb-0.5 cursor-pointer"
              >
                Opportunities
              </button>
              <button
                onClick={() => setInfoModal('about')}
                className="hover:text-[#17191B] transition-colors border-b border-transparent hover:border-[#9B8055] pb-0.5 cursor-pointer"
              >
                About
              </button>
              <button
                onClick={() => setInfoModal('support')}
                className="hover:text-[#17191B] transition-colors border-b border-transparent hover:border-[#9B8055] pb-0.5 cursor-pointer"
              >
                Support
              </button>
            </nav>

            {/* Right CTAs */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => openAuthWithMode('login')}
                className="px-4 py-2 text-xs font-semibold tracking-wider uppercase text-[#17191B] hover:text-[#9B8055] transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => openAuthWithMode('register')}
                className="px-5 py-2.5 bg-[#17191B] hover:bg-[#34383B] text-[#F4F1EA] text-xs font-semibold tracking-wider uppercase border border-[#17191B] transition-colors cursor-pointer"
              >
                Open Account
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. EDITORIAL SPLIT-SCREEN HERO */}
      <section className="border-b border-[#B7B1A6]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-stretch">
            {/* Left Column: Authoritative Editorial Statement */}
            <div className="lg:col-span-6 flex flex-col justify-between pr-0 lg:pr-8 space-y-8">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 border-b border-[#9B8055] pb-1">
                  <span className="text-[11px] font-mono tracking-widest uppercase text-[#9B8055] font-semibold">
                    EST. 2018 · PRIVATE WEALTH & CAPITAL MARKETS
                  </span>
                </div>

                <h1 className="font-editorial text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.08] text-[#17191B] tracking-tight">
                  Private Capital Architecture for Global Institutions.
                </h1>

                <div className="w-16 h-px bg-[#B7B1A6]/60" />

                <p className="text-sm sm:text-base text-[#34383B] leading-relaxed max-w-xl font-normal">
                  X-FUNDS delivers a double-entry ledger, simulated multi-asset order execution, and verified funding workflows.
                  X-FUNDS currently operates as a paper-trading platform.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-6 pt-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <a
                    href="#markets"
                    className="inline-flex items-center justify-center px-6 py-3.5 bg-[#17191B] text-[#F4F1EA] text-xs font-semibold tracking-widest uppercase hover:bg-[#34383B] transition-colors border border-[#17191B]"
                  >
                    <span>Explore Markets</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-2 text-[#9B8055]" />
                  </a>

                  <button
                    onClick={() => openAuthWithMode('login')}
                    className="inline-flex items-center justify-center px-6 py-3.5 bg-transparent text-[#17191B] text-xs font-semibold tracking-widest uppercase border border-[#17191B] hover:bg-[#17191B]/5 transition-colors cursor-pointer"
                  >
                    <span>Client Portal</span>
                  </button>

                  <button
                    onClick={() => setInfoModal('support')}
                    className="inline-flex items-center justify-center px-4 py-3.5 text-xs text-[#34383B] hover:text-[#9B8055] tracking-wider uppercase font-medium cursor-pointer"
                  >
                    <span>Contact Support</span>
                  </button>
                </div>

                {/* Institutional Metrics Strip */}
                <div className="pt-6 border-t border-[#B7B1A6]/30 grid grid-cols-3 gap-4 text-left">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-[#34383B] tracking-wider">Settlement</div>
                    <div className="font-mono text-sm sm:text-base font-bold text-[#17191B] mt-0.5">T+1 Double-Entry</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase text-[#34383B] tracking-wider">Market Data</div>
                    <div className="font-mono text-sm sm:text-base font-bold text-[#17191B] mt-0.5">15-Min Delayed</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase text-[#34383B] tracking-wider">Protocol</div>
                    <div className="font-mono text-sm sm:text-base font-bold text-[#17191B] mt-0.5">FIX 4.4 Financial</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Full-Bleed Sharp-Edged Visual Market Display */}
            <div className="lg:col-span-6 flex flex-col">
              <div className="bg-[#17191B] border border-[#34383B] text-[#F4F1EA] p-6 flex flex-col justify-between h-full">
                {/* Visual Header */}
                <div className="flex items-start justify-between pb-4 border-b border-[#34383B]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-2 py-0.5 bg-[#34383B] text-[#F4F1EA] font-bold">
                        {activeInstrument.symbol}
                      </span>
                      <span className="text-xs text-[#B7B1A6] font-medium">{activeInstrument.name}</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-3">
                      <span className="font-mono text-3xl font-bold tracking-tight text-[#F4F1EA]">
                        {formatCurrency(activeInstrument.currentPrice)}
                      </span>
                      <span
                        className={`font-mono text-xs font-semibold ${
                          activeInstrument.change >= 0 ? 'text-[#9B8055]' : 'text-rose-400'
                        }`}
                      >
                        {activeInstrument.change >= 0 ? '+' : ''}
                        {formatCurrency(activeInstrument.change)} (
                        {activeInstrument.changePercent >= 0 ? '+' : ''}
                        {activeInstrument.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono tracking-widest text-[#B7B1A6] uppercase block">
                      EXCHANGE
                    </span>
                    <span className="font-mono text-xs text-[#F4F1EA]">{activeInstrument.exchange}</span>
                  </div>
                </div>

                {/* Simulated Institutional Market Depth & Chart Visual */}
                <div className="my-6 space-y-4">
                  <div className="h-44 w-full flex items-end gap-1.5 pt-6 pb-2 border-b border-[#34383B]/60">
                    {[42, 48, 45, 52, 59, 56, 62, 68, 65, 71, 78, 74, 82, 88, 85, 91, 95, 92, 98, 104, 102, 108, 114, 112].map(
                      (val, idx) => (
                        <div key={idx} className="flex-1 flex flex-col justify-end h-full group relative">
                          <div
                            style={{ height: `${val}%` }}
                            className={`w-full transition-all ${
                              idx >= 18
                                ? 'bg-[#9B8055]'
                                : idx % 2 === 0
                                ? 'bg-[#F4F1EA]/80'
                                : 'bg-[#34383B]'
                            }`}
                          />
                        </div>
                      )
                    )}
                  </div>

                  {/* Real Instrument Ticker Selectors */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {['NVDA', 'AAPL', 'MSFT', 'SPY', 'GLD', 'TSLA'].map(sym => (
                      <button
                        key={sym}
                        onClick={() => setSelectedChartSymbol(sym)}
                        className={`px-3 py-1 text-xs font-mono border transition-colors cursor-pointer ${
                          selectedChartSymbol === sym
                            ? 'bg-[#9B8055] text-[#17191B] border-[#9B8055] font-bold'
                            : 'bg-transparent text-[#B7B1A6] border-[#34383B] hover:text-[#F4F1EA] hover:border-[#B7B1A6]'
                        }`}
                      >
                        {sym} · {formatCurrency(priceAt(sym))}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Institutional Order Book Micro-Grid */}
                <div className="pt-4 border-t border-[#34383B] grid grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-[#B7B1A6] uppercase tracking-wider block mb-1">
                      BEST BID · VOLUME
                    </span>
                    <div className="flex justify-between text-[#F4F1EA]">
                      <span>{formatCurrency(activeInstrument.currentPrice - 8)}</span>
                      <span className="text-[#B7B1A6]">4,250 shs</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#B7B1A6] uppercase tracking-wider block mb-1">
                      BEST ASK · VOLUME
                    </span>
                    <div className="flex justify-between text-[#F4F1EA]">
                      <span>{formatCurrency(activeInstrument.currentPrice + 8)}</span>
                      <span className="text-[#B7B1A6]">3,800 shs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. INVENTORY & MARKET DISPLAY */}
      <section id="markets" className="py-16 bg-[#FFFFFF] border-b border-[#B7B1A6]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-[#17191B]">
            <div>
              <span className="text-[11px] font-mono tracking-widest text-[#9B8055] uppercase font-semibold">
                CURATED INVENTORY · ELECTRONIC EXECUTION
              </span>
              <h2 className="font-editorial text-3xl sm:text-4xl text-[#17191B] mt-1 font-normal">
                Multi-Asset Clearing Inventory
              </h2>
            </div>
            <p className="text-xs font-mono text-[#34383B] max-w-sm">
              All prices represent simulated market quotes with deterministic execution algorithms and 15-minute delayed
              composite feeds.
            </p>
          </div>

          {/* Table Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 py-4 border-b border-[#B7B1A6]/30">
            <div className="flex items-center gap-1">
              {(['ALL', 'STOCK', 'ETF'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setMarketFilter(tab)}
                  className={`px-4 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                    marketFilter === tab
                      ? 'bg-[#17191B] text-[#F4F1EA] font-bold'
                      : 'bg-transparent text-[#34383B] hover:text-[#17191B]'
                  }`}
                >
                  {tab === 'ALL' ? 'All Assets' : tab === 'STOCK' ? 'Equities' : 'ETFs'}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#34383B]" />
              <input
                type="text"
                placeholder="Search symbol or entity..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#F4F1EA] border border-[#B7B1A6]/50 pl-8 pr-3 py-1.5 text-xs font-interface text-[#17191B] placeholder:text-[#34383B]/60 focus:bg-white focus:outline-none focus:border-[#17191B]"
              />
            </div>
          </div>

          {/* Dense Editorial Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#17191B] text-[10px] font-mono uppercase tracking-wider text-[#34383B]">
                  <th className="py-3 px-4 font-semibold">Instrument</th>
                  <th className="py-3 px-4 font-semibold">Asset Class</th>
                  <th className="py-3 px-4 font-semibold text-right">Price (USD)</th>
                  <th className="py-3 px-4 font-semibold text-right">24H Net Change</th>
                  <th className="py-3 px-4 font-semibold text-right">Exchange</th>
                  <th className="py-3 px-4 font-semibold text-right">Volume</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#B7B1A6]/20 font-mono">
                {filteredInstruments.map((item, idx) => {
                  const isPositive = item.change >= 0;
                  return (
                    <tr
                      key={item.symbol}
                      className={`hover:bg-[#F4F1EA]/50 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-[#F4F1EA]/20'
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-[#17191B]">
                        <div className="flex items-center gap-2">
                          <span className="text-[#17191B] font-mono">{item.symbol}</span>
                          <span className="text-[11px] font-interface font-normal text-[#34383B] hidden md:inline">
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-interface text-xs text-[#34383B]">
                        <span className="px-1.5 py-0.5 border border-[#B7B1A6]/40 text-[10px] uppercase">
                          {item.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#17191B]">
                        {formatCurrency(item.currentPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold">
                        <span className={isPositive ? 'text-[#9B8055]' : 'text-rose-700'}>
                          {isPositive ? '+' : ''}
                          {formatCurrency(item.change)} ({item.changePercent.toFixed(2)}%)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-[#34383B]">{item.exchange}</td>
                      <td className="py-3.5 px-4 text-right text-[#34383B]">{item.volume}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedChartSymbol(item.symbol);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="px-2.5 py-1 text-[11px] uppercase tracking-wider border border-[#17191B] hover:bg-[#17191B] hover:text-[#F4F1EA] transition-colors cursor-pointer"
                        >
                          Analyze
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Honest Institutional Feed Notice */}
          <div className="mt-6 pt-4 border-t border-[#B7B1A6]/30 flex flex-col sm:flex-row items-center justify-between text-xs text-[#34383B] font-mono gap-2">
            <div>FIX 4.4 Financial Protocol · Delayed composite market pricing (15 min)</div>
            <div>Custodial execution requires accredited institutional verification</div>
          </div>
        </div>
      </section>

      {/* 4. EDITORIAL THREE-COLUMN INSTITUTIONAL PILLARS */}
      <section className="py-16 bg-[#F4F1EA] border-b border-[#B7B1A6]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="border border-[#B7B1A6]/40 p-8 bg-[#FFFFFF] space-y-4">
              <span className="font-editorial text-2xl text-[#9B8055]">I.</span>
              <h3 className="font-editorial text-2xl text-[#17191B]">Deterministic Clearing</h3>
              <p className="text-xs text-[#34383B] leading-relaxed">
                Every cash and security balance is backed by an immutable double-entry ledger. Accounts initialize at
                strictly $0.00 cash until authorized wire allocation is verified.
              </p>
            </div>

            <div className="border border-[#B7B1A6]/40 p-8 bg-[#FFFFFF] space-y-4">
              <span className="font-editorial text-2xl text-[#9B8055]">II.</span>
              <h3 className="font-editorial text-2xl text-[#17191B]">Official Customer Support</h3>
              <p className="text-xs text-[#34383B] leading-relaxed">
                Customers contact official support for approved deposit instructions, withdrawal questions and account help.
              </p>
            </div>

            <div className="border border-[#B7B1A6]/40 p-8 bg-[#FFFFFF] space-y-4">
              <span className="font-editorial text-2xl text-[#9B8055]">III.</span>
              <h3 className="font-editorial text-2xl text-[#17191B]">Tier-2 KYC Custody</h3>
              <p className="text-xs text-[#34383B] leading-relaxed">
                Stringent anti-money laundering and biometric compliance protocols protect all depository positions.
                Disbursements are protected by confidential one-time verification passkeys.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. MINIMAL INSTITUTIONAL FOOTER */}
      <footer className="bg-[#17191B] text-[#B7B1A6] py-12 select-none border-t border-[#34383B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-[#34383B]">
            <div className="space-y-1">
              <div className="font-editorial text-2xl text-[#F4F1EA] tracking-wide font-bold">
                X-FUNDS CLEARING CORPORATION
              </div>
              <div className="text-xs font-mono text-[#B7B1A6]">
                Institutional Clearing · Depository Custody · Securities Settlement
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs uppercase tracking-wider font-mono">
              <button
                onClick={() => setInfoModal('about')}
                className="hover:text-[#F4F1EA] transition-colors cursor-pointer"
              >
                Architecture
              </button>
              <span>·</span>
              <button
                onClick={() => setInfoModal('opportunities')}
                className="hover:text-[#F4F1EA] transition-colors cursor-pointer"
              >
                Prime Services
              </button>
              <span>·</span>
              <button
                onClick={() => setInfoModal('support')}
                className="hover:text-[#F4F1EA] transition-colors cursor-pointer"
              >
                Support
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#34383B]">
            <div>© 2018–2026 X-FUNDS Clearing Corporation. All Rights Reserved.</div>
            <div>256-Bit TLS · Double-Entry Ledger Verification Active</div>
          </div>
        </div>
      </footer>

      {/* 6. AUTHENTICATION MODAL */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17191B]/80 backdrop-grayscale-0">
          <div
            className="w-full max-w-md bg-[#FFFFFF] border border-[#17191B] p-8 space-y-6 shadow-none"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#B7B1A6]/30">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-[#9B8055] uppercase font-bold block">
                  X-FUNDS ACCESS PORTAL
                </span>
                <h3 className="font-editorial text-2xl text-[#17191B] mt-0.5">
                  {isForgotMode
                    ? 'Credential Recovery'
                    : authTab === 'login'
                    ? 'Client Authentication'
                    : 'Institutional Registration'}
                </h3>
              </div>
              <button
                onClick={() => setAuthModalOpen(false)}
                className="p-1 text-[#34383B] hover:text-[#17191B] cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher */}
            {!isForgotMode && (
              <div className="grid grid-cols-2 border border-[#B7B1A6]/40 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('login');
                    resetAuthFeedback();
                  }}
                  className={`py-2 text-center transition-colors cursor-pointer uppercase tracking-wider ${
                    authTab === 'login'
                      ? 'bg-[#17191B] text-[#F4F1EA] font-bold'
                      : 'bg-[#F4F1EA] text-[#34383B] hover:text-[#17191B]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('register');
                    resetAuthFeedback();
                  }}
                  className={`py-2 text-center transition-colors cursor-pointer uppercase tracking-wider ${
                    authTab === 'register'
                      ? 'bg-[#17191B] text-[#F4F1EA] font-bold'
                      : 'bg-[#F4F1EA] text-[#34383B] hover:text-[#17191B]'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}

            {/* Feedback Banners */}
            {authError && (
              <div className="p-3 bg-[#17191B] text-[#F4F1EA] border-l-2 border-rose-500 text-xs font-mono flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div className="p-3 bg-[#17191B] text-[#F4F1EA] border-l-2 border-[#9B8055] text-xs font-mono flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#9B8055] shrink-0 mt-0.5" />
                <span className="leading-relaxed">{authSuccess}</span>
              </div>
            )}

            {/* TAB 1: SIGN IN */}
            {!isForgotMode && authTab === 'login' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#34383B] tracking-wider mb-1">
                    Institutional Email Address
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full bg-[#F4F1EA] border border-[#B7B1A6]/50 px-3 py-2 text-xs font-mono text-[#17191B] focus:bg-white focus:outline-none focus:border-[#17191B]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-mono uppercase text-[#34383B] tracking-wider">
                      Account Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotMode(true);
                        resetAuthFeedback();
                      }}
                      className="text-[11px] text-[#9B8055] hover:underline cursor-pointer"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full bg-[#F4F1EA] border border-[#B7B1A6]/50 px-3 py-2 pr-9 text-xs font-mono text-[#17191B] focus:bg-white focus:outline-none focus:border-[#17191B]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-[#34383B] hover:text-[#17191B]"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#17191B] hover:bg-[#34383B] disabled:bg-[#34383B]/50 text-[#F4F1EA] text-xs font-semibold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#9B8055]" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Authenticate Session</span>
                  )}
                </button>
              </form>
            )}

            {/* TAB 2: REGISTER */}
            {!isForgotMode && authTab === 'register' && (
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#34383B] tracking-wider mb-1">
                    Full Legal Name / Entity Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Full Legal Name"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full bg-[#F4F1EA] border border-[#B7B1A6]/50 px-3 py-2 text-xs font-mono text-[#17191B] focus:bg-white focus:outline-none focus:border-[#17191B]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#34383B] tracking-wider mb-1">
                    Institutional Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="investor@institution.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full bg-[#F4F1EA] border border-[#B7B1A6]/50 px-3 py-2 text-xs font-mono text-[#17191B] focus:bg-white focus:outline-none focus:border-[#17191B]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#34383B] tracking-wider mb-1">
                    Password (Min. 8 characters)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full bg-[#F4F1EA] border border-[#B7B1A6]/50 px-3 py-2 pr-9 text-xs font-mono text-[#17191B] focus:bg-white focus:outline-none focus:border-[#17191B]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-[#34383B] hover:text-[#17191B]"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#34383B] tracking-wider mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full bg-[#F4F1EA] border border-[#B7B1A6]/50 px-3 py-2 pr-9 text-xs font-mono text-[#17191B] focus:bg-white focus:outline-none focus:border-[#17191B]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-2.5 text-[#34383B] hover:text-[#17191B]"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#9B8055] hover:bg-[#856d47] disabled:bg-[#9B8055]/50 text-[#F4F1EA] text-xs font-semibold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Registering Entity...</span>
                    </>
                  ) : (
                    <span>Create Institutional Account</span>
                  )}
                </button>
              </form>
            )}

            {/* TAB 3: FORGOT PASSWORD */}
            {isForgotMode && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#34383B] tracking-wider mb-1">
                    Registered Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full bg-[#F4F1EA] border border-[#B7B1A6]/50 px-3 py-2 text-xs font-mono text-[#17191B] focus:bg-white focus:outline-none focus:border-[#17191B]"
                  />
                  <p className="text-[11px] text-[#34383B] mt-1.5 font-mono">
                    A secure cryptographic reset authorization will be dispatched to this inbox.
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-[#17191B] hover:bg-[#34383B] disabled:bg-[#34383B]/50 text-[#F4F1EA] text-xs font-semibold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#9B8055]" />
                        <span>Dispatching...</span>
                      </>
                    ) : (
                      <span>Dispatch Reset Authorization</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(false);
                      resetAuthFeedback();
                    }}
                    className="w-full py-2 text-xs font-mono uppercase text-[#34383B] hover:text-[#17191B] text-center cursor-pointer"
                  >
                    Return to Sign In
                  </button>
                </div>
              </form>
            )}

            <div className="pt-4 border-t border-[#B7B1A6]/30 text-center">
              <span className="text-[11px] font-mono text-[#34383B]">
                New accounts initialize strictly at $0.00 cash balance.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 7. INFORMATIONAL MODALS (About, Opportunities, Support) */}
      {infoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17191B]/80">
          <div
            className="w-full max-w-2xl bg-[#FFFFFF] border border-[#17191B] p-8 space-y-6 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-4 border-b border-[#B7B1A6]/30">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-[#9B8055] uppercase font-bold block">
                  X-FUNDS INSTITUTIONAL DISCLOSURE
                </span>
                <h3 className="font-editorial text-3xl text-[#17191B] mt-0.5">
                  {infoModal === 'about'
                    ? 'About X-FUNDS Clearing Corporation'
                    : infoModal === 'opportunities'
                    ? 'Private Institutional Placements'
                    : 'Customer Support'}
                </h3>
              </div>
              <button
                onClick={() => setInfoModal(null)}
                className="p-1 text-[#34383B] hover:text-[#17191B] cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {infoModal === 'about' && (
              <div className="space-y-4 text-xs font-interface leading-relaxed text-[#34383B]">
                <p>
                  Founded in 2018, X-FUNDS Clearing Corporation provides institutional-grade electronic execution,
                  and double-entry ledger accounting.
                </p>
                <div className="p-4 bg-[#F4F1EA] border border-[#B7B1A6]/40 space-y-2">
                  <div className="font-editorial text-base text-[#17191B] font-bold">Custodial Guarantee</div>
                  <p className="text-[11px]">
                    Balances are recorded in double-entry accounting ledgers. Client
                    deposits are subject to verification: customers obtain approved instructions from official support,
                    and funds are credited only after administrator review.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 font-mono text-[11px]">
                  <div>
                    <span className="text-[#9B8055] block font-bold">CUSTODY MODEL</span>
                    <span>Direct Double-Entry Settlement</span>
                  </div>
                  <div>
                    <span className="text-[#9B8055] block font-bold">CLEARING PROTOCOL</span>
                    <span>FIX 4.4 Financial Exchange</span>
                  </div>
                </div>
              </div>
            )}

            {infoModal === 'opportunities' && (
              <div className="space-y-4 text-xs font-interface leading-relaxed text-[#34383B]">
                <p>
                  Accredited institutional participants gain priority allocation into proprietary liquidity pools,
                  underwritten secondary debt tranches, and cross-border currency clearing desks.
                </p>
                <div className="space-y-3">
                  <div className="p-4 border border-[#B7B1A6]/40">
                    <div className="font-editorial text-base text-[#17191B] font-bold">
                      Prime Liquidity Block Allocation
                    </div>
                    <div className="text-[11px] text-[#34383B] mt-1">
                      Direct FIX 4.4 algorithmic order routing with minimal market footprint and zero front-running.
                    </div>
                  </div>
                  <div className="p-4 border border-[#B7B1A6]/40">
                    <div className="font-editorial text-base text-[#17191B] font-bold">
                      Structured Fixed Income & Collateralized Notes
                    </div>
                    <div className="text-[11px] text-[#34383B] mt-1">
                      Bespoke yield instruments for multi-currency treasuries and endowment liquidity matching.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {infoModal === 'support' && (
              <div className="space-y-4 text-xs font-interface">
                {supportSubmitted ? (
                  <div className="p-6 bg-[#F4F1EA] border border-[#9B8055] text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-[#9B8055] mx-auto" />
                    <div className="font-editorial text-xl text-[#17191B]">Inquiry Dispatched to Senior Desk</div>
                    <p className="text-xs text-[#34383B]">
                      Official support will respond to your enquiry.
                    </p>
                    <button
                      onClick={() => {
                        setSupportSubmitted(false);
                        setInfoModal(null);
                      }}
                      className="mt-4 px-4 py-2 bg-[#17191B] text-[#F4F1EA] font-mono text-xs uppercase"
                    >
                      Close Window
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      setSupportSubmitted(true);
                    }}
                    className="space-y-3"
                  >
                    <p className="text-[#34383B]">
                      Contact X-FUNDS official support.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-[#34383B] mb-1">Your Name</label>
                        <input
                          type="text"
                          required
                          value={supportName}
                          onChange={e => setSupportName(e.target.value)}
                          placeholder="Legal Name"
                          className="w-full bg-[#F4F1EA] border border-[#B7B1A6]/50 px-3 py-1.5 text-xs text-[#17191B]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-[#34383B] mb-1">
                          Institutional Email
                        </label>
                        <input
                          type="email"
                          required
                          value={supportEmail}
                          onChange={e => setSupportEmail(e.target.value)}
                          placeholder="name@entity.com"
                          className="w-full bg-[#F4F1EA] border border-[#B7B1A6]/50 px-3 py-1.5 text-xs text-[#17191B]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#34383B] mb-1">Entity / Firm</label>
                      <input
                        type="text"
                        value={supportInstitution}
                        onChange={e => setSupportInstitution(e.target.value)}
                        placeholder="Family Office or Asset Manager"
                        className="w-full bg-[#F4F1EA] border border-[#B7B1A6]/50 px-3 py-1.5 text-xs text-[#17191B]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#34383B] mb-1">Inquiry Details</label>
                      <textarea
                        required
                        rows={3}
                        value={supportMessage}
                        onChange={e => setSupportMessage(e.target.value)}
                        placeholder="Inquire regarding depository settlement, wire coordination, or institutional onboarding..."
                        className="w-full bg-[#F4F1EA] border border-[#B7B1A6]/50 p-2.5 text-xs text-[#17191B]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#17191B] text-[#F4F1EA] text-xs font-mono uppercase tracking-widest hover:bg-[#34383B] transition-colors cursor-pointer"
                    >
                      Transmit Inquiry to Clearing Desk
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
