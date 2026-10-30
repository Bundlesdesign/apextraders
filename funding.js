import { route, db, TS, HttpError, idemKey, ref, notify } from './_lib.js';
import { toMinor, journal, applyJournal, A, EngineError } from './_engine.js';

const MAX_DEPOSIT = 100_000_000;       // $1,000,000.00 per simulated deposit
const REVIEW_AT = 1_000_000;           // withdrawals >= $10,000 go to admin review

export default route(async ({ uid }, b) => {
  const D = db(), key = idemKey(b.idempotencyKey), iRef = D.doc(`idem/${uid}_${key}`), amt = toMinor(b.amount);
  if (b.kind === 'deposit') throw new HttpError(403, 'deposit_requires_verification', 'Deposits are subject to verification. Contact official support, then submit a deposit request.');
  if (b.kind !== 'withdraw') throw new HttpError(400, 'bad_kind', 'Unknown funding type.');
  try {
    return await D.runTransaction(async tx => {
      const [i, a] = await Promise.all([tx.get(iRef), tx.get(D.doc(`accounts/${uid}`))]);
      if (i.exists) return { ...i.data().result, duplicate: true };
      const acc = a.data();
      if (!acc || acc.status === 'suspended') throw new HttpError(403, 'account_suspended', 'Account is not eligible for funding.');
      if (acc.status !== 'approved') throw new HttpError(403, 'account_restricted', 'Funding is disabled while your account is restricted.');
      const reference = ref(b.kind === 'deposit' ? 'DEP' : 'WDR'), id = D.collection(b.kind === 'deposit' ? 'deposits' : 'withdrawals').doc();
      let j, status, next;
      const hist = s => [{ status: s, at: Date.now() }];
      if (b.kind === 'deposit') {
        if (amt > MAX_DEPOSIT) throw new HttpError(400, 'limit_exceeded', 'Simulated deposits are limited to $1,000,000 each.');
        j = journal(uid, 'deposit', `SIMULATED deposit ${reference}`, [{ acct: A.FUND, dr: amt }, { acct: A.cash(uid), cr: amt }], { ref: reference, refId: id.id });
        status = 'completed';
      } else {
        status = amt >= REVIEW_AT ? 'under_review' : 'completed';
        j = status === 'completed'
          ? journal(uid, 'withdrawal', `SIMULATED withdrawal ${reference}`, [{ acct: A.cash(uid), dr: amt }, { acct: A.FUND, cr: amt }], { ref: reference, refId: id.id })
          : journal(uid, 'withdrawal_hold', `Hold for withdrawal ${reference} (under review)`, [{ acct: A.cash(uid), dr: amt }, { acct: A.hold(uid), cr: amt }], { ref: reference, refId: id.id });
      }
      next = applyJournal(acc, uid, j);
      tx.update(D.doc(`accounts/${uid}`), { cash: next.cash, hold: next.hold, version: (acc.version || 0) + 1, updatedAt: TS() });
      tx.set(D.collection('ledger_journal').doc(), { ...j, createdAt: TS() });
      tx.set(id, { uid, reference, amountMinor: amt, currency: 'USD', status, simulated: true, history: hist(status), createdAt: TS() });
      notify(tx, D, uid, `${b.kind === 'deposit' ? 'Deposit' : 'Withdrawal'} ${status.replace('_', ' ')}`, `${reference} · simulated paper-trading funds, not a real bank transfer.`);
      const result = { reference, status, simulated: true };
      tx.set(iRef, { uid, result, createdAt: TS() });
      return result;
    });
  } catch (e) { if (e instanceof EngineError) throw new HttpError(e.status, e.code, e.message); throw e; }
}, { money: true });
