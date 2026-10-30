import {
  Account,
  Position,
  Order,
  Execution,
  JournalEntry,
  JournalLine,
  ReconciliationReport,
} from '../types';

export class EngineError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = 'EngineError';
    this.code = code;
    this.status = status;
  }
}

export const FEE_BPS = 10; // 0.10% commission
export const PARTIAL_FILL_CAP = 100;

export const fee = (grossMinor: number): number => {
  return Math.max(grossMinor > 0 ? 1 : 0, Math.round((grossMinor * FEE_BPS) / 10000));
};

export const A = {
  cash: (uid: string) => `CASH:${uid}`,
  res: (uid: string) => `RESERVED:${uid}`,
  hold: (uid: string) => `HOLD:${uid}`,
  FUND: 'PLATFORM_FUNDING_CLEARING',
  CLEAR: 'PLATFORM_TRADE_CLEARING',
  FEES: 'PLATFORM_REVENUE_FEES',
};

export function toMinor(v: string | number): number {
  const s = String(v ?? '').trim();
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(s)) {
    throw new EngineError('bad_amount', 'Enter a positive amount with at most 2 decimal places.');
  }
  const [w, f = ''] = s.split('.');
  const m = Number(w) * 100 + Number((f + '00').slice(0, 2));
  if (!Number.isSafeInteger(m) || m <= 0) {
    throw new EngineError('bad_amount', 'Amount must be greater than zero.');
  }
  return m;
}

export function createJournal(
  uid: string,
  type: JournalEntry['type'],
  memo: string,
  lines: JournalLine[],
  extra: Partial<JournalEntry> = {}
): JournalEntry {
  const normalizedLines = lines.map(l => ({
    acct: l.acct,
    dr: l.dr || 0,
    cr: l.cr || 0,
  }));

  for (const l of normalizedLines) {
    if (!Number.isSafeInteger(l.dr) || !Number.isSafeInteger(l.cr) || l.dr < 0 || l.cr < 0 || (l.dr > 0 && l.cr > 0)) {
      throw new EngineError('bad_line', 'Invalid journal line specifications', 500);
    }
  }

  const drTotal = normalizedLines.reduce((acc, l) => acc + l.dr, 0);
  const crTotal = normalizedLines.reduce((acc, l) => acc + l.cr, 0);

  if (drTotal !== crTotal || drTotal <= 0) {
    throw new EngineError('unbalanced', `Journal entry is not balanced: Dr $${drTotal / 100} != Cr $${crTotal / 100}`, 500);
  }

  return {
    id: `JRN-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    uid,
    type,
    memo,
    lines: normalizedLines,
    totalMinor: drTotal,
    createdAt: Date.now(),
    ...extra,
  };
}

export function applyJournal(account: Account, uid: string, j: JournalEntry): Account {
  const a = { ...account };
  for (const l of j.lines) {
    const delta = l.cr - l.dr;
    if (l.acct === A.cash(uid)) a.cash += delta;
    else if (l.acct === A.res(uid)) a.reserved += delta;
    else if (l.acct === A.hold(uid)) a.hold += delta;
  }

  for (const k of ['cash', 'reserved', 'hold'] as const) {
    if (a[k] < 0) {
      throw new EngineError(
        k === 'cash' ? 'insufficient_funds' : 'negative_balance',
        `Insufficient eligible funds for this operation (shortfall in ${k}).`
      );
    }
  }

  a.version = (a.version || 0) + 1;
  a.updatedAt = Date.now();
  return a;
}

export function fillOrder(
  account: Account,
  position: Position,
  order: Order,
  fillQty: number,
  executionPriceMinor: number
): {
  account: Account;
  position: Position;
  order: Order;
  journal: JournalEntry;
  execution: Execution;
} {
  const o = { ...order };
  const uid = o.uid;
  const remaining = o.qty - o.filledQty;

  if (!Number.isInteger(fillQty) || fillQty <= 0 || fillQty > remaining) {
    throw new EngineError('bad_fill', 'Invalid fill quantity', 500);
  }

  const gross = fillQty * executionPriceMinor;
  const f = fee(gross);
  let acc = { ...account };
  let pos = { ...position };
  let lines: JournalLine[];
  let realized = 0;

  if (o.side === 'buy') {
    const share = fillQty === remaining ? o.reservedMinor : Math.floor((o.reservedMinor * fillQty) / remaining);
    const rel = share - gross - f;

    if (rel < 0) {
      throw new EngineError('reserve_shortfall', 'Reserved funds do not cover execution gross and commission', 500);
    }

    lines = [
      { acct: A.res(uid), dr: share, cr: 0 },
      { acct: A.CLEAR, dr: 0, cr: gross },
      { acct: A.FEES, dr: 0, cr: f },
      ...(rel > 0 ? [{ acct: A.cash(uid), dr: 0, cr: rel }] : []),
    ];

    o.reservedMinor -= share;
    pos.qty += fillQty;
    pos.costBasisMinor += gross + f;
    pos.updatedAt = Date.now();
  } else {
    if (fillQty > pos.qty) {
      throw new EngineError('insufficient_shares', 'Not enough held shares to complete execution', 500);
    }

    const basis = fillQty === pos.qty ? pos.costBasisMinor : Math.round((pos.costBasisMinor * fillQty) / pos.qty);
    realized = gross - f - basis;

    lines = [
      { acct: A.CLEAR, dr: gross, cr: 0 },
      { acct: A.cash(uid), dr: 0, cr: gross - f },
      { acct: A.FEES, dr: 0, cr: f },
    ];

    pos.qty -= fillQty;
    pos.held -= fillQty;
    pos.costBasisMinor -= basis;
    pos.updatedAt = Date.now();
  }

  const j = createJournal(
    uid,
    'trade_fill',
    `Executed ${o.side.toUpperCase()} ${fillQty} ${o.symbol} @ $${(executionPriceMinor / 100).toFixed(2)}`,
    lines,
    { orderId: o.id, symbol: o.symbol }
  );

  acc = applyJournal(acc, uid, j);
  if (realized !== 0) {
    acc.realizedPnlMinor = (acc.realizedPnlMinor || 0) + realized;
  }

  o.avgFillMinor = Math.round((o.avgFillMinor * o.filledQty + executionPriceMinor * fillQty) / (o.filledQty + fillQty));
  o.filledQty += fillQty;
  o.status = o.filledQty === o.qty ? 'filled' : 'partially_filled';
  o.updatedAt = Date.now();

  const execution: Execution = {
    id: `EXEC-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    uid,
    orderId: o.id,
    symbol: o.symbol,
    side: o.side,
    qty: fillQty,
    priceMinor: executionPriceMinor,
    grossMinor: gross,
    feeMinor: f,
    realizedPnlMinor: realized,
    createdAt: Date.now(),
  };

  return { account: acc, position: pos, order: o, journal: j, execution };
}

