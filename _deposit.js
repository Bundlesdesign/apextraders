// Pure validation for deposit requests (no I/O) so it can be unit-tested.
import { toMinor, EngineError } from './_engine.js';

export const METHODS = ['Bank transfer', 'Wire transfer', 'Other (as advised by support)'];
export const MAX_DEPOSIT_MINOR = 100_000_000; // $1,000,000.00 per request
export const normRef = r => String(r || '').trim().toUpperCase().replace(/\s+/g, '');
export const refDocId = r => `ref_${normRef(r).replace(/[^A-Z0-9_-]/g, '_')}`;

export function validateDepositRequest(b, now = new Date()) {
  const amountMinor = toMinor(b.amount);
  if (amountMinor > MAX_DEPOSIT_MINOR) throw new EngineError('limit_exceeded', 'Deposit requests are limited to $1,000,000 each.');
  if (!METHODS.includes(b.paymentMethod)) throw new EngineError('bad_method', 'Select a valid payment method.');
  const reference = normRef(b.paymentReference);
  if (!/^[A-Z0-9_-]{4,64}$/.test(reference)) throw new EngineError('bad_reference', 'Enter the payment reference (4-64 letters, numbers, dashes).');
  const date = String(b.paymentDate || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw new EngineError('bad_date', 'Enter a valid payment date.');
  if (date > now.toISOString().slice(0, 10)) throw new EngineError('bad_date', 'Payment date cannot be in the future.');
  const notes = String(b.notes || '').slice(0, 1000);
  return { amountMinor, paymentMethod: b.paymentMethod, reference, paymentDate: date, notes };
}
