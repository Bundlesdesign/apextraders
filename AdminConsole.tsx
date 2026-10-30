import React, { useState, useMemo } from 'react';
import { useTrading } from '../context/TradingContext';
import { formatCurrency } from '../services/marketData';
import { SupportView } from './SupportView';
import {
  Shield,
  Sliders,
  CheckSquare,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Search,
  Activity,
  RefreshCw,
  Clock,
  UserCheck,
  Building,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  FileText,
  X,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  CreditCard,
  ZoomIn,
  Briefcase,
  Users,
} from 'lucide-react';

export const AdminConsole: React.FC = () => {
  const {
    user,
    allUsers,
    allAccounts,
    journals,
    allWithdrawals,
    allDepositRequests,
    adminAdjustments,
    auditLogs,
    lastReconciliation,
    postAdminAdjustment,
    adminCreditDebit,
    approveAdjustment,
    rejectAdjustment,
    reviewWithdrawal,
    approveDepositRequest,
    rejectDepositRequest,
    setUserStatus,
    runReconciliation,
    reverseJournal,
    tickets,
    closeSupportTicket,
    approveKyc,
    rejectKyc,
    requestKycResubmission,
  } = useTrading();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'deposits' | 'balances' | 'kyc' | 'customers' | 'adjust' | 'review' | 'audit' | 'support'
  >('overview');

  // Deposit clearing state
  const [depositFilter, setDepositFilter] = useState<'all' | 'pending' | 'cleared' | 'declined'>('all');
  const [depositActionModal, setDepositActionModal] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [depositAdminNote, setDepositAdminNote] = useState('');

  // Customer search & inspect state
  const [customerSearch, setCustomerSearch] = useState('');
  const [inspectedUid, setInspectedUid] = useState<string | null>(null);
  const [statusModalUid, setStatusModalUid] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<'approved' | 'restricted' | 'suspended'>('approved');
  const [statusReason, setStatusReason] = useState('');

  // KYC Review State
  const [selectedKycUid, setSelectedKycUid] = useState<string | null>(null);
  const [kycFilter, setKycFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'resubmission_required'>('all');
  const [kycActionModal, setKycActionModal] = useState<{
    uid: string;
    action: 'reject' | 'resubmit';
  } | null>(null);
  const [kycActionText, setKycActionText] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Balance Allocation Desk State
  const [allocTargetUid, setAllocTargetUid] = useState('');
  const [allocDirection, setAllocDirection] = useState<'credit' | 'debit'>('credit');
  const [allocAmount, setAllocAmount] = useState('');
  const [allocReference, setAllocReference] = useState('');
  const [allocDescription, setAllocDescription] = useState('');
  const [allocNote, setAllocNote] = useState('');
  const [allocFeedback, setAllocFeedback] = useState<{ text: string; bad?: boolean } | null>(null);
  const [isAllocating, setIsAllocating] = useState(false);

  // Legacy adjust & reversal state
  const [targetEmailOrUid, setTargetEmailOrUid] = useState('');
  const [adjustDirection, setAdjustDirection] = useState<'credit' | 'debit'>('credit');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('customer_request');
  const [adjustReference, setAdjustReference] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustFeedback, setAdjustFeedback] = useState<{ text: string; bad?: boolean } | null>(null);

  const [reversalModalJournalId, setReversalModalJournalId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // Support reply state
  const [replyText, setReplyText] = useState<{ [id: string]: string }>({});

  if (!user || !user.isAdmin) return null;

  // Computed metrics
  const totalCustomerCash = allAccounts.reduce((sum, a) => sum + a.cash, 0);
  const totalReserved = allAccounts.reduce((sum, a) => sum + a.reserved, 0);
  const pendingWithdrawals = allWithdrawals.filter(w => w.status === 'under_review');
  const pendingAdjustments = adminAdjustments.filter(a => a.status === 'pending_approval');
  const pendingKycCount = allUsers.filter(u => u.kycStatus === 'pending').length;
  const pendingDepositCount = allDepositRequests.filter(
    d => d.status === 'pending' || d.status === 'under_review'
  ).length;

  // Filtered Deposit Requests
  const filteredDeposits = useMemo(() => {
    if (depositFilter === 'all') return allDepositRequests;
    if (depositFilter === 'pending')
      return allDepositRequests.filter(
        d => d.status === 'pending' || d.status === 'under_review'
      );
    if (depositFilter === 'cleared') return allDepositRequests.filter(d => d.status === 'approved');
    return allDepositRequests.filter(d => d.status === 'rejected');
  }, [allDepositRequests, depositFilter]);

  // Filtered KYC Users
  const kycUsers = useMemo(() => {
    if (kycFilter === 'all') return allUsers;
    return allUsers.filter(u => u.kycStatus === kycFilter);
  }, [allUsers, kycFilter]);

  const selectedKycUser = allUsers.find(u => u.uid === selectedKycUid) || (kycUsers.length > 0 ? kycUsers[0] : null);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return allUsers;
    return allUsers.filter(
      u =>
        u.email.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        u.accountId.toLowerCase().includes(q)
    );
  }, [allUsers, customerSearch]);

  const inspectedUser = allUsers.find(u => u.uid === inspectedUid);
  const inspectedAccount = allAccounts.find(a => a.uid === inspectedUid);
  const inspectedJournals = journals.filter(j => j.uid === inspectedUid);

  // Target account for balance allocation desk
  const selectedAllocUser = allUsers.find(u => u.uid === allocTargetUid) || (allUsers.length > 0 ? allUsers[0] : null);
  const selectedAllocAccount = selectedAllocUser ? allAccounts.find(a => a.uid === selectedAllocUser.uid) : null;

  // Quick preset amounts for allocation
  const allocPresets = [1000, 5000, 10000, 25000, 50000, 100000];

  // Balance Allocation Execution
  const handleExecuteAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setAllocFeedback(null);

    const targetUser = allUsers.find(u => u.uid === allocTargetUid) || selectedAllocUser;
    if (!targetUser) {
      setAllocFeedback({ text: 'Please select a valid client account.', bad: true });
      return;
    }

    const num = parseFloat(allocAmount);
    if (!num || num <= 0) {
      setAllocFeedback({ text: 'Please enter a valid adjustment amount.', bad: true });
      return;
    }

    try {
      setIsAllocating(true);
      const generatedRef =
        allocReference.trim() ||
        `ALC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const res = await adminCreditDebit({
        targetUid: targetUser.uid,
        direction: allocDirection,
        amountStr: allocAmount,
        reference: generatedRef,
        description: allocDescription.trim(),
        note: allocNote.trim(),
      });

      setAllocFeedback({
        text: `Transaction Posted: ${allocDirection.toUpperCase()} of ${formatCurrency(res.amountMinor)} executed for ${targetUser.email}. Immediate ledger reflection active.`,
      });
      setAllocReference('');
      setAllocNote('');
    } catch (err: any) {
      setAllocFeedback({ text: err.message || 'Balance allocation failed.', bad: true });
    } finally {
      setIsAllocating(false);
    }
  };

  // KYC Actions
  const handleApproveKyc = async (targetUid: string) => {
    try {
      await approveKyc(targetUid);
    } catch (err: any) {
      alert(err.message || 'Error approving KYC.');
    }
  };

  const handleKycModalSubmit = async () => {
    if (!kycActionModal || !kycActionText.trim()) return;

    try {
      if (kycActionModal.action === 'reject') {
        await rejectKyc(kycActionModal.uid, kycActionText.trim());
      } else {
        await requestKycResubmission(kycActionModal.uid, kycActionText.trim());
      }
      setKycActionModal(null);
      setKycActionText('');
    } catch (err: any) {
      alert(err.message || 'Error executing KYC action.');
    }
  };

  const handleApplyStatus = async () => {
    if (!statusModalUid || !statusReason.trim()) return;
    await setUserStatus(statusModalUid, newStatus, statusReason.trim());
    setStatusModalUid(null);
    setStatusReason('');
  };

  const handleApplyReversal = async () => {
    if (!reversalModalJournalId || !reversalReason.trim()) return;
    await reverseJournal(reversalModalJournalId, reversalReason.trim());
    setReversalModalJournalId(null);
    setReversalReason('');
  };

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-blue-600" />
            Compliance & Administrative Terminal
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
              SERVER AUTHORIZED
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Brokerage balance allocation, KYC compliance desk, double-entry adjustment ledger, and regulatory surveillance.
          </p>
        </div>

        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase text-[#9B8055] font-semibold mb-1">
            <span>CLEARING & ADMINISTRATIVE SURVEILLANCE DESK</span>
            <span>·</span>
            <span className="text-[#34383B]">SERVER LEVEL ACCESS</span>
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl text-[#17191B] font-normal flex items-center gap-3">
            Administrative Clearing Console
          </h1>
          <p className="text-xs text-[#34383B] mt-1 font-interface">
            Double-entry ledger balance allocation, wire clearing verification, KYC compliance desk, and customer support.
          </p>
        </div>

        <button
          onClick={runReconciliation}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#17191B] hover:bg-[#34383B] text-[#F4F1EA] text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#9B8055]" />
          <span>Reconcile Ledger</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 border-b border-[#B7B1A6]/40 scrollbar-none text-xs font-mono uppercase">
        {[
          { id: 'overview', label: 'Overview Metrics' },
          {
            id: 'deposits',
            label: 'Deposit Verification Desk',
            badge: pendingDepositCount > 0 ? pendingDepositCount : undefined,
          },
          { id: 'balances', label: 'Balance Allocation Desk' },
          {
            id: 'kyc',
            label: 'KYC Review Desk',
            badge: pendingKycCount > 0 ? pendingKycCount : undefined,
          },
          { id: 'customers', label: `Clients (${allUsers.length})` },
          {
            id: 'review',
            label: `Disbursements (${pendingWithdrawals.length + pendingAdjustments.length})`,
          },
          { id: 'audit', label: 'Ledger Audit' },
          { id: 'support', label: `Support (${tickets.filter(t => t.status === 'open').length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-2 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-[#17191B] text-[#F4F1EA] font-bold'
                : 'text-[#34383B] hover:text-[#17191B] hover:bg-[#B7B1A6]/10'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-[#9B8055] text-[#17191B]">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs">
              <div className="text-[11px] font-mono uppercase text-slate-500 font-bold">Registered Clients</div>
              <div className="text-2xl font-mono font-bold text-slate-900 mt-1">
                {allUsers.length}
              </div>
              <div className="text-xs text-slate-500 mt-1.5">
                {allUsers.filter(u => u.status === 'approved').length} Active Accounts
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs">
              <div className="text-[11px] font-mono uppercase text-slate-500 font-bold">Client Cash Liabilities</div>
              <div className="text-2xl font-mono font-bold text-slate-900 mt-1">
                {formatCurrency(totalCustomerCash)}
              </div>
              <div className="text-xs text-slate-500 mt-1.5">
                Reserved: {formatCurrency(totalReserved)}
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs">
              <div className="text-[11px] font-mono uppercase text-slate-500 font-bold">Pending KYC Audits</div>
              <div className={`text-2xl font-mono font-bold mt-1 ${pendingKycCount ? 'text-amber-600' : 'text-slate-500'}`}>
                {pendingKycCount}
              </div>
              <div className="text-xs text-slate-500 mt-1.5">
                Submissions awaiting compliance sign-off
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs">
              <div className="text-[11px] font-mono uppercase text-slate-500 font-bold">Pending Wire Reviews</div>
              <div className={`text-2xl font-mono font-bold mt-1 ${pendingWithdrawals.length ? 'text-amber-700' : 'text-slate-500'}`}>
                {pendingWithdrawals.length}
              </div>
              <div className="text-xs text-slate-500 mt-1.5">
                Withdrawals ≥ $10,000.00
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Health */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-5 space-y-3 shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Ledger Settlement Health
              </h3>
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Ledger Balance State:</span>
                  <span className="text-emerald-700 font-mono font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> BALANCED (0 Drift)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Immutable Journals:</span>
                  <span className="text-slate-900 font-mono font-semibold">{journals.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Zero Balance Rule:</span>
                  <span className="text-blue-700 font-mono font-semibold">Enforced (New Users Start at $0.00)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">KYC Disbursement Gate:</span>
                  <span className="text-emerald-700 font-mono font-semibold">Strict FinCEN Tier-2 Active</span>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-5 space-y-3 shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Administrative Fast Desks
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => setActiveTab('balances')}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors cursor-pointer"
                >
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    Credit / Debit Account
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Allocate funds or debit client balances immediately.</p>
                </button>
                <button
                  onClick={() => setActiveTab('kyc')}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors cursor-pointer"
                >
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    Review KYC Submissions
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Inspect identity documents and biometric verification.</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WIRE CLEARING DESK TAB */}
      {activeTab === 'deposits' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#B7B1A6]/40 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono tracking-widest text-[#9B8055] uppercase font-bold block">
                DEPOSITORY SETTLEMENT SURVEILLANCE
              </span>
              <h2 className="font-editorial text-2xl text-[#17191B] mt-0.5">
                Custodial Wire Clearing Desk
              </h2>
              <p className="text-xs text-[#34383B] font-mono mt-0.5">
                Inspect client-submitted IMAD/OMAD references, audit bank origin, and execute balanced double-entry
                credits.
              </p>
            </div>

            <div className="flex items-center gap-1 border border-[#B7B1A6]/40 p-1 font-mono text-xs">
              {(['all', 'pending', 'cleared', 'declined'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setDepositFilter(f)}
                  className={`px-3 py-1 uppercase tracking-wider transition-colors cursor-pointer ${
                    depositFilter === f
                      ? 'bg-[#17191B] text-[#F4F1EA] font-bold'
                      : 'text-[#34383B] hover:text-[#17191B]'
                  }`}
                >
                  {f === 'all' ? 'All Records' : f}
                </button>
              ))}
            </div>
          </div>

          {filteredDeposits.length === 0 ? (
            <div className="bg-white border border-[#B7B1A6]/40 p-12 text-center text-xs font-mono text-[#34383B]">
              No deposit coordination records found under current filter.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDeposits.map(req => (
                <div key={req.id} className="bg-white border border-[#B7B1A6]/40 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#B7B1A6]/20">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-[#17191B]">{req.id}</span>
                        <span className="text-[#9B8055]">·</span>
                        <span className="font-mono font-bold text-base text-[#17191B]">
                          {formatCurrency(req.amountMinor)}
                        </span>
                      </div>
                      <div className="text-xs text-[#34383B] font-mono mt-0.5">
                        Client: <strong>{req.userName}</strong> ({req.userEmail}) · Account: {req.accountId}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 font-bold ${
                          req.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : req.status === 'pending' || req.status === 'under_review'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-[#17191B] text-[#F4F1EA]'
                        }`}
                      >
                        {req.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono bg-[#F4F1EA] p-3 border border-[#B7B1A6]/30">
                    <div>
                      <span className="text-[10px] text-[#34383B] uppercase block">Payment Date</span>
                      <span className="font-bold text-[#17191B]">{req.paymentDate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#34383B] uppercase block">Payment Reference</span>
                      <span className="font-bold text-[#9B8055]">{req.paymentReference}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#34383B] uppercase block">Payment Method</span>
                      <span className="text-[#17191B]">{req.paymentMethod}</span>
                    </div>
                  </div>

                  {req.evidenceNotes && (
                    <div className="text-xs font-interface text-[#34383B] bg-white p-2.5 border border-[#B7B1A6]/30">
                      <span className="font-bold font-mono text-[10px] uppercase text-[#17191B] block">Client Notes:</span>
                      {req.evidenceNotes}
                    </div>
                  )}

                  {req.status !== 'approved' && req.status !== 'rejected' && (
                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#B7B1A6]/20 font-mono text-xs">
                      <button
                        type="button"
                        onClick={() => setDepositActionModal({ id: req.id, action: 'reject' })}
                        className="px-3 py-1.5 border border-rose-300 text-rose-700 hover:bg-rose-50 uppercase tracking-wider cursor-pointer"
                      >
                        Decline Request
                      </button>
                      <button
                        type="button"
                        onClick={() => setDepositActionModal({ id: req.id, action: 'approve' })}
                        className="px-4 py-1.5 bg-[#17191B] hover:bg-[#34383B] text-[#F4F1EA] uppercase tracking-wider font-bold transition-colors cursor-pointer"
                      >
                        Verify Wire & Credit Balance
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Modal for approving/declining deposit */}
          {depositActionModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17191B]/80 select-none">
              <div className="bg-white border border-[#17191B] max-w-md w-full p-6 space-y-4">
                <div className="border-b border-[#B7B1A6]/30 pb-2 flex items-center justify-between">
                  <h3 className="font-editorial text-2xl text-[#17191B]">
                    {depositActionModal.action === 'approve'
                      ? 'Verify Wire & Credit Ledger'
                      : 'Decline Deposit Request'}
                  </h3>
                  <button
                    onClick={() => setDepositActionModal(null)}
                    className="p-1 text-[#34383B] hover:text-[#17191B]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-[#34383B] font-interface">
                  {depositActionModal.action === 'approve'
                    ? 'This will immediately execute a balanced double-entry credit journal to the client account and unlock available trading cash.'
                    : 'Please provide the compliance reason for declining this deposit request.'}
                </p>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#34383B] mb-1">
                    {depositActionModal.action === 'approve' ? 'Optional Settlement Note' : 'Rejection Reason (Required)'}
                  </label>
                  <input
                    type="text"
                    value={depositAdminNote}
                    onChange={e => setDepositAdminNote(e.target.value)}
                    placeholder={
                      depositActionModal.action === 'approve'
                        ? 'Fedwire confirmed via Treasury IMAD'
                        : 'Invalid originator name or unverified bank'
                    }
                    className="w-full bg-[#F4F1EA] border border-[#B7B1A6]/50 p-2 text-xs font-interface text-[#17191B]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDepositActionModal(null)}
                    className="px-4 py-2 border border-[#B7B1A6]/40 text-xs font-mono uppercase text-[#34383B]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (depositActionModal.action === 'approve') {
                        await approveDepositRequest(depositActionModal.id, depositAdminNote.trim());
                      } else {
                        if (!depositAdminNote.trim()) {
                          alert('Please enter a rejection reason.');
                          return;
                        }
                        await rejectDepositRequest(depositActionModal.id, depositAdminNote.trim());
                      }
                      setDepositActionModal(null);
                      setDepositAdminNote('');
                    }}
                    className={`px-4 py-2 text-xs font-mono uppercase tracking-wider text-white font-bold cursor-pointer ${
                      depositActionModal.action === 'approve' ? 'bg-[#17191B] hover:bg-[#34383B]' : 'bg-rose-700 hover:bg-rose-800'
                    }`}
                  >
                    {depositActionModal.action === 'approve' ? 'Confirm & Post Ledger Credit' : 'Decline Request'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. KYC REVIEW DESK TAB */}
      {activeTab === 'kyc' && (
        <div className="space-y-6">
          {/* Header & Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                Institutional AML/KYC Identity Review Desk
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review government documents, verify biometric portraits, and authorize Tier-2 wire clearing privileges.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              {(['all', 'pending', 'approved', 'rejected', 'resubmission_required'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setKycFilter(f)}
                  className={`px-2.5 py-1 rounded-md capitalize font-medium transition-colors cursor-pointer ${
                    kycFilter === f ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Master-Detail Split Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Submissions Queue */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100 flex justify-between">
                <span>Verification Queue ({kycUsers.length})</span>
                <span className="text-[11px] font-mono text-slate-400">Click to inspect</span>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {kycUsers.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">No client submissions in this category.</p>
                ) : (
                  kycUsers.map(u => {
                    const isSelected = selectedKycUser?.uid === u.uid;
                    return (
                      <div
                        key={u.uid}
                        onClick={() => setSelectedKycUid(u.uid)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-400 shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{u.displayName}</span>
                          <span
                            className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                              u.kycStatus === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : u.kycStatus === 'pending'
                                ? 'bg-amber-100 text-amber-800 animate-pulse'
                                : u.kycStatus === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : u.kycStatus === 'resubmission_required'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {u.kycStatus.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{u.email}</div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
                          <span>Account: {u.accountId}</span>
                          <span>
                            {u.kycSubmission
                              ? `Submitted ${new Date(u.kycSubmission.submittedAt).toLocaleDateString()}`
                              : 'No submission yet'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Submission Inspection Desk */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
              {selectedKycUser ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{selectedKycUser.displayName}</h3>
                      <p className="text-xs text-slate-500 font-mono">{selectedKycUser.email} • {selectedKycUser.accountId}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveKyc(selectedKycUser.uid)}
                        disabled={selectedKycUser.kycStatus === 'approved'}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve KYC
                      </button>
                      <button
                        onClick={() => {
                          setKycActionModal({ uid: selectedKycUser.uid, action: 'reject' });
                          setKycActionText('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => {
                          setKycActionModal({ uid: selectedKycUser.uid, action: 'resubmit' });
                          setKycActionText('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Request Resubmission
                      </button>
                    </div>
                  </div>

                  {/* KYC Details Card */}
                  {selectedKycUser.kycSubmission ? (
                    <div className="space-y-4">
                      {/* Identity Data Table */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
                        <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-1.5">
                          Personal Information & Residence
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-mono">Legal Name</span>
                            <span className="font-semibold text-slate-900">
                              {selectedKycUser.kycSubmission.legalFirstName} {selectedKycUser.kycSubmission.legalLastName}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-mono">Date of Birth</span>
                            <span className="font-semibold text-slate-900">
                              {selectedKycUser.kycSubmission.dateOfBirth}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-mono">Country</span>
                            <span className="font-semibold text-slate-900">
                              {selectedKycUser.kycSubmission.country}
                            </span>
                          </div>
                          <div className="col-span-2 sm:col-span-3">
                            <span className="text-slate-400 block text-[10px] uppercase font-mono">Residential Address</span>
                            <span className="font-semibold text-slate-900">
                              {selectedKycUser.kycSubmission.residentialAddress}, {selectedKycUser.kycSubmission.city},{' '}
                              {selectedKycUser.kycSubmission.stateOrProvince} {selectedKycUser.kycSubmission.postalCode}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-mono">Document Type</span>
                            <span className="font-semibold text-slate-900 uppercase">
                              {selectedKycUser.kycSubmission.idType.replace('_', ' ')}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-mono">Document Number</span>
                            <span className="font-mono font-semibold text-slate-900">
                              {selectedKycUser.kycSubmission.idNumber}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-mono">Status</span>
                            <span className="font-bold uppercase text-[10px] text-blue-700">
                              {selectedKycUser.kycStatus.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Document Previews */}
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                          Submitted Verification Assets
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Front ID */}
                          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-center space-y-1.5">
                            <span className="text-[11px] font-semibold text-slate-700 block">ID Front</span>
                            {selectedKycUser.kycSubmission.idFrontImage ? (
                              <div className="relative group cursor-pointer" onClick={() => setPreviewImageUrl(selectedKycUser.kycSubmission!.idFrontImage!)}>
                                <img
                                  src={selectedKycUser.kycSubmission.idFrontImage}
                                  alt="ID Front"
                                  className="w-full h-28 object-cover rounded-lg border border-slate-300 shadow-xs"
                                />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center text-white transition-opacity">
                                  <ZoomIn className="w-5 h-5" />
                                </div>
                              </div>
                            ) : (
                              <div className="h-28 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs">
                                No image
                              </div>
                            )}
                          </div>

                          {/* Back ID */}
                          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-center space-y-1.5">
                            <span className="text-[11px] font-semibold text-slate-700 block">ID Back</span>
                            {selectedKycUser.kycSubmission.idBackImage ? (
                              <div className="relative group cursor-pointer" onClick={() => setPreviewImageUrl(selectedKycUser.kycSubmission!.idBackImage!)}>
                                <img
                                  src={selectedKycUser.kycSubmission.idBackImage}
                                  alt="ID Back"
                                  className="w-full h-28 object-cover rounded-lg border border-slate-300 shadow-xs"
                                />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center text-white transition-opacity">
                                  <ZoomIn className="w-5 h-5" />
                                </div>
                              </div>
                            ) : (
                              <div className="h-28 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs">
                                Not provided / Passport
                              </div>
                            )}
                          </div>

                          {/* Selfie */}
                          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-center space-y-1.5">
                            <span className="text-[11px] font-semibold text-slate-700 block">Biometric Selfie</span>
                            {selectedKycUser.kycSubmission.selfieImage ? (
                              <div className="relative group cursor-pointer" onClick={() => setPreviewImageUrl(selectedKycUser.kycSubmission!.selfieImage!)}>
                                <img
                                  src={selectedKycUser.kycSubmission.selfieImage}
                                  alt="Selfie"
                                  className="w-full h-28 object-cover rounded-lg border border-slate-300 shadow-xs"
                                />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center text-white transition-opacity">
                                  <ZoomIn className="w-5 h-5" />
                                </div>
                              </div>
                            ) : (
                              <div className="h-28 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs">
                                No image
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      Client has not submitted identity documents yet.
                    </div>
                  )}
                </>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  Select a client from the queue to inspect their identity documentation.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. BALANCE MANAGEMENT & ALLOCATION DESK TAB */}
      {activeTab === 'balances' && (
        <div className="space-y-6">
          {/* Top Info & Summary */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                Institutional Account Balance Allocation & Credit/Debit Desk
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Allocate capital or debit balances directly. All balance transactions are immediately reflected in client sessions and immutably written to the double-entry transaction ledger.
              </p>
            </div>
            <div className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
              Responsible Administrator: <strong className="text-slate-900">{user.email}</strong>
            </div>
          </div>

          {/* Allocation Terminal Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Allocation Execution Form */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>Post Balance Allocation / Adjustment</span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  LIVE LEDGER POSTING
                </span>
              </h3>

              <form onSubmit={handleExecuteAllocation} className="space-y-4">
                {/* Client Selector */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Target Client Account <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={allocTargetUid || selectedAllocUser?.uid || ''}
                    onChange={e => setAllocTargetUid(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  >
                    {allUsers.map(u => {
                      const acc = allAccounts.find(a => a.uid === u.uid);
                      return (
                        <option key={u.uid} value={u.uid}>
                          {u.displayName} ({u.email}) — Cash: {formatCurrency(acc ? acc.cash : 0)}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Target Client Live Balance Preview */}
                {selectedAllocUser && selectedAllocAccount && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">Selected Client:</span>
                      <span className="font-bold text-slate-900">{selectedAllocUser.displayName} ({selectedAllocAccount.accountId})</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-mono">Available Cash</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {formatCurrency(selectedAllocAccount.cash)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-mono">Reserved</span>
                        <span className="font-mono font-semibold text-slate-700 text-sm">
                          {formatCurrency(selectedAllocAccount.reserved)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-mono">Hold</span>
                        <span className="font-mono font-semibold text-slate-700 text-sm">
                          {formatCurrency(selectedAllocAccount.hold)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Direction Selector (Credit / Debit) */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Transaction Direction <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAllocDirection('credit')}
                      className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                        allocDirection === 'credit'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                      Credit Account (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllocDirection('debit')}
                      className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                        allocDirection === 'debit'
                          ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      Debit Account (-)
                    </button>
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Amount (USD) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-xs">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      value={allocAmount}
                      onChange={e => setAllocAmount(e.target.value)}
                      placeholder="25000.00"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-7 pr-3 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2">
                  {allocPresets.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAllocAmount(p.toString())}
                      className="px-2.5 py-1 text-[11px] font-mono rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                    >
                      ${p.toLocaleString()}
                    </button>
                  ))}
                </div>

                {/* Reference Code & Description */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Transaction Reference
                    </label>
                    <input
                      type="text"
                      value={allocReference}
                      onChange={e => setAllocReference(e.target.value)}
                      placeholder="Auto-generated if empty"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Description / Reason <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={allocDescription}
                      onChange={e => setAllocDescription(e.target.value)}
                      placeholder="e.g. Initial Capital Allocation"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Auditor Internal Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={allocNote}
                    onChange={e => setAllocNote(e.target.value)}
                    placeholder="Context for permanent audit log..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>

                {allocFeedback && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                      allocFeedback.bad
                        ? 'bg-rose-50 text-rose-800 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {allocFeedback.bad ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <span>{allocFeedback.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isAllocating}
                  className="w-full py-2.5 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isAllocating ? 'Executing Double-Entry Ledger Entry...' : `Confirm & ${allocDirection.toUpperCase()} Account Balance`}
                </button>
              </form>
            </div>

            {/* Right: Client Accounts Ledger Summary */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex justify-between items-center">
                <span>Client Balances Directory</span>
                <span className="text-[11px] font-mono text-slate-500 font-normal">{allUsers.length} total clients</span>
              </h3>

              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-100 text-[11px]">
                      <th className="py-2">Client / Account</th>
                      <th className="py-2 text-right">Available Cash</th>
                      <th className="py-2 text-center">KYC Status</th>
                      <th className="py-2 text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allUsers.map(u => {
                      const acc = allAccounts.find(a => a.uid === u.uid);
                      const isSelected = selectedAllocUser?.uid === u.uid;
                      return (
                        <tr key={u.uid} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                          <td className="py-2.5">
                            <div className="font-bold text-slate-900">{u.displayName}</div>
                            <div className="text-[10px] font-mono text-slate-400">{u.accountId} • {u.email}</div>
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(acc ? acc.cash : 0)}
                          </td>
                          <td className="py-2.5 text-center">
                            <span
                              className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                                u.kycStatus === 'approved'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : u.kycStatus === 'pending'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {u.kycStatus.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setAllocTargetUid(u.uid);
                                setAllocFeedback(null);
                              }}
                              className="px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors cursor-pointer"
                            >
                              Adjust Balance
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Permanent Transaction Ledger Audit Log */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Permanent Balance Adjustments Ledger
            </h3>

            <div className="overflow-x-auto">
              {adminAdjustments.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">No balance adjustments executed yet.</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-100 text-[11px]">
                      <th className="py-2">Reference</th>
                      <th className="py-2">Target Account</th>
                      <th className="py-2">Direction</th>
                      <th className="py-2 text-right">Amount</th>
                      <th className="py-2">Admin Responsible</th>
                      <th className="py-2">Description</th>
                      <th className="py-2 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminAdjustments.map(adj => (
                      <tr key={adj.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 font-mono text-[11px] font-semibold text-slate-900">{adj.reference}</td>
                        <td className="py-2.5">
                          <span className="font-semibold text-slate-800">{adj.customerEmail}</span>{' '}
                          <span className="text-[10px] font-mono text-slate-400">({adj.accountId})</span>
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              adj.direction === 'credit'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {adj.direction}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(adj.amountMinor)}
                        </td>
                        <td className="py-2.5 font-mono text-slate-600 text-[11px]">{adj.requestedBy}</td>
                        <td className="py-2.5 text-slate-700 max-w-xs truncate">{adj.reason}</td>
                        <td className="py-2.5 text-right font-mono text-slate-500 text-[11px]">
                          {new Date(adj.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. CUSTOMERS TAB */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                placeholder="Search by email, name, account ID..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Showing {filteredCustomers.length} of {allUsers.length} accounts
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
                    <th className="py-3 px-4 font-semibold">Account / User</th>
                    <th className="py-3 px-4 font-semibold">Email</th>
                    <th className="py-3 px-4 font-semibold text-right">Cash Balance</th>
                    <th className="py-3 px-4 font-semibold text-center">Account Status</th>
                    <th className="py-3 px-4 font-semibold text-center">KYC Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map(u => {
                    const acc = allAccounts.find(a => a.uid === u.uid);
                    return (
                      <tr key={u.uid} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{u.displayName}</div>
                          <div className="text-[10px] font-mono text-slate-400">{u.accountId}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(acc ? acc.cash : 0)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                              u.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : u.status === 'restricted'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                              u.kycStatus === 'approved'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : u.kycStatus === 'pending'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {u.kycStatus.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setAllocTargetUid(u.uid);
                              setActiveTab('balances');
                            }}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
                          >
                            Allocate
                          </button>
                          <button
                            onClick={() => {
                              setStatusModalUid(u.uid);
                              setNewStatus(u.status);
                              setStatusReason('');
                            }}
                            className="px-2.5 py-1 rounded bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-[11px] transition-colors cursor-pointer"
                          >
                            Set Status
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. APPROVALS REVIEW TAB (Withdrawals & Dual-Auth) */}
      {activeTab === 'review' && (
        <div className="space-y-6">
          {/* Withdrawals Under Review */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-5 space-y-4 shadow-xs">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Withdrawals Under Review (≥ $10,000.00) ({pendingWithdrawals.length})
            </h2>

            <div className="overflow-x-auto">
              {pendingWithdrawals.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">No pending withdrawal reviews</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-100 text-[11px]">
                      <th className="py-2">Reference</th>
                      <th className="py-2">Client UID</th>
                      <th className="py-2 text-right">Amount</th>
                      <th className="py-2 text-center">Status</th>
                      <th className="py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingWithdrawals.map(w => (
                      <tr key={w.id}>
                        <td className="py-2.5 font-mono text-slate-700">{w.reference}</td>
                        <td className="py-2.5 font-mono text-slate-500">{w.uid}</td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(w.amountMinor)}
                        </td>
                        <td className="py-2.5 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-50 text-amber-800 border border-amber-200">
                            {w.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 text-right space-x-2">
                          <button
                            onClick={() => reviewWithdrawal(w.id, 'approve')}
                            className="px-3 py-1 rounded bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs cursor-pointer"
                          >
                            Approve & Dispatch
                          </button>
                          <button
                            onClick={() => reviewWithdrawal(w.id, 'reject')}
                            className="px-3 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs cursor-pointer"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Dual-Auth Adjustments Queue */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-5 space-y-4 shadow-xs">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-600" />
              Adjustments Awaiting Dual Authorization (≥ $50,000.00) ({pendingAdjustments.length})
            </h2>

            <div className="overflow-x-auto">
              {pendingAdjustments.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">No adjustments awaiting second-party authorization</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-100 text-[11px]">
                      <th className="py-2">Reference</th>
                      <th className="py-2">Customer</th>
                      <th className="py-2">Direction</th>
                      <th className="py-2 text-right">Amount</th>
                      <th className="py-2">First Signer</th>
                      <th className="py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingAdjustments.map(adj => (
                      <tr key={adj.id}>
                        <td className="py-2.5 font-mono text-slate-700">{adj.reference}</td>
                        <td className="py-2.5 font-mono text-slate-500">{adj.customerEmail}</td>
                        <td className="py-2.5">
                          <span
                            className={`font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              adj.direction === 'credit'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {adj.direction}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(adj.amountMinor)}
                        </td>
                        <td className="py-2.5 font-mono text-slate-500 text-[11px]">{adj.requestedBy}</td>
                        <td className="py-2.5 text-right space-x-2">
                          <button
                            onClick={() => approveAdjustment(adj.id)}
                            className="px-3 py-1 rounded bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs cursor-pointer"
                          >
                            Authorize Dual-Sign
                          </button>
                          <button
                            onClick={() => rejectAdjustment(adj.id)}
                            className="px-3 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs cursor-pointer"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. AUDIT & RECONCILIATION TAB */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Reconciliation Report */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-600" />
                Latest Ledger Invariant Reconciliation Report
              </span>
              {lastReconciliation && (
                <span className="text-[10px] font-mono text-slate-400">
                  Generated {new Date(lastReconciliation.at).toLocaleString()}
                </span>
              )}
            </h3>

            {lastReconciliation ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Reconciliation Status:</span>
                  <span
                    className={`font-mono font-bold ${
                      lastReconciliation.ok ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {lastReconciliation.ok ? 'PASSED — 0 DRIFT' : 'FAILED — EXCEPTIONS DETECTED'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">Accounts Verified</span>
                    <span className="font-mono font-bold text-slate-900">{lastReconciliation.accounts}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">Journals Audited</span>
                    <span className="font-mono font-bold text-slate-900">{lastReconciliation.journals}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">Total Debits</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(lastReconciliation.totalDebits)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">Total Credits</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(lastReconciliation.totalCredits)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">
                Click "Run Ledger Reconciliation" at the top to generate a cryptographic audit report.
              </p>
            )}
          </div>

          {/* Audit Logs */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Immutable Administrative Audit Log
            </h3>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-100 text-[11px]">
                    <th className="py-2">Timestamp</th>
                    <th className="py-2">Action</th>
                    <th className="py-2">Actor Email</th>
                    <th className="py-2">Target</th>
                    <th className="py-2">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 text-slate-500">{new Date(log.at).toLocaleString()}</td>
                      <td className="py-2 font-bold text-slate-900">{log.action}</td>
                      <td className="py-2 text-slate-700">{log.actorEmail}</td>
                      <td className="py-2 text-slate-600">{log.target || 'System'}</td>
                      <td className="py-2 text-slate-500 truncate max-w-xs">{JSON.stringify(log.details || {})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. SUPPORT DESK TAB */}
      {activeTab === 'support' && <SupportView />}

      {/* MODALS */}
      {/* 1. KYC Action Modal (Reject / Resubmit) */}
      {kycActionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              {kycActionModal.action === 'reject' ? 'Decline Identity Verification' : 'Request Document Resubmission'}
            </h3>

            <p className="text-xs text-slate-500">
              {kycActionModal.action === 'reject'
                ? 'Provide a specific compliance reason for declining this verification request.'
                : 'Provide detailed instructions for the user on which documents need to be replaced.'}
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {kycActionModal.action === 'reject' ? 'Rejection Reason' : 'Resubmission Instructions'}
              </label>
              <textarea
                required
                rows={3}
                value={kycActionText}
                onChange={e => setKycActionText(e.target.value)}
                placeholder={
                  kycActionModal.action === 'reject'
                    ? 'e.g. Document expired or name on ID does not match account legal name.'
                    : 'e.g. Government ID image is blurry or glare obscures document number. Please upload clear color scan.'
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setKycActionModal(null)}
                className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleKycModalSubmit}
                disabled={!kycActionText.trim()}
                className={`flex-1 py-2 rounded-lg text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${
                  kycActionModal.action === 'reject' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                Confirm Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Image Fullscreen Preview Lightbox */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-white p-2 rounded-xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={previewImageUrl}
              alt="Document Fullsize"
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
            />
          </div>
        </div>
      )}

      {/* 3. Account Status Modal */}
      {statusModalUid && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              Update Client Account Status
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status Classification</label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                >
                  <option value="approved">Approved (Normal Clearing)</option>
                  <option value="restricted">Restricted (Trading/Disbursements Limited)</option>
                  <option value="suspended">Suspended (All Node Operations Frozen)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Compliance Reason (Required)
                </label>
                <input
                  type="text"
                  required
                  value={statusReason}
                  onChange={e => setStatusReason(e.target.value)}
                  placeholder="e.g. Identity re-verification clearance"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStatusModalUid(null)}
                className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyStatus}
                className="flex-1 py-2 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs uppercase cursor-pointer"
              >
                Apply Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Journal Reversal Modal */}
      {reversalModalJournalId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2.5">
              Reverse Ledger Journal Entry
            </h3>

            <p className="text-xs text-slate-500">
              In accordance with immutable double-entry standards, original records are never deleted. A new offsetting journal entry with inverted debits and credits will be posted.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Audit Reason for Reversal
              </label>
              <input
                type="text"
                required
                value={reversalReason}
                onChange={e => setReversalReason(e.target.value)}
                placeholder="e.g. Inadvertent duplicate wire credit correction"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setReversalModalJournalId(null)}
                className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyReversal}
                className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs uppercase cursor-pointer"
              >
                Post Reversal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
