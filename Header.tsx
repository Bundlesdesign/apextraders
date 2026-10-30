import React, { useState } from 'react';
import {
  Bell,
  ChevronDown,
  ShieldCheck,
  Wallet,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { formatCurrency } from '../services/marketData';

export const Header: React.FC = () => {
  const {
    user,
    account,
    notifications,
    markNotificationRead,
    activeView,
    setActiveView,
    logout,
    setKycModalOpen,
  } = useTrading();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  if (!user) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const navItems = user.isAdmin
    ? [
        { id: 'admin', label: 'Admin Console' },
        { id: 'dashboard', label: 'Client Preview' },
        { id: 'trade', label: 'Execution Terminal' },
        { id: 'support', label: 'Support', badge: unreadCount > 0 ? unreadCount : undefined },
      ]
    : [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'trade', label: 'Markets' },
        { id: 'portfolio', label: 'Portfolio' },
        { id: 'funding', label: 'Funding Desk' },
        { id: 'activity', label: 'Activity' },
        { id: 'watchlist', label: 'Watchlist' },
        { id: 'support', label: 'Support', badge: unreadCount > 0 ? unreadCount : undefined },
        { id: 'settings', label: 'Settings' },
      ];

  return (
    <header className="sticky top-0 z-40 bg-[#F4F1EA] border-b border-[#B7B1A6]/40 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Brand Logo & Desktop Nav */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => setActiveView(user.isAdmin ? 'admin' : 'dashboard')}
              className="flex items-center gap-3 text-left group focus:outline-none cursor-pointer"
            >
              <div className="w-9 h-9 rounded-none bg-[#17191B] text-[#F4F1EA] flex items-center justify-center font-editorial font-bold text-xl border border-[#34383B]">
                X
              </div>
              <div className="leading-tight">
                <div className="font-editorial text-2xl font-bold tracking-tight text-[#17191B] flex items-center gap-2">
                  X-FUNDS
                  {user.isAdmin && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 bg-[#17191B] text-[#F4F1EA] border border-[#34383B] font-bold">
                      ADMIN
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono tracking-widest text-[#34383B] uppercase">
                  INSTITUTIONAL CLEARING
                </div>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 font-interface">
              {navItems.map(item => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`relative px-3.5 py-2 text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#17191B] text-[#F4F1EA] font-bold'
                        : 'text-[#34383B] hover:text-[#17191B] hover:bg-[#B7B1A6]/10'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="ml-1.5 px-1 py-0.2 text-[9px] font-mono font-bold bg-[#9B8055] text-[#17191B]">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Section: Balance Snippet, Notifications, User Menu */}
          <div className="flex items-center gap-3">
            {/* Quick Available Cash Snippet */}
            {account && (
              <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-2 bg-[#FFFFFF] border border-[#B7B1A6]/40 text-xs font-mono">
                <span className="text-[#34383B] text-[10px] uppercase font-semibold flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-[#9B8055]" />
                  Cash:
                </span>
                <span className="text-[#17191B] font-bold">{formatCurrency(account.cash)}</span>
                {account.reserved > 0 && (
                  <span className="text-[#34383B] text-[10px] border-l border-[#B7B1A6]/40 pl-2">
                    Res: {formatCurrency(account.reserved)}
                  </span>
                )}
              </div>
            )}

            {/* Notifications Menu */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 bg-[#FFFFFF] border border-[#B7B1A6]/40 text-[#17191B] hover:bg-[#F4F1EA] transition-colors focus:outline-none cursor-pointer"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-[#9B8055]" />
                )}
              </button>

              {showNotifications && (
                <div
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#FFFFFF] border border-[#17191B] p-4 z-50 shadow-none space-y-3"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#B7B1A6]/30">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#17191B] font-bold">
                      Notifications ({unreadCount} unread)
                    </span>
                    <button
                      onClick={() => {
                        setActiveView('support');
                        setShowNotifications(false);
                      }}
                      className="text-xs text-[#9B8055] hover:underline font-mono cursor-pointer"
                    >
                      View All
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-[#B7B1A6]/20">
                    {notifications.length === 0 ? (
                      <p className="py-6 text-center text-xs text-[#34383B] font-mono">
                        No notifications dispatched.
                      </p>
                    ) : (
                      notifications.slice(0, 6).map(n => (
                        <div key={n.id} className={`py-2.5 ${!n.read ? 'bg-[#F4F1EA]/60 p-2' : ''}`}>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-[#17191B]">{n.title}</span>
                            {!n.read && (
                              <button
                                onClick={() => markNotificationRead(n.id)}
                                className="text-[10px] font-mono text-[#9B8055] hover:underline cursor-pointer"
                              >
                                Dismiss
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-[#34383B] mt-0.5 font-interface leading-relaxed">
                            {n.body}
                          </p>
                          <span className="text-[10px] text-[#B7B1A6] font-mono mt-1 block">
                            {new Date(n.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 bg-[#FFFFFF] border border-[#B7B1A6]/40 hover:bg-[#F4F1EA] transition-colors focus:outline-none cursor-pointer"
              >
                <div className="w-5 h-5 bg-[#17191B] text-[#F4F1EA] flex items-center justify-center font-editorial font-bold text-xs">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:block text-left font-interface">
                  <div className="text-xs font-semibold text-[#17191B] leading-none">
                    {user.displayName}
                  </div>
                  <div className="text-[10px] text-[#34383B] font-mono leading-none mt-1">
                    {user.accountId}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#34383B]" />
              </button>

              {showUserMenu && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-[#FFFFFF] border border-[#17191B] z-50 p-3 space-y-3 shadow-none"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="pb-2 border-b border-[#B7B1A6]/30">
                    <div className="font-editorial text-base font-bold text-[#17191B] leading-tight">
                      {user.displayName}
                    </div>
                    <div className="text-[#34383B] text-xs truncate font-mono">{user.email}</div>
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono">
                      <span className="px-1.5 py-0.5 bg-[#17191B] text-[#F4F1EA]">
                        {user.isAdmin ? 'ADMINISTRATOR' : 'CLIENT'}
                      </span>
                      <span className="text-[#34383B]">{user.accountId}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {!user.isAdmin && (
                      <>
                        <button
                          onClick={() => {
                            setKycModalOpen(true);
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-2 py-1.5 text-xs text-[#34383B] hover:bg-[#F4F1EA] flex items-center justify-between cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5 font-interface">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#9B8055]" />
                            Identity KYC
                          </span>
                          <span
                            className={`text-[9px] font-mono uppercase px-1.5 py-0.2 font-bold ${
                              user.kycStatus === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : user.kycStatus === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-[#17191B] text-[#F4F1EA]'
                            }`}
                          >
                            {user.kycStatus.replace('_', ' ')}
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveView('settings');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-2 py-1.5 text-xs text-[#34383B] hover:bg-[#F4F1EA] cursor-pointer font-interface"
                        >
                          Account Settings
                        </button>
                      </>
                    )}

                    {user.isAdmin && (
                      <button
                        onClick={() => {
                          setActiveView('admin');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-2 py-1.5 text-xs text-[#34383B] hover:bg-[#F4F1EA] cursor-pointer font-interface font-semibold"
                      >
                        Admin Desk
                      </button>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#B7B1A6]/30">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full px-2 py-1.5 text-xs text-rose-700 hover:bg-rose-50 flex items-center gap-1.5 font-semibold cursor-pointer transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Sign Out */}
            <button
              onClick={logout}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#34383B] hover:text-[#17191B] hover:bg-[#FFFFFF] border border-transparent hover:border-[#B7B1A6]/40 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto py-2.5 border-t border-[#B7B1A6]/30 scrollbar-none">
          {navItems.map(item => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-[#17191B] text-[#F4F1EA] font-bold'
                    : 'text-[#34383B] hover:text-[#17191B]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
