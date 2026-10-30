import test from 'node:test';
import assert from 'node:assert/strict';
import { toMinor, journal, applyJournal, A, newAccount, placeOrder, sweepOrder, cancelOrder, fee, EngineError } from '../api/_engine.js';

const U = 'uid1';
const funded = (cash = 1_000_000) => { const a = newAccount(U, 'XF-1'); const j = journal(U, 'deposit', 'seed', [{ acct: A.FUND, dr: cash }, { acct: A.cash(U), cr: cash }]); return applyJournal(a, U, j); };
const req = o => ({ id: 'o1', uid: U, symbol: 'AAPL', side: 'buy', type: 'market', qty: 10, ...o });
const allJournals = [];
const track = r => { allJournals.push(...r.journals); return r; };

test('toMinor parses and rejects bad amounts', () => {
  assert.equal(toMinor('10.5'), 1050); assert.equal(toMinor('0.01'), 1); assert.equal(toMinor('100'), 10000);
  for (const bad of ['0', '-5', '1.234', 'abc', '', '1e5', null]) assert.throws(() => toMinor(bad), EngineError);
});
test('unbalanced and malformed journals are rejected', () => {
  assert.throws(() => journal(U, 't', 'm', [{ acct: 'a', dr: 5 }, { acct: 'b', cr: 4 }]), /balanced/);
  assert.throws(() => journal(U, 't', 'm', [{ acct: 'a', dr: 5.5 }, { acct: 'b', cr: 5.5 }]));
});
test('debit beyond eligible cash is rejected (no negative balances)', () => {
  const a = funded(1000);
  const j = journal(U, 'admin_adjustment', 'x', [{ acct: A.cash(U), dr: 1001 }, { acct: A.FUND, cr: 1001 }]);
  assert.throws(() => applyJournal(a, U, j), /Insufficient/);
});
test('market buy: cash, position, fee, balanced journals', () => {
  const r = track(placeOrder({ account: funded(), position: null }, req(), 20000));
  const gross = 200000, f = fee(gross);
  assert.equal(r.order.status, 'filled'); assert.equal(r.position.qty, 10);
  assert.equal(r.account.reserved, 0);
  assert.equal(r.account.cash, 1_000_000 - gross - f);
  assert.equal(r.position.costBasisMinor, gross + f);
  assert.equal(r.journals.length, 2);
});
test('sell realizes P&L and cannot oversell', () => {
  const b = track(placeOrder({ account: funded(), position: null }, req(), 20000));
  assert.throws(() => placeOrder({ account: b.account, position: b.position }, req({ id: 'o2', side: 'sell', qty: 11 }), 21000), /enough shares/);
  const s = track(placeOrder({ account: b.account, position: b.position }, req({ id: 'o2', side: 'sell' }), 22000));
  assert.equal(s.position.qty, 0); assert.equal(s.position.costBasisMinor, 0);
  assert.equal(s.account.realizedPnlMinor, (220000 - fee(220000)) - (200000 + fee(200000)));
});
test('buy beyond buying power rejected', () => {
  assert.throws(() => placeOrder({ account: funded(1000), position: null }, req(), 20000), /buying power/);
});
test('restricted/suspended accounts cannot buy', () => {
  assert.throws(() => placeOrder({ account: { ...funded(), status: 'restricted' }, position: null }, req(), 20000), /restricted/);
  assert.throws(() => placeOrder({ account: { ...funded(), status: 'suspended' }, position: null }, req({ side: 'sell' }), 20000), /suspended/);
});
test('limit buy rests, reserves, partially fills, then cancel releases remainder', () => {
  const p = track(placeOrder({ account: funded(10_000_000), position: null }, req({ type: 'limit', qty: 250, limitMinor: 19000 }), 20000));
  assert.equal(p.order.status, 'open'); assert.equal(p.account.reserved, 250 * 19000 + fee(250 * 19000));
  assert.equal(sweepOrder(p, 20000), null);
  const f1 = track(sweepOrder(p, 18500));
  assert.equal(f1.order.status, 'partially_filled'); assert.equal(f1.order.filledQty, 100); assert.equal(f1.position.qty, 100);
  const c = track(cancelOrder(f1));
  assert.equal(c.account.reserved, 0); assert.equal(c.order.status, 'canceled');
  assert.equal(c.account.cash + c.position.costBasisMinor, 10_000_000);
  assert.throws(() => cancelOrder(c), /no longer/);
});
test('resting limit sell holds shares and cancel frees them', () => {
  const b = track(placeOrder({ account: funded(), position: null }, req(), 20000));
  const s = track(placeOrder({ account: b.account, position: b.position }, req({ id: 'o3', side: 'sell', type: 'limit', limitMinor: 30000 }), 20000));
  assert.equal(s.position.held, 10);
  assert.throws(() => placeOrder({ account: s.account, position: s.position }, req({ id: 'o4', side: 'sell' }), 20000), /enough shares/);
  assert.equal(cancelOrder(s).position.held, 0);
});
test('global invariant: debits equal credits across every journal', () => {
  let dr = 0, cr = 0;
  for (const j of allJournals) for (const l of j.lines) { dr += l.dr; cr += l.cr; }
  assert.equal(dr, cr); assert.ok(allJournals.length > 5);
});
