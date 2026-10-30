// Pure financial engine: no I/O. Integer cents only. Every posting is a balanced double-entry journal.
export class EngineError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}
export const FEE_BPS = 10;                       // 0.10% simulated commission
export const PARTIAL_FILL_CAP = 100;             // max shares a resting limit order fills per sweep
export const fee = n => Math.max(n > 0 ? 1 : 0, Math.round(n * FEE_BPS / 10000));
export const A = {
  cash: u => `CASH:${u}`, res: u => `RESERVED:${u}`, hold: u => `HOLD:${u}`,
  FUND: 'PLATFORM_SIM_FUNDING', CLEAR: 'PLATFORM_TRADE_CLEARING', FEES: 'PLATFORM_FEES',
};
export function toMinor(v) {
  const s = String(v ?? '').trim();
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(s)) throw new EngineError('bad_amount', 'Enter a positive amount with at most 2 decimal places.');
  const [w, f = ''] = s.split('.');
  const m = Number(w) * 100 + Number((f + '00').slice(0, 2));
  if (!Number.isSafeInteger(m) || m <= 0) throw new EngineError('bad_amount', 'Amount must be greater than zero.');
  return m;
}
export function journal(uid, type, memo, lines, extra = {}) {
  const L = lines.map(l => ({ acct: l.acct, dr: l.dr || 0, cr: l.cr || 0 }));
  for (const l of L) if (!Number.isSafeInteger(l.dr) || !Number.isSafeInteger(l.cr) || l.dr < 0 || l.cr < 0 || (l.dr && l.cr))
    throw new EngineError('bad_line', 'Invalid journal line', 500);
  const dr = L.reduce((a, l) => a + l.dr, 0), cr = L.reduce((a, l) => a + l.cr, 0);
  if (dr !== cr || dr <= 0) throw new EngineError('unbalanced', 'Journal is not balanced', 500);
  return { uid, type, memo, lines: L, totalMinor: dr, ...extra };
}
// Customer accounts are liabilities of the platform: balance = credits - debits.
export function applyJournal(acct, uid, j) {
  const a = { ...acct };
  for (const l of j.lines) {
    const d = l.cr - l.dr;
    if (l.acct === A.cash(uid)) a.cash += d;
    else if (l.acct === A.res(uid)) a.reserved += d;
    else if (l.acct === A.hold(uid)) a.hold += d;
  }
  for (const k of ['cash', 'reserved', 'hold'])
    if (a[k] < 0) throw new EngineError(k === 'cash' ? 'insufficient_funds' : 'negative_balance', 'Insufficient eligible funds for this operation.');
  return a;
}
export const newAccount = (uid, accountId) => ({ uid, accountId, status: 'approved', currency: 'USD', cash: 0, reserved: 0, hold: 0, realizedPnlMinor: 0, version: 0 });
export const newPosition = (uid, symbol) => ({ uid, symbol, qty: 0, held: 0, costBasisMinor: 0 });

function fill(S, qty, px) {
  const o = { ...S.order }, uid = o.uid, remaining = o.qty - o.filledQty;
  if (!Number.isInteger(qty) || qty <= 0 || qty > remaining) throw new EngineError('bad_fill', 'Invalid fill quantity', 500);
  const gross = qty * px, f = fee(gross);
  let acc = S.account, pos = { ...S.position }, lines, realized = 0;
  if (o.side === 'buy') {
    const share = qty === remaining ? o.reservedMinor : Math.floor(o.reservedMinor * qty / remaining);
    const rel = share - gross - f;
    if (rel < 0) throw new EngineError('reserve_shortfall', 'Reserved funds do not cover this fill', 500);
    lines = [{ acct: A.res(uid), dr: share }, { acct: A.CLEAR, cr: gross }, { acct: A.FEES, cr: f }, ...(rel > 0 ? [{ acct: A.cash(uid), cr: rel }] : [])];
    o.reservedMinor -= share; pos.qty += qty; pos.costBasisMinor += gross + f;
  } else {
    if (qty > pos.qty) throw new EngineError('insufficient_shares', 'Not enough shares', 500);
    const basis = qty === pos.qty ? pos.costBasisMinor : Math.round(pos.costBasisMinor * qty / pos.qty);
    realized = gross - f - basis;
    lines = [{ acct: A.CLEAR, dr: gross }, { acct: A.cash(uid), cr: gross - f }, { acct: A.FEES, cr: f }];
    pos.qty -= qty; pos.held -= qty; pos.costBasisMinor -= basis;
  }
  const j = journal(uid, 'trade_fill', `${o.side.toUpperCase()} ${qty} ${o.symbol} @ ${px} (SIMULATED)`, lines, { orderId: o.id, symbol: o.symbol });
  acc = applyJournal(acc, uid, j);
  if (realized) acc.realizedPnlMinor = (acc.realizedPnlMinor || 0) + realized;
  o.avgFillMinor = Math.round((o.avgFillMinor * o.filledQty + px * qty) / (o.filledQty + qty));
  o.filledQty += qty;
  o.status = o.filledQty === o.qty ? 'filled' : 'partially_filled';
  const execution = { uid, orderId: o.id, symbol: o.symbol, side: o.side, qty, priceMinor: px, grossMinor: gross, feeMinor: f, realizedPnlMinor: realized, venue: 'SIMULATED', simulated: true };
  return { account: acc, position: pos, order: o, journals: [j], executions: [execution] };
}
const marketable = (o, px) => o.type === 'market' || (o.side === 'buy' ? px <= o.limitMinor : px >= o.limitMinor);

