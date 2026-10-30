import React from 'react';
import { TradingProvider, useTrading } from './context/TradingContext';
import { Header } from './components/Header';
import { MarketTicker } from './components/MarketTicker';
import { DashboardView } from './components/DashboardView';
import { TradeView } from './components/TradeView';
import { PortfolioView } from './components/PortfolioView';
import { FundingView } from './components/FundingView';
import { ActivityView } from './components/ActivityView';
import { WatchlistView } from './components/WatchlistView';
import { SupportView } from './components/SupportView';
import { SettingsView } from './components/SettingsView';
import { AdminConsole } from './components/AdminConsole';
import { AuthView } from './components/AuthView';
import { LandingView } from './components/LandingView';
import { KycModal } from './components/KycModal';
import { ShieldCheck, Loader2 } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { activeView, isAuthenticated, authLoading, user } = useTrading();

  // 1. Initial Authentication Check Loader
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F4F1EA] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 bg-[#17191B] text-[#F4F1EA] flex items-center justify-center font-editorial font-bold text-2xl border border-[#34383B] mb-4">
          X
        </div>
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#17191B]">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9B8055]" />
          <span>Verifying Cryptographic Session...</span>
        </div>
        <p className="text-[10px] text-[#34383B] mt-1 font-mono uppercase tracking-wider">
          X-FUNDS Institutional Clearing Custody
        </p>
      </div>
    );
  }

  // 2. Unauthenticated Gate: Render Luxury Institutional Landing Experience
  if (!isAuthenticated || !user) {
    return <LandingView />;
  }

  // 3. Role-Based Routing Security:
  // Non-admin users attempting to render 'admin' view are immediately routed to dashboard
  const renderActiveView = () => {
    if (activeView === 'admin') {
      if (!user.isAdmin) {
        return <DashboardView />;
      }
      return <AdminConsole />;
    }

    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'trade':
        return <TradeView />;
      case 'portfolio':
        return <PortfolioView />;
      case 'funding':
        return <FundingView />;
      case 'activity':
        return <ActivityView />;
      case 'watchlist':
        return <WatchlistView />;
      case 'support':
      case 'inbox':
        return <SupportView />;
      case 'settings':
        return <SettingsView />;
      case 'admin':
        return user.isAdmin ? <AdminConsole /> : <DashboardView />;
      default:
        return user.isAdmin ? <AdminConsole /> : <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#17191B] flex flex-col font-interface selection:bg-[#9B8055]/20 selection:text-[#17191B]">
      <Header />
      <MarketTicker />
      <div className="bg-[#F4F1EA] border-b border-[#B7B1A6]/50 text-[11px] font-mono text-[#34383B] px-4 py-1.5 text-center">
        Paper-trading environment. Prices are simulated, and this build stores account data in your browser rather than on a server.
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderActiveView()}
      </main>

      <KycModal />

      <footer className="bg-[#17191B] text-[#B7B1A6] border-t border-[#34383B] py-8 select-none mt-16 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-[#34383B] text-[#F4F1EA] flex items-center justify-center font-editorial font-bold text-sm border border-[#9B8055]/40">
              X
            </div>
            <span className="font-editorial text-base text-[#F4F1EA] font-semibold">
              X-FUNDS Clearing Corporation
            </span>
            <span className="text-[#34383B]">•</span>
            <span className="text-[11px] font-mono text-[#B7B1A6]">FIX 4.4 Financial Exchange Protocol</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono text-[#B7B1A6]">
            <span className="flex items-center gap-1.5 text-[#F4F1EA]">
              <span className="w-1.5 h-1.5 bg-[#9B8055]" />
              Live Custodial Session
            </span>
            <span className="text-[#34383B]">•</span>
            <span className="flex items-center gap-1 text-[#B7B1A6]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#9B8055]" />
              T+1 Double-Entry Ledger Clearing
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <TradingProvider>
      <MainLayout />
    </TradingProvider>
  );
}
