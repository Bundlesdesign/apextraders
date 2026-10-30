// Run ONCE from a trusted machine:  FIREBASE_SERVICE_ACCOUNT=... node scripts/bootstrap-admin.js
// Looks up the EXISTING admin user and sets the custom claim { admin: true }. It never reads, sets or resets a password
// and never creates a second admin account.
import { init, auth, db, ADMIN_EMAIL, TS } from '../api/_lib.js';
init();
let u;
try { u = await auth().getUserByEmail(ADMIN_EMAIL); }
catch { console.error(`No Firebase Auth user exists for ${ADMIN_EMAIL}. Create it in Firebase Console > Authentication (with the intended password), then re-run.`); process.exit(1); }
if (process.env.ADMIN_UID && process.env.ADMIN_UID !== u.uid) { console.error('ADMIN_UID does not match the user found for the admin email. Aborting.'); process.exit(1); }
if (u.disabled) { console.error('The admin account is disabled in Firebase Auth. Aborting; enable it deliberately first.'); process.exit(1); }
await auth().setCustomUserClaims(u.uid, { ...(u.customClaims || {}), admin: true });
await auth().revokeRefreshTokens(u.uid);
await db().collection('audit_logs').add({ action: 'bootstrap_admin_claim', actorEmail: 'server-script', target: u.uid, outcome: 'success', at: TS() });
console.log(`Admin claim set for uid ${u.uid}. Sign out and back in so the new token carries the claim.`);
process.exit(0);
