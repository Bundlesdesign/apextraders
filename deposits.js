// Verified deposit workflow. Customers can only CREATE a pending request. Only a server-verified
// administrator can approve (the sole path that credits a balance) or reject.
import { route, db, TS, HttpError, idemKey, audit, notify } from './_lib.js';
import { journal, applyJournal, A, EngineError } from './_engine.js';
import { validateDepositRequest, refDocId } from './_deposit.js';

const OPEN = ['pending', 'under_review'];

export default route(async ({ uid, email, isAdmin }, b) => {
  const D = db();
  try {
    switch (b.action) {
      case 'submit': return await submit(D, uid, email, b);
      case 'markUnderReview':
      case 'approve':
      case 'reject':
        if (!isAdmin) throw new HttpError(403, 'forbidden', 'Administrator role not verified.');
        return await review(D, uid, email, b);
      default: throw new HttpError(400, 'bad_action', 'Unknown action.');
    }
  } catch (e) {
    if (e instanceof EngineError) throw new HttpError(e.status, e.code, e.message);
    throw e;
  }
}, { money: true });

async function submit(D, uid, email, b) {
  const key = idemKey(b.idempotencyKey), v = validateDepositRequest(b);
  const iRef = D.doc(`idem/dep_${uid}_${key}`), aRef = D.doc(`accounts/${uid}`), rRef = D.doc(`deposit_refs/${refDocId(v.reference)}`);
  const dRef = D.collection('deposits').doc();
  return D.runTransaction(async tx => {
    const [i, a, r] = await Promise.all([tx.get(iRef), tx.get(aRef), tx.get(rRef)]);
    if (i.exists) return { ...i.data().result, duplicate: true };
    if (!a.exists) throw new HttpError(404, 'no_account', 'No brokerage account found.');
    if (a.data().status !== 'approved') throw new HttpError(403, 'account_restricted', 'Deposits are disabled while your account is restricted.');
    if (r.exists) throw new HttpError(409, 'duplicate_reference', 'A deposit request with this payment reference already exists.');
    // NOTE: no journal and no balance change here, by design.
    tx.set(dRef, {
      uid, accountId: a.data().accountId, userEmail: email || '', amountMinor: v.amountMinor, currency: 'USD',
      paymentMethod: v.paymentMethod, paymentReference: v.reference, paymentDate: v.paymentDate, evidenceNotes: v.notes,
      status: 'pending', createdAt: TS(), updatedAt: TS(),
    });
    tx.set(rRef, { uid, depositId: dRef.id, createdAt: TS() });
    audit(tx, D, { actorUid: uid, actorEmail: email, action: 'deposit_submit', outcome: 'success', target: dRef.id, details: { amountMinor: v.amountMinor, reference: v.reference } });
    notify(tx, D, uid, 'Deposit pending verification', `Request ${dRef.id} is awaiting administrator review. Your balance is unchanged until it is approved.`);
    const result = { depositId: dRef.id, status: 'pending' };
    tx.set(iRef, { uid, result, createdAt: TS() });
    return result;
  });
}

async function review(D, adminUid, adminEmail, b) {
  const id = String(b.id || ''); if (!id) throw new HttpError(400, 'bad_id', 'Missing deposit id.');
  const key = idemKey(b.idempotencyKey), iRef = D.doc(`idem/depreview_${key}`), dRef = D.doc(`deposits/${id}`);
  const reason = String(b.reason || '').trim().slice(0, 300);
  if (b.action === 'reject' && !reason) throw new HttpError(400, 'reason_required', 'A rejection explanation is required.');
  const actor = { actorUid: adminUid, actorEmail: adminEmail, action: `deposit_${b.action}`, target: id };
  try {
    return await D.runTransaction(async tx => {
      const [i, d] = await Promise.all([tx.get(iRef), tx.get(dRef)]);
      if (i.exists) return { ...i.data().result, duplicate: true };
      if (!d.exists) throw new HttpError(404, 'not_found', 'Deposit request not found.');
      const dep = d.data();
      if (!OPEN.includes(dep.status)) throw new HttpError(409, 'already_final', `Deposit is already ${dep.status}.`);
      if (dep.uid === adminUid) throw new HttpError(403, 'self_review', 'Administrators cannot review their own deposits.');
      const rRef = D.doc(`deposit_refs/${refDocId(dep.paymentReference)}`);
      let result;
      if (b.action === 'markUnderReview') {
        tx.update(dRef, { status: 'under_review', updatedAt: TS(), reviewedBy: adminUid });
        result = { status: 'under_review' };
      } else if (b.action === 'reject') {
        tx.update(dRef, { status: 'rejected', rejectionReason: reason, reviewedBy: adminUid, reviewedAt: TS(), updatedAt: TS() });
        tx.delete(rRef); // allows a corrected resubmission
        notify(tx, D, dep.uid, 'Deposit rejected', `Request ${id} was rejected. Reason: ${reason}`);
        result = { status: 'rejected' };
      } else {
        const aRef = D.doc(`accounts/${dep.uid}`), a = await tx.get(aRef);
        if (!a.exists) throw new HttpError(404, 'no_account', 'Customer account not found.');
        const refTag = `DEP-CLR-${id}`;
        const j = journal(dep.uid, 'deposit', `Verified deposit ${id} (ref ${dep.paymentReference})`,
          [{ acct: A.FUND, dr: dep.amountMinor }, { acct: A.cash(dep.uid), cr: dep.amountMinor }], { ref: refTag, refId: id, by: adminUid });
        const next = applyJournal(a.data(), dep.uid, j);
        tx.update(aRef, { cash: next.cash, version: (a.data().version || 0) + 1, updatedAt: TS() });
        tx.set(D.collection('ledger_journal').doc(), { ...j, createdAt: TS() });
        tx.update(dRef, { status: 'approved', reviewedBy: adminUid, reviewedAt: TS(), updatedAt: TS() });
        notify(tx, D, dep.uid, 'Deposit approved', `Request ${id} was verified and credited.`);
        result = { status: 'approved', newCashMinor: next.cash };
      }
      audit(tx, D, { ...actor, outcome: 'success', details: { amountMinor: dep.amountMinor, reason: reason || null, status: result.status } });
      tx.set(iRef, { result, createdAt: TS() });
      return result;
    });
  } catch (e) {
    await D.collection('audit_logs').add({ ...actor, outcome: 'failed', error: e.code || 'error', message: String(e.message).slice(0, 200), at: TS() }).catch(() => {});
    throw e;
  }
}
