import React, { useMemo, useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { formatCurrency } from '../services/marketData';
import { WithdrawalPasskeyModal } from './WithdrawalPasskeyModal';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, LifeBuoy } from 'lucide-react';
import type { DepositStatus } from '../types';

const DEPOSIT_STATUS_LABEL: Record<DepositStatus, string> = {
  not_submitted: 'Not submitted',
  pending: 'Pending verification',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
};

const STATUS_STYLE: Record<DepositStatus, string> = {
  not_submitted: 'border-[#B7B1A6] text-[#34383B]',
  pending: 'border-[#9B8055] text-[#9B8055]',
  under_review: 'border-[#34383B] text-[#34383B]',
  approved: 'border-emerald-700 text-emerald-800',
  rejected: 'border-rose-700 text-rose-800',
};

const METHODS = ['Bank transfer', 'Wire transfer', 'Other (as advised by support)'];
const today = () => new Date().toISOString().split('T')[0];
const fmtDate = (t: number) => new Date(t).toLocaleDateString('en-US', { dateStyle: 'medium' });

const inputCls = 'mt-1 w-full border border-[#B7B1A6] bg-white px-3 py-2 text-sm min-w-0';

export const FundingView: React.FC = () => {
  const {
    user,
    account,
    fundingHistory,
    depositRequests,
    submitDepositRequest,
    requestWithdrawalPasscode,
    setKycModalOpen,
    setActiveView,
  } = useTrading();

  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit');

  // Deposit request form (step 5 of the workflow)
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(METHODS[0]);
  const [reference, setReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [depMsg, setDepMsg] = useState<{ text: string; bad?: boolean } | null>(null);

  // Withdrawal form
  const [wAmount, setWAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState('checking');
  const [wBusy, setWBusy] = useState(false);
  const [wMsg, setWMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [passkeyOpen, setPasskeyOpen] = useState(false);
  const [passHint, setPassHint] = useState<string | undefined>();

  const myDeposits = useMemo(
    () => depositRequests.filter(d => d.uid === user?.uid).sort((a, b) => b.createdAt - a.createdAt),
    [depositRequests, user?.uid]
  );
  const myWithdrawals = useMemo(
    () => fundingHistory.filter(f => f.type === 'withdrawal').sort((a, b) => b.createdAt - a.createdAt),
    [fundingHistory]
  );

  if (!account || !user) return null;
  const kycOk = user.kycStatus === 'approved';

  const submitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepMsg(null);
    const n = parseFloat(amount);
    if (!n || n <= 0) return setDepMsg({ text: 'Enter an amount greater than zero.', bad: true });
    if (!reference.trim()) return setDepMsg({ text: 'Enter the payment reference supplied with your payment.', bad: true });
    if (paymentDate > today()) return setDepMsg({ text: 'Payment date cannot be in the future.', bad: true });
    try {
      setBusy(true);
      const req = await submitDepositRequest({
        amountStr: amount,
        paymentMethod: method,
        paymentReference: reference.trim(),
        paymentDate,
        evidenceNotes: notes.trim() || undefined,
      });
      setDepMsg({ text: `Request ${req.id} submitted. Status: Pending verification. Your balance is unchanged until an administrator approves it.` });
      setAmount('');
      setReference('');
      setNotes('');
    } catch (err: any) {
      setDepMsg({ text: err?.message || 'Could not submit the request.', bad: true });
    } finally {
      setBusy(false);
    }
  };

  const startWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setWMsg(null);
    if (!kycOk) return setWMsg({ text: 'Identity verification is required before withdrawing.', bad: true });
    const n = parseFloat(wAmount);
    if (!n || n <= 0) return setWMsg({ text: 'Enter a valid amount.', bad: true });
    if (Math.round(n * 100) > account.cash) {
      return setWMsg({ text: `Insufficient available cash. Available: ${formatCurrency(account.cash)}`, bad: true });
    }
    if (!bankName.trim() || !routingNumber.trim() || !accountNumber.trim()) {
      return setWMsg({ text: 'Enter the full destination bank details.', bad: true });
    }
    try {
      setWBusy(true);
      const session = await requestWithdrawalPasscode(wAmount, { bankName, routingNumber, accountNumber, accountType });
      setPassHint(session.directPasscodeHint);
      setPasskeyOpen(true);
    } catch (err: any) {
      setWMsg({ text: err?.message || 'Could not start the withdrawal.', bad: true });
    } finally {
      setWBusy(false);
    }
  };

  return (
    <div className="space-y-6 min-w-0">
      <header className="border-b border-[#B7B1A6]/40 pb-4">
        <p className="text-[10px] font-mono tracking-widest uppercase text-[#9B8055]">Account {user.accountId}</p>
        <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#17191B]">Deposits and withdrawals</h1>
        <p className="text-sm text-[#34383B] mt-1">
          Available cash <span className="font-mono text-[#17191B]">{formatCurrency(account.cash)}</span>
        </p>
      </header>

      <div className="flex gap-1 text-xs font-bold uppercase tracking-wider">
        {(['deposit', 'withdraw'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-4 py-2.5 border ${tab === t ? 'bg-[#17191B] text-[#F4F1EA] border-[#17191B]' : 'border-[#B7B1A6] text-[#34383B]'}`}
          >
            {t === 'deposit' ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
            {t === 'deposit' ? 'Deposit' : 'Withdraw'}
          </button>
        ))}
      </div>

      {tab === 'deposit' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          <div className="lg:col-span-2 space-y-4 min-w-0">
            <div className="border border-[#9B8055]/60 bg-white p-4 flex gap-3">
              <AlertTriangle className="w-4 h-4 text-[#9B8055] shrink-0 mt-0.5" />
              <div className="text-sm text-[#17191B] space-y-3">
                <p>
                  Deposits are subject to verification. Please contact official support to obtain the approved deposit
                  instructions before making a payment.
                </p>
                <button
                  onClick={() => setActiveView('support')}
                  className="inline-flex items-center gap-1.5 bg-[#17191B] text-[#F4F1EA] px-3 py-2 text-xs font-bold uppercase tracking-wider"
                >
                  <LifeBuoy className="w-3.5 h-3.5" /> Contact official support
                </button>
              </div>
            </div>

            <form onSubmit={submitDeposit} className="border border-[#B7B1A6]/50 bg-white p-4 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider">Submit a deposit request</h2>
              <p className="text-xs text-[#34383B]">
                Use this only after paying with the instructions you received from support. Submitting does not credit your account.
              </p>
              <label className="block text-xs text-[#34383B]">Amount (USD)
                <input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className={`${inputCls} font-mono`} />
              </label>
              <label className="block text-xs text-[#34383B]">Payment method
                <select value={method} onChange={e => setMethod(e.target.value)} className={inputCls}>
                  {METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </label>
              <label className="block text-xs text-[#34383B]">Payment reference
                <input value={reference} onChange={e => setReference(e.target.value)} className={`${inputCls} font-mono`} />
              </label>
              <label className="block text-xs text-[#34383B]">Payment date
                <input type="date" max={today()} value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className={inputCls} />
              </label>
              <label className="block text-xs text-[#34383B]">Evidence details (optional)
                <textarea rows={3} maxLength={1000} value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} />
              </label>
              <p className="text-[11px] text-[#34383B]">Document upload is not available yet. Send receipts to support in your enquiry.</p>
              {depMsg && <p className={`text-xs ${depMsg.bad ? 'text-rose-800' : 'text-emerald-800'}`}>{depMsg.text}</p>}
              <button disabled={busy} className="w-full bg-[#17191B] text-[#F4F1EA] py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-50">
                {busy ? 'Submitting' : 'Submit for verification'}
              </button>
            </form>
          </div>

          <section className="lg:col-span-3 border border-[#B7B1A6]/50 bg-white min-w-0">
            <h2 className="p-4 border-b border-[#B7B1A6]/40 text-xs font-bold uppercase tracking-wider">Deposit history</h2>
            {myDeposits.length === 0 ? (
              <div className="p-10 text-center text-sm text-[#34383B]">
                <span className={`inline-block text-[10px] font-mono uppercase px-2 py-0.5 border mb-2 ${STATUS_STYLE.not_submitted}`}>
                  {DEPOSIT_STATUS_LABEL.not_submitted}
                </span>
                <p>You have not submitted any deposit requests.</p>
              </div>
            ) : (
              <ul className="divide-y divide-[#B7B1A6]/30">
                {myDeposits.map(d => (
                  <li key={d.id} className="p-4 space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-mono text-sm">{formatCurrency(d.amountMinor)}</span>
                      <span className={`shrink-0 text-[10px] font-mono uppercase px-2 py-0.5 border ${STATUS_STYLE[d.status]}`}>
                        {DEPOSIT_STATUS_LABEL[d.status]}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#34383B] break-words">
                      {d.id} · {d.paymentMethod} · Ref {d.paymentReference} · Paid {d.paymentDate} · Submitted {fmtDate(d.createdAt)}
                    </p>
                    {d.status === 'rejected' && d.rejectionReason && (
                      <p className="text-xs text-rose-800 bg-rose-50 border border-rose-200 p-2">Reason: {d.rejectionReason}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === 'withdraw' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          <form onSubmit={startWithdrawal} className="lg:col-span-2 border border-[#B7B1A6]/50 bg-white p-4 space-y-3 min-w-0">
            <h2 className="text-xs font-bold uppercase tracking-wider">Request a withdrawal</h2>
            {!kycOk && (
              <p className="text-xs text-[#34383B] bg-[#F4F1EA] border border-[#B7B1A6] p-2">
                Identity verification is required.{' '}
                <button type="button" onClick={() => setKycModalOpen(true)} className="underline text-[#9B8055]">Verify now</button>
              </p>
            )}
            <label className="block text-xs text-[#34383B]">Amount (USD)
              <input inputMode="decimal" value={wAmount} onChange={e => setWAmount(e.target.value)} className={`${inputCls} font-mono`} />
            </label>
            <label className="block text-xs text-[#34383B]">Bank name
              <input value={bankName} onChange={e => setBankName(e.target.value)} className={inputCls} />
            </label>
            <label className="block text-xs text-[#34383B]">Routing / sort code
              <input value={routingNumber} onChange={e => setRoutingNumber(e.target.value)} className={`${inputCls} font-mono`} />
            </label>
            <label className="block text-xs text-[#34383B]">Account number
              <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className={`${inputCls} font-mono`} />
            </label>
            <label className="block text-xs text-[#34383B]">Account type
              <select value={accountType} onChange={e => setAccountType(e.target.value)} className={inputCls}>
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </select>
            </label>
            {wMsg && <p className={`text-xs ${wMsg.bad ? 'text-rose-800' : 'text-emerald-800'}`}>{wMsg.text}</p>}
            <button disabled={wBusy} className="w-full bg-[#17191B] text-[#F4F1EA] py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-50">
              {wBusy ? 'Please wait' : 'Continue'}
            </button>
          </form>

          <section className="lg:col-span-3 border border-[#B7B1A6]/50 bg-white min-w-0">
            <h2 className="p-4 border-b border-[#B7B1A6]/40 text-xs font-bold uppercase tracking-wider">Withdrawal history</h2>
            {myWithdrawals.length === 0 ? (
              <p className="p-10 text-center text-sm text-[#34383B]">No withdrawals yet.</p>
            ) : (
              <ul className="divide-y divide-[#B7B1A6]/30">
                {myWithdrawals.map(w => (
                  <li key={w.id} className="p-4 flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="font-mono text-sm block">{formatCurrency(w.amountMinor)}</span>
                      <span className="text-[11px] text-[#34383B] break-words">{w.reference} · {fmtDate(w.createdAt)}</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-mono uppercase px-2 py-0.5 border border-[#B7B1A6]">{w.status.replace('_', ' ')}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <WithdrawalPasskeyModal
        isOpen={passkeyOpen}
        onClose={() => setPasskeyOpen(false)}
        directPasscodeHint={passHint}
      />
    </div>
  );
};
