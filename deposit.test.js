import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDepositRequest, normRef, refDocId } from '../api/_deposit.js';
import { EngineError } from '../api/_engine.js';

const ok = { amount: '250.00', paymentMethod: 'Bank transfer', paymentReference: ' abc 123-x ', paymentDate: '2026-10-01' };
const NOW = new Date('2026-10-30T12:00:00Z');

test('valid request is normalised', () => {
  const v = validateDepositRequest(ok, NOW);
  assert.equal(v.amountMinor, 25000); assert.equal(v.reference, 'ABC123-X');
});
test('references normalise to the same duplicate key', () => {
  assert.equal(refDocId('abc 123-x'), refDocId('ABC123-X')); assert.equal(normRef(' a b '), 'AB');
});
test('rejects bad amounts, methods, references and dates', () => {
  for (const patch of [{ amount: '0' }, { amount: '-1' }, { amount: '1.234' }, { amount: '1000000.01' }, { paymentMethod: 'Cash' },
    { paymentReference: 'ab' }, { paymentReference: 'x'.repeat(65) }, { paymentDate: '2026-11-01' }, { paymentDate: 'nope' }])
    assert.throws(() => validateDepositRequest({ ...ok, ...patch }, NOW), EngineError);
});