export const isMarketable = (order: Order, currentPrice: number): boolean => {
  if (order.type === 'market') return true;
  if (!order.limitMinor) return false;
  return order.side === 'buy' ? currentPrice <= order.limitMinor : currentPrice >= order.limitMinor;
};

export function placeOrder(
  account: Account,
  position: Position | null,
  params: {
    uid: string;
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    qty: number;
    limitMinor: number | null;
  },
  currentPrice: number
): {
  account: Account;
  position: Position;
  order: Order;
  journals: JournalEntry[];
  executions: Execution[];
} {
  const { uid, symbol, side, type, qty, limitMinor } = params;

  if (account.status === 'suspended') {
    throw new EngineError('account_suspended', 'Your brokerage account is suspended. Contact compliance support.', 403);
  }
  if (side === 'buy' && account.status !== 'approved') {
    throw new EngineError('account_restricted', 'Your account is restricted: buying power is disabled.', 403);
  }
  if (type === 'limit' && !(limitMinor && limitMinor > 0)) {
    throw new EngineError('bad_limit', 'Please enter a valid limit price.');
  }

  let acc = { ...account };
  let pos = position ? { ...position } : { uid, symbol, qty: 0, held: 0, costBasisMinor: 0, updatedAt: Date.now() };

  const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const order: Order = {
    id: orderId,
    uid,
    symbol,
    side,
    type,
    qty,
    filledQty: 0,
    limitMinor: type === 'limit' ? limitMinor : null,
    status: 'open',
    reservedMinor: 0,
    avgFillMinor: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const journals: JournalEntry[] = [];
  const executions: Execution[] = [];

  if (side === 'buy') {
    // 1% slippage buffer for market orders, or exact limit price
    const refPrice = type === 'limit' ? limitMinor! : Math.round(currentPrice * 1.01);
    const reserveNeeded = qty * refPrice + fee(qty * refPrice);

    if (acc.cash < reserveNeeded) {
      throw new EngineError(
        'insufficient_funds',
        `Insufficient available cash. Required: $${(reserveNeeded / 100).toFixed(2)}, Available: $${(acc.cash / 100).toFixed(2)}`
      );
    }

    const j = createJournal(
      uid,
      'order_reserve',
      `Hold cash for BUY ${qty} ${symbol}`,
      [
        { acct: A.cash(uid), dr: reserveNeeded, cr: 0 },
        { acct: A.res(uid), dr: 0, cr: reserveNeeded },
      ],
      { orderId, symbol }
    );

    acc = applyJournal(acc, uid, j);
    journals.push(j);
    order.reservedMinor = reserveNeeded;
  } else {
    // Sell: ensure user has enough free shares
    const availableShares = pos.qty - pos.held;
    if (availableShares < qty) {
      throw new EngineError('insufficient_shares', `You hold ${pos.qty} shares (${pos.held} committed to open sells). Sellable: ${availableShares}.`);
    }
    pos.held += qty;
  }

  // Check if order is immediately marketable
  if (isMarketable(order, currentPrice)) {
    const fillRes = fillOrder(acc, pos, order, qty, currentPrice);
    acc = fillRes.account;
    pos = fillRes.position;
    Object.assign(order, fillRes.order);
    journals.push(fillRes.journal);
    executions.push(fillRes.execution);
  }

  return { account: acc, position: pos, order, journals, executions };
}

export function cancelOrder(
  account: Account,
  position: Position,
  order: Order
): {
  account: Account;
  position: Position;
  order: Order;
  journal?: JournalEntry;
} {
  const o = { ...order };
  const uid = o.uid;

  if (!['open', 'partially_filled'].includes(o.status)) {
    throw new EngineError('not_cancelable', 'This order is already filled or canceled.');
  }

  let acc = { ...account };
  let pos = { ...position };
  let journal: JournalEntry | undefined;

  if (o.side === 'buy') {
    if (o.reservedMinor > 0) {
      journal = createJournal(
        uid,
        'order_release',
        `Release reserved cash for canceled BUY ${o.symbol}`,
        [
          { acct: A.res(uid), dr: o.reservedMinor, cr: 0 },
          { acct: A.cash(uid), dr: 0, cr: o.reservedMinor },
        ],
        { orderId: o.id, symbol: o.symbol }
      );
      acc = applyJournal(acc, uid, journal);
    }
    o.reservedMinor = 0;
  } else {
    const uncommittedShares = o.qty - o.filledQty;
    pos.held = Math.max(0, pos.held - uncommittedShares);
  }

  o.status = 'canceled';
  o.updatedAt = Date.now();

  return { account: acc, position: pos, order: o, journal };
}

export function reconcileLedger(
  accounts: Account[],
  journals: JournalEntry[]
): ReconciliationReport {
  let totalDebits = 0;
  let totalCredits = 0;

  for (const j of journals) {
    for (const l of j.lines) {
      totalDebits += l.dr;
      totalCredits += l.cr;
    }
  }

  const exceptions: ReconciliationReport['exceptions'] = [];

  for (const acc of accounts) {
    const userCashLines = journals
      .flatMap(j => j.lines)
      .filter(l => l.acct === A.cash(acc.uid));

    const expectedCash = userCashLines.reduce((sum, l) => sum + (l.cr - l.dr), 0);
    const drift = acc.cash - expectedCash;

    if (drift !== 0) {
      exceptions.push({
        uid: acc.uid,
        accountId: acc.accountId,
        expectedCash,
        actualCash: acc.cash,
        driftMinor: drift,
      });
    }
  }

  return {
    at: Date.now(),
    ok: exceptions.length === 0 && totalDebits === totalCredits,
    journals: journals.length,
    accounts: accounts.length,
    totalDebits,
    totalCredits,
    exceptions,
  };
}
