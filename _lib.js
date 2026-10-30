import admin from 'firebase-admin';
import { A, applyJournal } from './_engine.js';

export class HttpError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'xfundsadmin@gov.com').toLowerCase();

export function init() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new HttpError(500, 'server_not_configured', 'FIREBASE_SERVICE_ACCOUNT is not set on the server.');
    const json = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
    admin.initializeApp({ credential: admin.credential.cert(json) });
  }
  return admin;
}
export const db = () => init().firestore();
export const auth = () => init().auth();
export const TS = () => admin.firestore.FieldValue.serverTimestamp();

// Best-effort per-instance limiter. For production use a shared store (Upstash/Redis) or Firebase App Check + Cloud Armor.
const hits = new Map();
function limit(uid, max = 40, windowMs = 60000) {
  const now = Date.now(), arr = (hits.get(uid) || []).filter(t => now - t < windowMs);
  if (arr.length >= max) throw new HttpError(429, 'rate_limited', 'Too many requests. Please slow down.');
  arr.push(now); hits.set(uid, arr);
}

// Wraps every endpoint: verifies the ID token (checking revocation), derives admin status from the
// server-verified custom claim AND the designated email, and maps errors to JSON.
export const route = (fn, { admin: needAdmin = false, money = false } = {}) => async (req, res) => {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed', 'POST only');
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) throw new HttpError(401, 'unauthenticated', 'Please sign in.');
    init();
    let t;
    try { t = await admin.auth().verifyIdToken(h.slice(7), true); }
    catch { throw new HttpError(401, 'invalid_session', 'Session expired, revoked or account disabled. Please sign in again.'); }
    limit(t.uid);
    const isAdmin = t.admin === true && (t.email || '').toLowerCase() === ADMIN_EMAIL;
    if (needAdmin && !isAdmin) throw new HttpError(403, 'forbidden', 'Administrator role not verified.');
    if (money && !isAdmin && process.env.REQUIRE_VERIFIED_EMAIL !== 'false' && !t.email_verified)
      throw new HttpError(403, 'email_not_verified', 'Verify your email address before using this feature.');
    const out = await fn({ uid: t.uid, email: t.email, emailVerified: !!t.email_verified, isAdmin }, req.body || {});
    res.status(200).json({ ok: true, ...out });
  } catch (e) {
    const s = e.status || 500;
    if (s >= 500) console.error(e);
    res.status(s).json({ ok: false, code: e.code || 'server_error', error: s >= 500 && !e.code ? 'Internal error' : e.message });
  }
};

export const idemKey = k => { if (!/^[A-Za-z0-9_-]{8,64}$/.test(String(k || ''))) throw new HttpError(400, 'bad_idempotency_key', 'Missing or invalid idempotency key.'); return String(k); };
export const ref = p => `${p}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export function audit(tx, D, a) {
  tx.set(D.collection('audit_logs').doc(), { ...a, at: TS() });
}
// Persist an engine result inside a transaction (all reads must already be done).
export function persist(tx, D, uid, r, { position = true } = {}) {
  const aRef = D.doc(`accounts/${uid}`);
  tx.update(aRef, { ...r.account, version: (r.account.version || 0) + 1, updatedAt: TS() });
  if (position && r.position) tx.set(D.doc(`positions/${uid}_${r.position.symbol}`), { ...r.position, updatedAt: TS() });
  if (r.order) tx.set(D.doc(`orders/${r.order.id}`), { ...r.order, updatedAt: TS(), createdAt: r.order.createdAt || TS() }, { merge: true });
  for (const j of r.journals) tx.set(D.collection('ledger_journal').doc(), { ...j, createdAt: TS() });
  for (const e of r.executions || []) tx.set(D.collection('executions').doc(), { ...e, createdAt: TS() });
}
export const notify = (tx, D, uid, title, body) => tx.set(D.collection('notifications').doc(), { uid, title, body, read: false, createdAt: TS() });
export { A, applyJournal };
