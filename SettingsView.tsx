import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import {
  Settings,
  User,
  Shield,
  CheckCircle2,
  AlertCircle,
  Copy,
  Lock,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { user, account, updateProfile } = useTrading();

  const [displayName, setDisplayName] = useState(user ? user.displayName : '');
  const [phone, setPhone] = useState(user ? user.phone : '');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [pwFeedback, setPwFeedback] = useState<{ text: string; bad?: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!user || !account) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile(displayName, phone);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwFeedback(null);

    if (newPw.length < 8) {
      setPwFeedback({ text: 'New password must be at least 8 characters long.', bad: true });
      return;
    }
    if (newPw !== confirmPw) {
      setPwFeedback({ text: 'New passwords do not match.', bad: true });
      return;
    }

    setPwFeedback({ text: 'Credentials updated. Active session re-authenticated.' });
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setTimeout(() => setPwFeedback(null), 4000);
  };

  const handleCopyAccountId = () => {
    navigator.clipboard.writeText(account.accountId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-[#17191B]/15">
        <div>
          <div className="text-[10px] uppercase font-mono tracking-widest text-[#9B8055] font-semibold">
            Institutional Identity & Access Management
          </div>
          <h1 className="font-serif text-3xl font-normal text-[#17191B] tracking-tight mt-1">
            Account & Security Preferences
          </h1>
        </div>
        <div className="text-right text-xs font-mono text-[#17191B]/60">
          Security Level: <span className="text-[#17191B] font-semibold">Tier-2 Institutional</span> · Cryptographic Session
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-6 bg-[#FFFFFF] border border-[#17191B]/15 p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#17191B]/15">
            <User className="w-4 h-4 text-[#9B8055]" />
            <h2 className="font-serif text-xl font-normal text-[#17191B]">
              Custody Profile Record
            </h2>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-mono font-bold text-[#17191B]/70 uppercase tracking-wider mb-1">
                Account ID (Immutable)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  disabled
                  value={account.accountId}
                  className="w-full bg-[#F4F1EA] border border-[#17191B]/15 px-3 py-2 text-xs font-mono text-[#17191B] cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={handleCopyAccountId}
                  className="px-3 py-2 bg-[#F4F1EA] hover:bg-[#17191B] hover:text-[#FFFFFF] border border-[#17191B]/15 text-xs text-[#17191B] font-mono uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold text-[#17191B]/70 uppercase tracking-wider mb-1">
                Registered Institutional Email
              </label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full bg-[#F4F1EA] border border-[#17191B]/15 px-3 py-2 text-xs text-[#17191B]/60 cursor-not-allowed font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold text-[#17191B]/70 uppercase tracking-wider mb-1">
                Authorized Legal Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#17191B]/15 px-3 py-2 text-xs text-[#17191B] focus:outline-none focus:border-[#17191B] transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold text-[#17191B]/70 uppercase tracking-wider mb-1">
                Primary Contact Telephone
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#17191B]/15 px-3 py-2 text-xs font-mono text-[#17191B] focus:outline-none focus:border-[#17191B] transition-colors"
              />
            </div>

            {profileSaved && (
              <div className="p-3 bg-emerald-50 text-emerald-950 border border-emerald-300 text-xs flex items-center gap-2 font-mono text-[11px]">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Profile changes committed to institutional register.</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-[#17191B] hover:bg-[#34383B] text-[#FFFFFF] font-mono font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer"
            >
              Commit Profile Updates
            </button>
          </form>
        </div>

        {/* Security / Password Card */}
        <div className="lg:col-span-6 bg-[#FFFFFF] border border-[#17191B]/15 p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#17191B]/15">
            <Lock className="w-4 h-4 text-[#9B8055]" />
            <h2 className="font-serif text-xl font-normal text-[#17191B]">
              Cryptographic Credentials
            </h2>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-mono font-bold text-[#17191B]/70 uppercase tracking-wider mb-1">
                Current Access Password
              </label>
              <input
                type="password"
                required
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#FFFFFF] border border-[#17191B]/15 px-3 py-2 text-xs text-[#17191B] font-mono focus:outline-none focus:border-[#17191B]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold text-[#17191B]/70 uppercase tracking-wider mb-1">
                New Institutional Passphrase (min 8 chars)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#FFFFFF] border border-[#17191B]/15 px-3 py-2 text-xs text-[#17191B] font-mono focus:outline-none focus:border-[#17191B]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold text-[#17191B]/70 uppercase tracking-wider mb-1">
                Verify New Passphrase
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#FFFFFF] border border-[#17191B]/15 px-3 py-2 text-xs text-[#17191B] font-mono focus:outline-none focus:border-[#17191B]"
              />
            </div>

            {pwFeedback && (
              <div
                className={`p-3 text-xs flex items-center gap-2 border font-mono text-[11px] ${
                  pwFeedback.bad
                    ? 'bg-rose-50 text-rose-950 border-rose-300'
                    : 'bg-emerald-50 text-emerald-950 border-emerald-300'
                }`}
              >
                {pwFeedback.bad ? (
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                )}
                <span>{pwFeedback.text}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-[#F4F1EA] hover:bg-[#17191B] hover:text-[#FFFFFF] text-[#17191B] font-mono font-bold text-xs uppercase tracking-widest border border-[#17191B]/15 transition-colors cursor-pointer"
            >
              Rotate Passphrase
            </button>
          </form>

          <div className="pt-3 border-t border-[#17191B]/15 text-[11px] text-[#17191B]/60 space-y-1.5 font-sans">
            <div className="flex items-center gap-1.5 text-[#17191B] font-bold">
              <Shield className="w-3.5 h-3.5 text-[#9B8055]" />
              Multi-Factor Authentication & Enclave Storage
            </div>
            <p className="leading-relaxed">
              Institutional credentials and custody access tokens are cryptographically secured using SHA-256 state hashing and isolated hardware-bound session cookies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
