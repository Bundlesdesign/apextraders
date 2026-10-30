// Requires the Firestore emulator:  npx firebase emulators:exec --only firestore "node --test tests/rules.test.js"
import test, { before, after } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'xf-rules', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
  await env.withSecurityRulesDisabled(async c => {
    const d = c.firestore();
    await setDoc(doc(d, 'accounts/alice'), { uid: 'alice', cash: 1000, status: 'approved' });
    await setDoc(doc(d, 'accounts/bob'), { uid: 'bob', cash: 5, status: 'approved' });
    await setDoc(doc(d, 'users/alice'), { uid: 'alice', displayName: 'A', phone: '', status: 'approved' });
    await setDoc(doc(d, 'ledger_journal/j1'), { uid: 'alice', lines: [] });
  });
});
after(() => env.cleanup());
const alice = () => env.authenticatedContext('alice').firestore();
const admin = () => env.authenticatedContext('root', { admin: true }).firestore();
test('owner reads own account; cannot read another', async () => {
  await assertSucceeds(getDoc(doc(alice(), 'accounts/alice'))); await assertFails(getDoc(doc(alice(), 'accounts/bob')));
});
test('customer cannot edit balance, ledger, status or role', async () => {
  await assertFails(updateDoc(doc(alice(), 'accounts/alice'), { cash: 999999 }));
  await assertFails(setDoc(doc(alice(), 'ledger_journal/j2'), { uid: 'alice' }));
  await assertFails(updateDoc(doc(alice(), 'ledger_journal/j1'), { memo: 'x' }));
  await assertFails(updateDoc(doc(alice(), 'users/alice'), { status: 'approved', admin: true }));
  await assertSucceeds(updateDoc(doc(alice(), 'users/alice'), { displayName: 'New' }));
});
test('customer cannot create orders, deposits or executions directly', async () => {
  for (const c of ['orders', 'deposits', 'withdrawals', 'executions']) await assertFails(addDoc(collection(alice(), c), { uid: 'alice', status: 'filled' }));
});
test('customer cannot read audit logs or admin data; unauthenticated denied', async () => {
  await assertFails(getDoc(doc(alice(), 'audit_logs/x'))); await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'accounts/alice')));
});
test('admin claim can read any account but still cannot write balances from the client', async () => {
  await assertSucceeds(getDoc(doc(admin(), 'accounts/bob'))); await assertFails(updateDoc(doc(admin(), 'accounts/bob'), { cash: 1 }));
});
