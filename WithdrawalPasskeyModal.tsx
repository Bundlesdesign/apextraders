import React, { useState, useEffect } from 'react';
import { useTrading } from '../context/TradingContext';
import { formatCurrency } from '../services/marketData';
import {
  ShieldAlert,
  KeyRound,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  Building,
  Lock,
} from 'lucide-react';

interface WithdrawalPasskeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  directPasscodeHint?: string;
}

export const WithdrawalPasskeyModal: React.FC<WithdrawalPasskeyModalProps> = ({
  isOpen,
  onClose,
  directPasscodeHint,
}) => {
  const {
    activePasscodeSession,
    confirmWithdrawalWithPasscode,
    requestWithdrawalPasscode,
    cancelWithdrawalPasscode,
    user,
  } = useTrading();

  const [enteredCode, setEnteredCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeftSec, setTimeLeftSec] = useState(300); // 5 mins
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!isOpen || !activePasscodeSession) return;

    const interval = setInterval(() => {
      const remainingMs = activePasscodeSession.expiresAt - Date.now();
      const remainingSec = Math.max(0, Math.floor(remainingMs / 1000));
      setTimeLeftSec(remainingSec);
      if (remainingSec <= 240) {
        setCanResend(true);
      }
      if (remainingSec <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, activePasscodeSession]);

  if (!isOpen || !activePasscodeSession) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!enteredCode.trim() || enteredCode.trim().length !== 6) {
      setError('Please provide the full 6-digit numeric passkey.');
      return;
    }

    try {
      setIsVerifying(true);
      await confirmWithdrawalWithPasscode(enteredCode.trim());
      setIsVerifying(false);
      onClose();
    } catch (err: any) {
      setIsVerifying(false);
      setError(err.message || 'Passkey verification failed.');
    }
  };

  const handleResend = async () => {
    try {
      setError(null);
      await requestWithdrawalPasscode(
        (activePasscodeSession.amountMinor / 100).toString(),
        {
          bankName: activePasscodeSession.destinationBank,
          routingNumber: activePasscodeSession.routingNumber,
          accountNumber: activePasscodeSession.accountNumber,
          accountType: activePasscodeSession.accountType,
        }
      );
      setCanResend(false);
      setEnteredCode('');
    } catch (err: any) {
      setError(err.message || 'Could not resend passkey.');
    }
  };

  const minutes = Math.floor(timeLeftSec / 60);
  const seconds = (timeLeftSec % 60).toString().padStart(2, '0');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17191B]/80 select-none">
      <div
        className="w-full max-w-md bg-[#FFFFFF] border border-[#17191B] p-6 space-y-5 shadow-none"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#B7B1A6]/30">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-[#9B8055] uppercase font-bold block">
              CRYPTOGRAPHIC AUTHORIZATION · STEP 5 OF 6
            </span>
            <h3 className="font-editorial text-2xl text-[#17191B] mt-0.5">
              Disbursement Passkey
            </h3>
          </div>
          <button
            onClick={() => {
              cancelWithdrawalPasscode();
              onClose();
            }}
            className="p-1 text-[#34383B] hover:text-[#17191B] cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transaction Summary */}
        <div className="bg-[#F4F1EA] border border-[#B7B1A6]/40 p-4 font-mono text-xs space-y-2">
          <div className="flex justify-between items-center pb-2 border-b border-[#B7B1A6]/30">
            <span className="text-[#34383B] uppercase text-[10px]">Disbursement Sum:</span>
            <span className="text-base font-bold text-[#17191B]">
              {formatCurrency(activePasscodeSession.amountMinor)}
            </span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[#34383B]">Depository:</span>
            <span className="font-semibold text-[#17191B]">
              {activePasscodeSession.destinationBank} (****{activePasscodeSession.accountNumber.slice(-4)})
            </span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[#34383B]">Account Type:</span>
            <span className="text-[#17191B] uppercase">{activePasscodeSession.accountType}</span>
          </div>
        </div>

        {/* Passkey Dispatched Notice */}
        <div className="p-3 bg-[#17191B] text-[#F4F1EA] border-l-2 border-[#9B8055] text-xs font-mono space-y-1">
          <div className="flex items-center gap-1.5 text-[#9B8055] font-bold">
            <Lock className="w-3.5 h-3.5" />
            <span>Time-Sensitive One-Time Passkey</span>
          </div>
          <p className="text-[11px] text-[#B7B1A6] font-interface">
            A 6-digit numeric clearance code has been transmitted to your secure notification session.
          </p>
          {directPasscodeHint && (
            <div className="mt-2 p-2 bg-[#34383B] border border-[#9B8055]/40 flex items-center justify-between text-xs font-mono">
              <span className="text-[#B7B1A6] text-[10px]">Active Session Passkey:</span>
              <span className="text-[#F4F1EA] tracking-widest font-bold text-sm">{directPasscodeHint}</span>
            </div>
          )}
        </div>

        {/* Verification Form */}
        <form onSubmit={handleVerify} className="space-y-4 text-xs font-mono">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] uppercase text-[#34383B] tracking-wider">
                Enter 6-Digit Passkey
              </label>
              <span className="text-[11px] text-[#34383B] flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#9B8055]" />
                Valid for: <strong className="text-[#17191B]">{minutes}:{seconds}</strong>
              </span>
            </div>
            <input
              type="text"
              maxLength={6}
              autoFocus
              value={enteredCode}
              onChange={e => setEnteredCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="w-full text-center tracking-[0.5em] text-2xl font-bold bg-[#F4F1EA] border border-[#B7B1A6]/50 py-3 text-[#17191B] focus:bg-white focus:outline-none focus:border-[#17191B]"
            />
            <div className="flex justify-between items-center text-[10px] mt-1.5 text-[#34383B]">
              <span>Attempts remaining: <strong className="text-[#17191B]">{activePasscodeSession.attemptsRemaining}</strong></span>
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-[#9B8055] hover:underline uppercase cursor-pointer"
                >
                  Resend Passkey
                </button>
              ) : (
                <span>Resend in 60s</span>
              )}
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-interface flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying || enteredCode.length !== 6 || timeLeftSec <= 0}
            className="w-full py-3 bg-[#17191B] hover:bg-[#34383B] disabled:bg-[#34383B]/50 text-[#F4F1EA] text-xs uppercase tracking-widest font-bold transition-colors cursor-pointer"
          >
            {isVerifying ? 'Authenticating Passkey...' : 'Authorize Wire Disbursement'}
          </button>
        </form>

        <div className="pt-3 border-t border-[#B7B1A6]/30 text-[11px] text-[#34383B]">
          Need help? Contact official support from the Support section.
        </div>
      </div>
    </div>
  );
};
