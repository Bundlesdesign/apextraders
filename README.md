# X-FUNDS · Firebase paper-trading brokerage

Single-page app (`public/index.html`, no build step) + Vercel serverless API (`api/`) + Firebase Auth + Cloud Firestore.
**Paper trading only.** Funds, prices and executions are simulated and labeled as such. Live trading and real funding are not implemented and stay disabled.

## Why Firestore (not Realtime Database)
Firestore has multi-document transactions, which the ledger needs (journal + balance + order + position commit atomically).
`accounts/{uid}.cash|reserved|hold` are projections maintained in the same transaction as the immutable `ledger_journal` entries.
`reconcile` (admin) replays every journal and flags any drift. Authentication is the only other Firebase product used; there is no second balance store.

## Layout
- `public/index.html`, `firebase.js` (single init module), `market.js` (simulated quotes shared with the server)
- `api/_engine.js` pure ledger/trading engine (integer cents, balanced double-entry) · `_lib.js` auth, rate limit, audit
- `api/account.js` creates profile + account · `order.js` place/cancel/sweep · `funding.js` · `admin.js` adjust/approve/status/withdrawals/reverse/reconcile
- `scripts/bootstrap-admin.js`, `firestore.rules`, `tests/`

## Deploying to Vercel
This folder is its own Vercel project: set **Root Directory = `xf`** in Vercel project settings. Vercel auto-detects `api/*.js` as serverless functions (files starting with `_` are helpers and are ignored), so `vercel.json` needs no `functions` block. The React app in the repository root is a separate project (Root Directory = repository root) and does not use `/api`.

## Setup
1. Firebase Console: enable **Authentication > Email/Password** and create **Firestore** (production mode).
2. Admin: `xfundsadmin@gov.com` must already exist in Authentication (you said it does). Do **not** reset its password.
3. Service account: Project settings > Service accounts > Generate key. Base64 it: `base64 -w0 key.json`. Never commit it.
4. Deploy rules: `npx firebase deploy --only firestore:rules`
5. Set the env vars from `.env.example` in Vercel (or locally), then run once from a trusted machine:
   `npm i && FIREBASE_SERVICE_ACCOUNT=<b64> npm run bootstrap-admin`
   It finds the existing user, sets custom claim `admin: true`, revokes old tokens, writes an audit record. It never touches the password.
6. Authentication > Settings > Authorized domains: add your Vercel domain.
7. Deploy to Vercel (GitHub import). Sign in as the admin; the Admin console appears. The server re-checks claim **and** email on every admin call.

## Security model
- Clients can write only: profile display fields, watchlist, price alerts, support tickets, notification read-flag. Everything financial is server-only (`allow write: if false`).
- Server derives admin status from the verified ID token (revocation checked), never from client input. Admin cannot adjust their own account.
- Idempotency keys on orders, funding and adjustments. Adjustments at/above $50,000 (`settings/app.adjustmentApprovalThresholdMinor`) need a second administrator.
- Reversals are new entries referencing the original; posted entries are never edited.
- Rate limiting is per-serverless-instance (best effort). Before real use add App Check and a shared limiter.

## Tests
- `npm test` runs engine tests (ledger balance, fees, buy/sell, limit orders, partial fills, cancel/release, oversell and overspend rejection).
- `npm run test:rules` runs Security Rules tests against the Firestore emulator (needs Java + `npm i`).

## Not done / needs you
Real market data provider, real payments/KYC/custody, MFA UI, App Check, scheduled sweeper for resting orders while users are offline (orders fill only when the owner's session triggers a sweep), scheduled statements, and legal/licensing review (required before real money, especially in Nigeria).
