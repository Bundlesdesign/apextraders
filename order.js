import { route, db, TS, HttpError, idemKey, persist, notify } from './_lib.js';
import { toMinor, placeOrder, sweepOrder, cancelOrder, newPosition, EngineError } from './_engine.js';
import { BY_SYMBOL, priceAt } from '../public/market.js';

const load = async (tx, D, uid, symbol) => {
  const [a, p] = await Promise.all([tx.get(D.doc(`accounts/${uid}`)), tx.get(D.doc(`positions/${uid}_${symbol}`))]);
  if (!a.exists) throw new HttpError(404, 'no_account', 'Brokerage account not found.');
  return { account: a.data(), position: p.exists ? p.data() : newPosition(uid, symbol) };
};
const wrap = async fn => { try { return await fn(); } catch (e) { if (e instanceof EngineError) throw new HttpError(e.status, e.code, e.message); throw e; } };

export default route(({ uid }, b) => wrap(async () => {
  const D = db();
  if (b.action === 'place') {
    const symbol = String(b.symbol || '').toUpperCase();
    if (!BY_SYMBOL[symbol]) throw new HttpError(400, 'bad_symbol', 'Unsupported instrument.');
    if (!['buy', 'sell'].includes(b.side) || !['market', 'limit'].includes(b.type)) throw new HttpError(400, 'bad_order', 'Invalid order parameters.');
    const qty = Number(b.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 100000) throw new HttpError(400, 'bad_qty', 'Quantity must be a whole number between 1 and 100,000.');
    const limitMinor = b.type === 'limit' ? toMinor(b.limitPrice) : null;
    const key = idemKey(b.idempotencyKey), iRef = D.doc(`idem/${uid}_${key}`), oRef = D.collection('orders').doc();
    const px = priceAt(symbol); // server-side price is authoritative; client price is never trusted
    return D.runTransaction(async tx => {
      const i = await tx.get(iRef);
      if (i.exists) return { ...i.data().result, duplicate: true };
      const S = await load(tx, D, uid, symbol);
      const r = placeOrder(S, { id: oRef.id, uid, symbol, side: b.side, type: b.type, qty, limitMinor }, px);
      persist(tx, D, uid, r);
      const result = { orderId: oRef.id, status: r.order.status, filledQty: r.order.filledQty, avgFillMinor: r.order.avgFillMinor, simulated: true };
      notify(tx, D, uid, `Order ${r.order.status.replace('_', ' ')}`, `${b.side.toUpperCase()} ${qty} ${symbol} (simulated)`);
      tx.set(iRef, { uid, result, createdAt: TS() });
      return result;
    });
  }
  if (b.action === 'cancel') {
    const oRef = D.doc(`orders/${String(b.orderId || '')}`);
    return D.runTransaction(async tx => {
      const o = await tx.get(oRef);
      if (!o.exists || o.data().uid !== uid) throw new HttpError(404, 'not_found', 'Order not found.');
      const S = await load(tx, D, uid, o.data().symbol);
      const r = cancelOrder({ ...S, order: o.data() });
      persist(tx, D, uid, r); notify(tx, D, uid, 'Order canceled', `${o.data().symbol} order canceled; reserved funds released.`);
      return { status: 'canceled' };
    });
  }
  if (b.action === 'sweep') { // fills resting limit orders and evaluates price alerts for the caller
    const snap = await D.collection('orders').where('uid', '==', uid).get();
    const open = snap.docs.filter(d => ['open', 'partially_filled'].includes(d.data().status)).slice(0, 20);
    let filled = 0;
    for (const d of open) {
      const did = await D.runTransaction(async tx => {
        const o = await tx.get(d.ref); const S = await load(tx, D, uid, o.data().symbol);
        const r = sweepOrder({ ...S, order: o.data() }, priceAt(o.data().symbol));
        if (!r) return false;
        persist(tx, D, uid, r); notify(tx, D, uid, `Order ${r.order.status.replace('_', ' ')}`, `${r.order.side.toUpperCase()} ${r.order.symbol}: ${r.order.filledQty}/${r.order.qty} filled (simulated)`);
        return true;
      });
      if (did) filled++;
    }
    const al = await D.collection('price_alerts').where('uid', '==', uid).get();
    for (const a of al.docs) {
      const d = a.data(), px = priceAt(d.symbol);
      if (d.active && px != null && (d.direction === 'above' ? px >= d.priceMinor : px <= d.priceMinor)) {
        const b2 = D.batch(); b2.update(a.ref, { active: false, triggeredAt: TS() });
        b2.set(D.collection('notifications').doc(), { uid, title: `Price alert: ${d.symbol}`, body: `${d.symbol} is ${d.direction} your alert price (simulated quote).`, read: false, createdAt: TS() });
        await b2.commit();
      }
    }
    return { filled };
  }
  throw new HttpError(400, 'bad_action', 'Unknown action.');
}), { money: true });
