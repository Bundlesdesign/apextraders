import React, { useMemo, useState } from 'react';
import { LifeBuoy, Send, X, CheckCircle2, MessageSquare } from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import type { SupportTicket } from '../types';

const CATEGORIES: { id: NonNullable<SupportTicket['category']>; label: string }[] = [
  { id: 'deposit', label: 'Deposit question' },
  { id: 'withdrawal', label: 'Withdrawal question' },
  { id: 'kyc', label: 'Identity verification' },
  { id: 'general', label: 'General enquiry' },
];

const STATUS_LABEL: Record<SupportTicket['status'], string> = {
  open: 'Open',
  in_progress: 'In progress',
  closed: 'Closed',
};

const fmt = (t: number) => new Date(t).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

export const SupportView: React.FC = () => {
  const { user, tickets, createSupportTicket, addTicketMessage, closeSupportTicket } = useTrading();
  const [category, setCategory] = useState<NonNullable<SupportTicket['category']>>('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'closed'>('all');
  const [error, setError] = useState<string | null>(null);

  const isAdmin = !!user?.isAdmin;

  const visible = useMemo(() => {
    const mine = isAdmin ? tickets : tickets.filter(t => t.uid === user?.uid);
    return [...mine]
      .filter(t => filter === 'all' || (filter === 'closed' ? t.status === 'closed' : t.status !== 'closed'))
      .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
  }, [tickets, user?.uid, isAdmin, filter]);

  const active = visible.find(t => t.id === activeId) || null;
  const unresolved = tickets.filter(t => t.status !== 'closed').length;

  if (!user) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (subject.trim().length < 3 || message.trim().length < 10) {
      setError('Please enter a subject and a message of at least 10 characters.');
      return;
    }
    createSupportTicket(subject.trim().slice(0, 120), message.trim().slice(0, 2000), category);
    setSubject('');
    setMessage('');
  };

  const send = async () => {
    if (!active || !reply.trim()) return;
    try {
      await addTicketMessage(active.id, reply.trim().slice(0, 2000));
      setReply('');
    } catch (err: any) {
      setError(err?.message || 'Unable to send reply.');
    }
  };

  return (
    <div className="space-y-6 min-w-0">
      <header>
        <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#17191B]">Support</h1>
        <p className="text-sm text-[#34383B] mt-1 max-w-2xl">
          {isAdmin
            ? `Customer enquiries. ${unresolved} unresolved.`
            : 'Contact official support about deposits, withdrawals, verification or your account. Support is the only channel for approved deposit instructions.'}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {!isAdmin && (
          <form onSubmit={submit} className="lg:col-span-2 border border-[#B7B1A6]/50 bg-white p-4 sm:p-5 space-y-3 min-w-0">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#17191B]">
              <LifeBuoy className="w-4 h-4 text-[#9B8055]" /> New enquiry
            </h2>
            <label className="block text-xs text-[#34383B]">
              Topic
              <select
                value={category}
                onChange={e => setCategory(e.target.value as typeof category)}
                className="mt-1 w-full border border-[#B7B1A6] bg-[#F4F1EA] px-3 py-2 text-sm"
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-[#34383B]">
              Subject
              <input
                value={subject}
                maxLength={120}
                onChange={e => setSubject(e.target.value)}
                className="mt-1 w-full border border-[#B7B1A6] bg-[#F4F1EA] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs text-[#34383B]">
              Message
              <textarea
                value={message}
                maxLength={2000}
                rows={5}
                onChange={e => setMessage(e.target.value)}
                className="mt-1 w-full border border-[#B7B1A6] bg-[#F4F1EA] px-3 py-2 text-sm"
              />
            </label>
            {error && <p className="text-xs text-rose-800">{error}</p>}
            <button type="submit" className="w-full bg-[#17191B] text-[#F4F1EA] px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-[#34383B]">
              Send to support
            </button>
          </form>
        )}

        <section className={`${isAdmin ? 'lg:col-span-5' : 'lg:col-span-3'} border border-[#B7B1A6]/50 bg-white min-w-0`}>
          <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-[#B7B1A6]/40">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#17191B]">
              {isAdmin ? 'All requests' : 'Your requests'}
            </h2>
            <div className="flex gap-1 text-[11px]">
              {(['all', 'unresolved', 'closed'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 border ${filter === f ? 'bg-[#17191B] text-[#F4F1EA] border-[#17191B]' : 'border-[#B7B1A6] text-[#34383B]'}`}
                >
                  {f[0].toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#34383B]">
              <MessageSquare className="w-6 h-6 mx-auto mb-2 text-[#B7B1A6]" />
              No requests to show.
            </div>
          ) : (
            <ul className="divide-y divide-[#B7B1A6]/30">
              {visible.map(t => (
                <li key={t.id}>
                  <button
                    onClick={() => setActiveId(t.id)}
                    className="w-full text-left p-4 hover:bg-[#F4F1EA] flex items-start justify-between gap-3"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-[#17191B] truncate">{t.subject}</span>
                      <span className="block text-[11px] text-[#34383B] mt-0.5">
                        {t.id} · {t.category || 'general'} · {fmt(t.updatedAt || t.createdAt)}
                        {isAdmin && t.userEmail ? ` · ${t.userEmail}` : ''}
                      </span>
                    </span>
                    <span className={`shrink-0 text-[10px] font-mono uppercase px-2 py-0.5 border ${t.status === 'closed' ? 'border-[#B7B1A6] text-[#34383B]' : 'border-[#9B8055] text-[#9B8055]'}`}>
                      {STATUS_LABEL[t.status]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {active && (
        <div className="fixed inset-0 z-50 bg-[#17191B]/50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
          <div className="bg-[#F4F1EA] w-full sm:max-w-xl max-h-[90dvh] flex flex-col border border-[#B7B1A6]">
            <div className="flex items-start justify-between gap-3 p-4 border-b border-[#B7B1A6]/50">
              <div className="min-w-0">
                <h3 className="font-editorial text-xl font-semibold truncate">{active.subject}</h3>
                <p className="text-[11px] text-[#34383B]">{active.id} · {STATUS_LABEL[active.status]}</p>
              </div>
              <button onClick={() => setActiveId(null)} aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(active.messages?.length ? active.messages : [{ id: 'm0', senderName: active.userName || 'Customer', senderRole: 'client' as const, message: active.message, createdAt: active.createdAt, senderUid: active.uid }]).map(m => (
                <div key={m.id} className={`p-3 text-sm border ${m.senderRole === 'client' ? 'bg-white border-[#B7B1A6]/50' : 'bg-[#17191B] text-[#F4F1EA] border-[#17191B]'}`}>
                  <div className="text-[10px] font-mono uppercase opacity-70 mb-1">
                    {m.senderRole === 'client' ? m.senderName : 'Official support'} · {fmt(m.createdAt)}
                  </div>
                  <p className="whitespace-pre-wrap break-words">{m.message}</p>
                </div>
              ))}
            </div>
            {active.status !== 'closed' ? (
              <div className="p-4 border-t border-[#B7B1A6]/50 space-y-2">
                <textarea value={reply} onChange={e => setReply(e.target.value)} rows={3} maxLength={2000} placeholder="Write a reply" className="w-full border border-[#B7B1A6] bg-white px-3 py-2 text-sm" />
                <div className="flex flex-wrap gap-2 justify-end">
                  {isAdmin && (
                    <button onClick={() => { closeSupportTicket(active.id); setActiveId(null); }} className="flex items-center gap-1.5 border border-[#17191B] px-3 py-2 text-xs font-bold uppercase">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Close request
                    </button>
                  )}
                  <button onClick={send} className="flex items-center gap-1.5 bg-[#17191B] text-[#F4F1EA] px-3 py-2 text-xs font-bold uppercase">
                    <Send className="w-3.5 h-3.5" /> Send
                  </button>
                </div>
              </div>
            ) : (
              <p className="p-4 border-t border-[#B7B1A6]/50 text-xs text-[#34383B]">This request is closed. Open a new enquiry for further help.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