export function placeOrder({ account, position }, req, px) {
  const { id, uid, symbol, side, type, qty, limitMinor } = req;
  if (account.status === 'suspended') throw new EngineError('account_suspended', 'Your account is suspended. Contact support.', 403);
  if (side === 'buy' && account.status !== 'approved') throw new EngineError('account_restricted', 'Your account is restricted: buying is disabled.', 403);
  if (type === 'limit' && !(limitMinor > 0)) throw new EngineError('bad_limit', 'Enter a limit price.');
  let acc = account, pos = position || newPosition(uid, symbol);
  const order = { id, uid, symbol, side, type, qty, filledQty: 0, limitMinor: type === 'limit' ? limitMinor : null, status: 'open', reservedMinor: 0, avgFillMinor: 0, simulated: true };
  const journals = [], executions = [];
  if (side === 'buy') {
    const ref = type === 'limit' ? limitMinor : Math.round(px * 1.01);
    const reserve = qty * ref + fee(qty * ref);
    if (acc.cash < reserve) throw new EngineError('insufficient_funds', 'Insufficient buying power for this order.');
    const j = journal(uid, 'order_reserve', `Reserve funds for BUY ${qty} ${symbol}`, [{ acct: A.cash(uid), dr: reserve }, { acct: A.res(uid), cr: reserve }], { orderId: id, symbol });
    acc = applyJournal(acc, uid, j); journals.push(j); order.reservedMinor = reserve;
  } else {
    if (pos.qty - pos.held < qty) throw new EngineError('insufficient_shares', 'You do not hold enough shares to sell.');
    pos = { ...pos, held: pos.held + qty };
  }
  let S = { account: acc, position: pos, order };
  if (marketable(order, px)) { const r = fill(S, qty, px); S = r; journals.push(...r.journals); executions.push(...r.executions); }
  return { account: S.account, position: S.position, order: S.order, journals, executions };
}
export function sweepOrder(S, px) {
  const o = S.order, remaining = o.qty - o.filledQty;
  if (!['open', 'partially_filled'].includes(o.status) || o.type !== 'limit' || !marketable(o, px)) return null;
  return fill(S, Math.min(remaining, PARTIAL_FILL_CAP), px);
}
export function cancelOrder(S) {
  const o = { ...S.order }, uid = o.uid;
  if (!['open', 'partially_filled'].includes(o.status)) throw new EngineError('not_cancelable', 'This order can no longer be canceled.');
  let acc = S.account, pos = { ...S.position }; const journals = [];
  if (o.side === 'buy') {
    if (o.reservedMinor > 0) {
      const j = journal(uid, 'order_release', `Release reserved funds for canceled order ${o.symbol}`, [{ acct: A.res(uid), dr: o.reservedMinor }, { acct: A.cash(uid), cr: o.reservedMinor }], { orderId: o.id, symbol: o.symbol });
      acc = applyJournal(acc, uid, j); journals.push(j);
    }
    o.reservedMinor = 0;
  } else pos.held -= (o.qty - o.filledQty);
  o.status = 'canceled';
  return { account: acc, position: pos, order: o, journals, executions: [] };
}
