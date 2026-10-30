// Creates the customer profile + brokerage account server-side (clients cannot write these). Idempotent.
import { route, db, TS, ADMIN_EMAIL } from './_lib.js';
import { newAccount } from './_engine.js';
export default route(async ({ uid, email, emailVerified, isAdmin }, b) => {
  if (isAdmin) return { admin: true };
  const D = db(), uRef = D.doc(`users/${uid}`), aRef = D.doc(`accounts/${uid}`);
  await D.runTransaction(async tx => {
    const [u, a] = await Promise.all([tx.get(uRef), tx.get(aRef)]);
    if (!a.exists) tx.set(aRef, { ...newAccount(uid, 'XF-' + uid.slice(0, 8).toUpperCase()), createdAt: TS(), updatedAt: TS() });
    if (!u.exists) tx.set(uRef, { uid, email, emailVerified, displayName: String(b.displayName || '').slice(0, 80), phone: '', status: 'approved', accountId: 'XF-' + uid.slice(0, 8).toUpperCase(), createdAt: TS() });
    else tx.update(uRef, { emailVerified, email });
  });
  return { mode: 'paper' };
});
