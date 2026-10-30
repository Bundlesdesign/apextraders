import { route, db, auth, TS, HttpError, idemKey, ref, audit, notify, ADMIN_EMAIL } from './_lib.js';
import { toMinor, journal, applyJournal, A, EngineError } from './_engine.js';

const REASONS = ['customer_request', 'promotional_credit', 'error_correction', 'fee_refund', 'compliance_action', 'operational_exception', 'test_funding'];
const DEFAULT_THRESHOLD = 5_000_000; // $50,000: at/above this a second administrator must approve

async function resolveTarget(t) {
  const s = String(t || '').trim(); if (!s) throw new HttpError(400, 'bad_target', 'Enter a customer email or UID.');
  try { const u = s.includes('@') ? await auth().getUserByEmail(s) : await auth().getUser(s); return u; }
  catch { throw new HttpError(404, 'customer_not_found', 'No customer found for that email or UID.'); }
}
const post = (tx, D, acc, uid, dir, amt, meta) => {
  const j = journal(uid, 'admin_adjustment', `Admin ${dir} (${meta.reason}) ${meta.reference}`,
    dir === 'credit' ? [{ acct: A.FUND, dr: amt }, { acct: A.cash(uid), cr: amt }] : [{ acct: A.cash(uid), dr: amt }, { acct: A.FUND, cr: amt }],
    { ref: meta.reference, adjustmentId: meta.id, by: meta.by });
  const next = applyJournal(acc, uid, j);
  tx.update(D.doc(`accounts/${uid}`), { cash: next.cash, version: (acc.version || 0) + 1, updatedAt: TS() });
  tx.set(D.collection('ledger_journal').doc(), { ...j, createdAt: TS() });
  return next;
};

export default route(async ({ uid: adminUid, email }, b) => {
  const D = db(); const base = { actorUid: adminUid, actorEmail: email, action: b.action };
  try {
    return await run(D, adminUid, email, b);
  } catch (e) {
    await D.collection('audit_logs').add({ ...base, outcome: 'failed', error: e.code || 'error', message: String(e.message).slice(0, 200), target: String(b.target || b.id || b.journalId || ''), at: TS() }).catch(() => {});
    if (e instanceof EngineError) throw new HttpError(e.status, e.code, e.message);
    throw e;
  }
}, { admin: true });

async function run(D, adminUid, adminEmail, b) {
  const actor = { actorUid: adminUid, actorEmail: adminEmail, action: b.action, outcome: 'success' };
  switch (b.action) {
    case 'adjust': {
      const dir = b.direction; if (!['credit', 'debit'].includes(dir)) throw new HttpError(400, 'bad_direction', 'Direction must be credit or debit.');
      if (b.currency !== 'USD') throw new HttpError(400, 'bad_currency', 'Only USD (simulated) is supported.');
      if (!REASONS.includes(b.reason)) throw new HttpError(400, 'bad_reason', 'Select a valid adjustment reason.');
      const amt = toMinor(b.amount), key = idemKey(b.idempotencyKey);
      const user = await resolveTarget(b.target);
      if (user.uid === adminUid) throw new HttpError(403, 'self_adjustment', 'Administrators cannot adjust their own account.');
      const reference = String(b.reference || '').slice(0, 64) || ref('ADJ'), note = String(b.note || '').slice(0, 500);
      const iRef = D.doc(`idem/admin_${key}`), aRef = D.doc(`accounts/${user.uid}`), adjRef = D.collection('admin_adjustments').doc(), setRef = D.doc('settings/app');
      return D.runTransaction(async tx => {
        const [i, a, s] = await Promise.all([tx.get(iRef), tx.get(aRef), tx.get(setRef)]);
        if (i.exists) return { ...i.data().result, duplicate: true };
        if (!a.exists) throw new HttpError(404, 'no_account', 'Customer has no brokerage account yet.');
        const acc = a.data();
        if (b.accountId && b.accountId !== acc.accountId) throw new HttpError(400, 'account_mismatch', 'Account ID does not match this customer.');
        const th = s.exists && s.data().adjustmentApprovalThresholdMinor || DEFAULT_THRESHOLD;
        const rec = { uid: user.uid, customerEmail: user.email, accountId: acc.accountId, direction: dir, amountMinor: amt, currency: 'USD', reason: b.reason, reference, note, requestedBy: adminUid, simulated: true, createdAt: TS() };
        let result;
        if (amt >= th) {
          tx.set(adjRef, { ...rec, status: 'pending_approval' });
          result = { status: 'pending_approval', adjustmentId: adjRef.id, message: 'Amount exceeds the approval threshold. A different administrator must approve it.' };
        } else {
          const next = post(tx, D, acc, user.uid, dir, amt, { reason: b.reason, reference, id: adjRef.id, by: adminUid });
          tx.set(adjRef, { ...rec, status: 'posted', postedAt: TS() });
          notify(tx, D, user.uid, 'Account adjustment', `Your simulated cash balance was ${dir === 'credit' ? 'credited' : 'debited'} (${reference}).`);
          result = { status: 'posted', adjustmentId: adjRef.id, newCashMinor: next.cash };
        }
        audit(tx, D, { ...actor, target: user.uid, details: { dir, amountMinor: amt, reason: b.reason, reference, status: result.status } });
        tx.set(iRef, { result, createdAt: TS() });
        return result;
      });
    }
    case 'approvePending': {
      const adjRef = D.doc(`admin_adjustments/${String(b.id || '')}`);
      return D.runTransaction(async tx => {
        const adj = await tx.get(adjRef); if (!adj.exists || adj.data().status !== 'pending_approval') throw new HttpError(404, 'not_pending', 'No pending adjustment with that ID.');
        const r = adj.data();
        if (r.requestedBy === adminUid) throw new HttpError(403, 'dual_authorization', 'A different administrator must approve this adjustment.');
        if (b.decision === 'reject') { tx.update(adjRef, { status: 'rejected', reviewedBy: adminUid }); audit(tx, D, { ...actor, target: r.uid, details: { id: adjRef.id, decision: 'reject' } }); return { status: 'rejected' }; }
        const a = await tx.get(D.doc(`accounts/${r.uid}`));
        const next = post(tx, D, a.data(), r.uid, r.direction, r.amountMinor, { reason: r.reason, reference: r.reference, id: adjRef.id, by: r.requestedBy });
        tx.update(adjRef, { status: 'posted', approvedBy: adminUid, postedAt: TS() });
        audit(tx, D, { ...actor, target: r.uid, details: { id: adjRef.id, decision: 'approve' } });
        return { status: 'posted', newCashMinor: next.cash };
      });
    }
    case 'setStatus': {
      if (!['approved', 'restricted', 'suspended'].includes(b.status)) throw new HttpError(400, 'bad_status', 'Invalid status.');
      const reason = String(b.reason || '').slice(0, 300); if (reason.length < 3) throw new HttpError(400, 'reason_required', 'A reason is required.');
      const user = await resolveTarget(b.target);
      if ((user.email || '').toLowerCase() === ADMIN_EMAIL) throw new HttpError(403, 'forbidden', 'The administrator account cannot be restricted.');
      await D.runTransaction(async tx => {
        tx.update(D.doc(`accounts/${user.uid}`), { status: b.status, updatedAt: TS() });
        tx.update(D.doc(`users/${user.uid}`), { status: b.status });
        audit(tx, D, { ...actor, target: user.uid, details: { status: b.status, reason } });
      });
      await auth().updateUser(user.uid, { disabled: b.status === 'suspended' });
      if (b.status === 'suspended') await auth().revokeRefreshTokens(user.uid);
      return { status: b.status };
    }
    case 'reviewWithdrawal': {
      const wRef = D.doc(`withdrawals/${String(b.id || '')}`);
      return D.runTransaction(async tx => {
        const w = await tx.get(wRef); if (!w.exists || w.data().status !== 'under_review') throw new HttpError(404, 'not_under_review', 'Withdrawal is not awaiting review.');
        const d = w.data(), a = await tx.get(D.doc(`accounts/${d.uid}`)), approve = b.decision === 'approve';
        const j = journal(d.uid, approve ? 'withdrawal' : 'withdrawal_release', `${approve ? 'Approved' : 'Rejected'} withdrawal ${d.reference}`,
          approve ? [{ acct: A.hold(d.uid), dr: d.amountMinor }, { acct: A.FUND, cr: d.amountMinor }] : [{ acct: A.hold(d.uid), dr: d.amountMinor }, { acct: A.cash(d.uid), cr: d.amountMinor }], { ref: d.reference });
        const next = applyJournal(a.data(), d.uid, j);
        tx.update(D.doc(`accounts/${d.uid}`), { cash: next.cash, hold: next.hold, version: (a.data().version || 0) + 1, updatedAt: TS() });
        tx.set(D.collection('ledger_journal').doc(), { ...j, createdAt: TS() });
        const st = approve ? 'completed' : 'failed';
        tx.update(wRef, { status: st, reviewedBy: adminUid, history: [...d.history, { status: st, at: Date.now() }] });
        notify(tx, D, d.uid, `Withdrawal ${st}`, d.reference);
        audit(tx, D, { ...actor, target: d.uid, details: { withdrawal: wRef.id, decision: b.decision } });
        return { status: st };
      });
    }
    case 'reverse': {
      const jid = String(b.journalId || ''), reason = String(b.reason || '').slice(0, 300); if (reason.length < 3) throw new HttpError(400, 'reason_required', 'A reason is required.');
      const jRef = D.doc(`ledger_journal/${jid}`), rvRef = D.doc(`reversals/${jid}`);
      return D.runTransaction(async tx => {
        const [o, rv] = await Promise.all([tx.get(jRef), tx.get(rvRef)]);
        if (!o.exists) throw new HttpError(404, 'not_found', 'Journal entry not found.');
        if (rv.exists) throw new HttpError(409, 'already_reversed', 'This entry was already reversed.');
        const orig = o.data(); if (!['admin_adjustment', 'deposit'].includes(orig.type)) throw new HttpError(400, 'not_reversible', 'Only adjustments and deposits can be reversed here.');
        const a = await tx.get(D.doc(`accounts/${orig.uid}`));
        const j = journal(orig.uid, 'reversal', `Reversal of ${orig.ref || jid}: ${reason}`, orig.lines.map(l => ({ acct: l.acct, dr: l.cr, cr: l.dr })), { reverses: jid, by: adminUid });
        const next = applyJournal(a.data(), orig.uid, j);
        tx.update(D.doc(`accounts/${orig.uid}`), { cash: next.cash, version: (a.data().version || 0) + 1, updatedAt: TS() });
        tx.set(D.collection('ledger_journal').doc(), { ...j, createdAt: TS() });
        tx.set(rvRef, { journalId: jid, by: adminUid, reason, createdAt: TS() });
        audit(tx, D, { ...actor, target: orig.uid, details: { reverses: jid, reason } });
        return { status: 'reversed' };
      });
    }
    case 'reconcile': { // replays every journal and compares to stored balances
      const [js, as] = await Promise.all([D.collection('ledger_journal').get(), D.collection('accounts').get()]);
      const bal = {}; let dr = 0, cr = 0;
      for (const d of js.docs) for (const l of d.data().lines) { dr += l.dr; cr += l.cr; bal[l.acct] = (bal[l.acct] || 0) + l.cr - l.dr; }
      const exceptions = [];
      for (const d of as.docs) { const a = d.data(), u = d.id;
        for (const [k, f] of [['cash', A.cash(u)], ['reserved', A.res(u)], ['hold', A.hold(u)]]) if ((bal[f] || 0) !== (a[k] || 0)) exceptions.push({ uid: u, field: k, ledger: bal[f] || 0, stored: a[k] || 0 }); }
      if (dr !== cr) exceptions.push({ field: 'global_balance', dr, cr });
      await D.collection('reconciliations').add({ at: TS(), by: adminUid, journals: js.size, accounts: as.size, exceptions, ok: !exceptions.length });
      await D.collection('audit_logs').add({ ...actor, details: { exceptions: exceptions.length }, at: TS() });
      return { ok: !exceptions.length, journals: js.size, exceptions };
    }
    default: throw new HttpError(400, 'bad_action', 'Unknown action.');
  }
}
