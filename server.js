// SOLBATEC Industries - backend. Zero dependencies: run with `node server.js` (Node 18+)
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');
const PAYSTACK = process.env.PAYSTACK_SECRET || '';
const FLW = process.env.FLW_SECRET || '', FLW_HASH = process.env.FLW_HASH || '';
const MON = { key: process.env.MONNIFY_API_KEY || '', secret: process.env.MONNIFY_SECRET || '', contract: process.env.MONNIFY_CONTRACT || '', base: process.env.MONNIFY_BASE || 'https://sandbox.monnify.com' };
const BANK = { bank: process.env.BANK_NAME || '', number: process.env.BANK_ACCOUNT_NUMBER || '', name: process.env.BANK_ACCOUNT_NAME || '' };
const REM = { merchant: process.env.REMITA_MERCHANT_ID || '', service: process.env.REMITA_SERVICE_TYPE_ID || '', key: process.env.REMITA_API_KEY || '', base: process.env.REMITA_BASE || 'https://remitademo.net/remita' };
const ISW = { code: process.env.ISW_MERCHANT_CODE || '', item: process.env.ISW_PAY_ITEM_ID || '', mac: process.env.ISW_MAC_KEY || '', live: process.env.ISW_MODE === 'LIVE', base: process.env.ISW_BASE || '' };
const providers = () => [PAYSTACK && 'paystack', FLW && 'flutterwave', MON.key && MON.secret && MON.contract && 'monnify', REM.merchant && REM.service && REM.key && 'remita', ISW.code && ISW.item && 'interswitch'].filter(Boolean);
const sha = x => crypto.createHash('sha512').update(x).digest('hex');
const SECRET = process.env.SECRET || 'change-this-secret-before-going-live';
const STATUSES = ['Received', 'In production', 'Ready for pickup', 'Delivered', 'Cancelled'];

const hashPw = (p, salt = crypto.randomBytes(8).toString('hex')) => salt + ':' + crypto.scryptSync(p, salt, 32).toString('hex');
const checkPw = (p, h) => { const a = Buffer.from(hashPw(p, h.split(':')[0])), b = Buffer.from(h); return a.length === b.length && crypto.timingSafeEqual(a, b); };
const sign = id => id + '.' + crypto.createHmac('sha256', SECRET).update(String(id)).digest('hex');
const unsign = t => { const [id] = String(t || '').split('.'); return t && sign(id) === t ? Number(id) : null; };

const P = (id, category, name, description, price, stock) => ({ id, category, name, description, price, stock });
function seed() {
  return {
    seq: { user: 2, order: 1, suggestion: 1 },
    users: [{ id: 1, name: 'SOLBATEC Admin', email: 'admin@solbatec.com', role: 'admin', pass: hashPw('Solbatec@2026') }],
    products: [
      P(1, 'Machines', 'Hydraulic Press 20 Ton', 'Workshop press for bending, straightening and pressing bearings.', 850000, 6),
      P(2, 'Machines', 'Bench Lathe 750mm', 'Precision turning for shafts, bushings and custom parts.', 1450000, 3),
      P(3, 'Machines', 'Cassava Grater and Press', 'Diesel-driven unit that grates and dewaters cassava quickly.', 620000, 8),
      P(4, 'Machines', 'Grain Milling Machine', 'Heavy-duty hammer mill for maize, sorghum and millet.', 540000, 10),
      P(5, 'Fabrication', 'Steel Workbench 2m', 'Welded frame with 6mm top plate and lower shelf.', 120000, 15),
      P(6, 'Fabrication', 'Industrial Gate Set', 'Custom swing gate, fabricated and finished to your size.', 310000, 12),
      P(7, 'Tools', 'Arc Welding Machine 400A', 'Dual-voltage inverter welder for steel fabrication.', 185000, 20),
      P(8, 'Tools', 'Mechanic Tool Set, 120 pieces', 'Chrome-vanadium spanners, sockets and drivers in a steel case.', 78000, 30),
      P(9, 'Farm and Home', 'Briquette Press', 'Turns sawdust and charcoal dust into clean-burning fuel blocks.', 260000, 7),
      P(10, 'Farm and Home', 'Solar Water Pump Kit', 'Pump, controller and mounting frame for boreholes and farms.', 390000, 9)
    ],
    orders: [], suggestions: []
  };
}
let db = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : seed();
const save = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
db.reviews = db.reviews || []; db.seq.review = db.seq.review || 1;
db.seq.product = db.seq.product || Math.max(0, ...db.products.map(x => x.id)) + 1;
save();
const prods = () => db.products.map(p => { const r = db.reviews.filter(x => x.productId === p.id);
  return { ...p, reviews: r.length, rating: r.length ? Math.round(r.reduce((a, b) => a + b.rating, 0) / r.length * 10) / 10 : 0 }; });

// Real-time: Server-Sent Events
const clients = new Set();
const broadcast = (event, data) => { for (const c of clients) c.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); };

const send = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
const readBody = req => new Promise((ok, no) => {
  let s = ''; req.on('data', d => { s += d; if (s.length > 1e5) { req.destroy(); no(new Error('Too large')); } });
  req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch { no(new Error('Invalid JSON')); } });
});
const readRaw = req => new Promise((ok, no) => { let s = ''; req.on('data', d => { s += d; if (s.length > 1e5) { req.destroy(); no(new Error('Too large')); } }); req.on('end', () => ok(s)); });
const paystack = async (p, opt = {}) => {
  const r = await fetch('https://api.paystack.co' + p, { ...opt, headers: { Authorization: 'Bearer ' + PAYSTACK, 'Content-Type': 'application/json' } });
  const d = await r.json().catch(() => ({})); if (!r.ok || !d.status) throw new Error(d.message || 'The payment service had a problem. Try again.'); return d.data;
};
const call = async (url, opt, bad) => {
  const r = await fetch(url, opt), d = await r.json().catch(() => ({}));
  if (!r.ok || bad(d)) throw new Error(d.message || d.responseMessage || 'The payment service had a problem. Try again.'); return d;
};
const flw = (p, opt = {}) => call('https://api.flutterwave.com/v3' + p, { ...opt, headers: { Authorization: 'Bearer ' + FLW, 'Content-Type': 'application/json' } }, d => d.status !== 'success').then(d => d.data);
async function monnify(p, opt = {}) {
  const t = await call(MON.base + '/api/v1/auth/login', { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(MON.key + ':' + MON.secret).toString('base64') } }, d => !d.requestSuccessful);
  return (await call(MON.base + p, { ...opt, headers: { Authorization: 'Bearer ' + t.responseBody.accessToken, 'Content-Type': 'application/json' } }, d => !d.requestSuccessful)).responseBody;
}
// Ask the provider directly whether a payment really succeeded (never trust the browser or a webhook alone)
async function remitaInit(o, ref, user, back) {
  const r = await fetch(REM.base + '/exapp/api/v1/send/api/echannelsvc/merchant/api/paymentinit', { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'remitaConsumerKey=' + REM.merchant + ',remitaConsumerToken=' + sha(REM.merchant + REM.service + ref + o.total + REM.key) },
    body: JSON.stringify({ serviceTypeId: REM.service, amount: o.total, orderId: ref, payerName: user.name, payerEmail: user.email, payerPhone: o.phone, description: 'SOLBATEC order #' + o.id }) });
  const t = await r.text(), d = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1) || '{}');
  if (!d.RRR) throw new Error(d.status || 'Remita could not create the payment. Try again.');
  return REM.base + '/ecomm/finalize.reg?merchantId=' + REM.merchant + '&hash=' + sha(REM.merchant + d.RRR + REM.key) + '&RRR=' + d.RRR + '&responseurl=' + encodeURIComponent(back);
}
async function lookup(provider, ref, id, o) {
  if (provider === 'remita') {
    const h = sha(ref + REM.key + REM.merchant), r = await fetch(REM.base + '/exapp/api/v1/send/api/echannelsvc/' + REM.merchant + '/' + encodeURIComponent(ref) + '/' + h + '/orderstatus.reg',
      { headers: { Authorization: 'remitaConsumerKey=' + REM.merchant + ',remitaConsumerToken=' + h } });
    const x = await r.text(), t = JSON.parse(x.slice(x.indexOf('{'), x.lastIndexOf('}') + 1) || '{}');
    return { ok: ['00', '01'].includes(String(t.status)), naira: Number(t.amount), currency: 'NGN' };
  }
  if (provider === 'interswitch') {
    const base = ISW.base || (ISW.live ? 'https://webpay.interswitchng.com' : 'https://qa.interswitchng.com');
    const r = await fetch(base + '/collections/api/v1/gettransaction.json?merchantcode=' + encodeURIComponent(ISW.code) + '&transactionreference=' + encodeURIComponent(ref) + '&amount=' + o.total * 100,
      { headers: ISW.mac ? { Hash: sha(ISW.item + ref + ISW.mac) } : {} });
    const t = await r.json().catch(() => ({}));
    return { ok: String(t.ResponseCode) === '00', naira: Number(t.Amount) / 100, currency: 'NGN' };
  }
  if (provider === 'paystack') { const t = await paystack('/transaction/verify/' + encodeURIComponent(ref)); return { ok: t.status === 'success', naira: t.amount / 100, currency: t.currency }; }
  if (provider === 'flutterwave') {
    const t = await flw(id ? '/transactions/' + encodeURIComponent(id) + '/verify' : '/transactions/verify_by_reference?tx_ref=' + encodeURIComponent(ref));
    return { ref: t.tx_ref, ok: t.status === 'successful', naira: t.amount, currency: t.currency };
  }
  const t = await monnify('/api/v2/merchant/transactions/query?paymentReference=' + encodeURIComponent(ref));
  return { ok: t.paymentStatus === 'PAID', naira: t.amountPaid, currency: t.currencyCode || 'NGN' };
}
function markPaid(ref, tx, by = 'paystack') {
  const o = db.orders.find(x => String(ref).startsWith('SOL-' + x.id + '-'));
  if (!o) return null; if (o.paid) return o;
  if (!tx.ok || tx.currency !== 'NGN' || Math.round(tx.naira * 100) !== o.total * 100) return null;
  o.paid = true; o.paidRef = ref; o.paidBy = by; save(); broadcast('order', { id: o.id, userId: o.userId, status: o.status }); return o;
}
// Safety net: re-check every payment attempt with the provider, so nothing depends on a webhook or on staff being online
async function checkOrder(o, id) {
  const list = [...(o.attempts || (o.payRef ? [{ ref: o.payRef, provider: o.payProvider }] : []))].reverse();
  for (let i = 0; i < list.length && !o.paid; i++) {
    try { const t = await lookup(list[i].provider, list[i].ref, i === 0 ? id : '', o); if (!t.ref || t.ref === list[i].ref) markPaid(list[i].ref, t, list[i].provider); } catch {}
  }
  return !!o.paid;
}
async function reconcile() { for (const o of db.orders.filter(x => !x.paid && x.status !== 'Cancelled' && (x.attempts || x.payRef) && Date.now() - new Date(x.created) < 3 * 864e5)) await checkOrder(o, ''); }
const EVERY = Number(process.env.RECONCILE_MS) || 5 * 60 * 1000;
setInterval(reconcile, EVERY); setTimeout(reconcile, Math.min(15000, EVERY));
const clean = (v, n) => String(v || '').trim().slice(0, n);
const pub = u => ({ id: u.id, name: u.name, email: u.email, role: u.role });

async function api(req, res, url) {
  const user = db.users.find(u => u.id === unsign((req.headers.authorization || '').replace('Bearer ', '')));
  const need = () => { if (!user) { send(res, 401, { error: 'Please log in first.' }); return false; } return true; };
  const m = req.method, p = url.pathname;

  if (m === 'GET' && p === '/api/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 3000\n\n'); clients.add(res); req.on('close', () => clients.delete(res)); return;
  }
  if (m === 'GET' && p === '/api/products') return send(res, 200, prods());
  const pm = p.match(/^\/api\/products\/(\d+)(\/reviews)?$/), pid = pm && Number(pm[1]);
  const adminOnly = () => { if (!need()) return false; if (!['admin', 'staff'].includes(user.role)) { send(res, 403, { error: 'Only staff can do this.' }); return false; } return true; };
  const fields = b => ({ name: clean(b.name, 80), category: clean(b.category, 40), description: clean(b.description, 400), price: Math.round(Number(b.price)), stock: Math.floor(Number(b.stock)) });
  const bad = f => (!f.name || !f.category || !(f.price > 0) || !(f.stock >= 0)) ? 'Enter a name, a category, a price above 0 and a stock of 0 or more.' : '';
  if (pm && pm[2] && m === 'GET') return send(res, 200, db.reviews.filter(r => r.productId === pid).reverse());
  if (pm && pm[2] && m === 'POST') {
    if (!need()) return;
    const b = await readBody(req), rating = Math.round(Number(b.rating));
    if (!db.products.some(x => x.id === pid)) return send(res, 404, { error: 'Product not found.' });
    if (!(rating >= 1 && rating <= 5)) return send(res, 400, { error: 'Choose a rating from 1 to 5 stars.' });
    db.reviews = db.reviews.filter(r => !(r.productId === pid && r.userId === user.id));
    db.reviews.push({ id: db.seq.review++, productId: pid, userId: user.id, name: user.name, rating, text: clean(b.text, 500), created: new Date().toISOString() });
    save(); broadcast('products', prods()); broadcast('review', { productId: pid }); return send(res, 201, { ok: true });
  }
  if (p === '/api/products' && m === 'POST') {
    if (!adminOnly()) return; const f = fields(await readBody(req)); if (bad(f)) return send(res, 400, { error: bad(f) });
    const np = { id: db.seq.product++, ...f }; db.products.push(np); save(); broadcast('products', prods()); return send(res, 201, np);
  }
  if (pm && !pm[2] && m === 'PUT') {
    if (!adminOnly()) return; const pr = db.products.find(x => x.id === pid), f = fields(await readBody(req));
    if (!pr) return send(res, 404, { error: 'Product not found.' }); if (bad(f)) return send(res, 400, { error: bad(f) });
    Object.assign(pr, f); save(); broadcast('products', prods()); return send(res, 200, pr);
  }
  if (pm && !pm[2] && m === 'DELETE') {
    if (!adminOnly()) return; db.products = db.products.filter(x => x.id !== pid); db.reviews = db.reviews.filter(r => r.productId !== pid);
    save(); broadcast('products', prods()); return send(res, 200, { ok: true });
  }

  if (m === 'POST' && (p === '/api/auth/register' || p === '/api/auth/login')) {
    const b = await readBody(req), email = clean(b.email, 80).toLowerCase(), pw = String(b.password || '');
    if (p.endsWith('register')) {
      const name = clean(b.name, 60);
      if (!name || !/^\S+@\S+\.\S+$/.test(email)) return send(res, 400, { error: 'Enter your name and a valid email.' });
      if (pw.length < 6) return send(res, 400, { error: 'Password must be at least 6 characters.' });
      if (db.users.some(u => u.email === email)) return send(res, 409, { error: 'That email already has an account. Log in instead.' });
      const u = { id: db.seq.user++, name, email, role: 'customer', pass: hashPw(pw) };
      db.users.push(u); save(); return send(res, 201, { token: sign(u.id), user: pub(u) });
    }
    const u = db.users.find(x => x.email === email);
    if (!u || !checkPw(pw, u.pass)) return send(res, 401, { error: 'Email or password is incorrect.' });
    return send(res, 200, { token: sign(u.id), user: pub(u) });
  }
  if (m === 'GET' && p === '/api/me') return need() && send(res, 200, pub(user));

  if (p === '/api/orders' && m === 'POST') {
    if (!need()) return;
    const b = await readBody(req), address = clean(b.address, 200), phone = clean(b.phone, 20);
    if (!address || !/^[+\d][\d\s-]{6,}$/.test(phone)) return send(res, 400, { error: 'Enter a delivery address and a valid phone number.' });
    if (!Array.isArray(b.items) || !b.items.length) return send(res, 400, { error: 'Your cart is empty.' });
    const lines = [];
    for (const it of b.items) {
      const prod = db.products.find(x => x.id === Number(it.id)), qty = Math.floor(Number(it.qty));
      if (!prod || qty < 1) return send(res, 400, { error: 'One of the items is not valid.' });
      if (qty > prod.stock) return send(res, 409, { error: `Only ${prod.stock} of ${prod.name} left in stock.` });
      lines.push({ prod, qty });
    }
    lines.forEach(l => l.prod.stock -= l.qty);
    const order = { id: db.seq.order++, userId: user.id, customer: user.name, address, phone, note: clean(b.note, 300), status: 'Received', paid: false, created: new Date().toISOString(),
      items: lines.map(l => ({ id: l.prod.id, name: l.prod.name, price: l.prod.price, qty: l.qty })), total: lines.reduce((s, l) => s + l.prod.price * l.qty, 0) };
    db.orders.unshift(order); save();
    broadcast('products', prods()); broadcast('order', { id: order.id, userId: order.userId, status: order.status });
    return send(res, 201, order);
  }
  if (p === '/api/orders' && m === 'GET') {
    if (!need()) return;
    return send(res, 200, ['admin', 'staff'].includes(user.role) ? db.orders : db.orders.filter(o => o.userId === user.id));
  }
  const om = p.match(/^\/api\/orders\/(\d+)$/);
  if (om && m === 'PATCH') {
    if (!need()) return;
    if (!['admin', 'staff'].includes(user.role)) return send(res, 403, { error: 'Only staff can update orders.' });
    const o = db.orders.find(x => x.id === Number(om[1])), b = await readBody(req);
    if (!o || (b.status === undefined && b.paid === undefined) || (b.status !== undefined && !STATUSES.includes(b.status))) return send(res, 400, { error: 'Order or status not valid.' });
    if (b.status === 'Cancelled' && o.status !== 'Cancelled') o.items.forEach(i => { const pr = db.products.find(x => x.id === i.id); if (pr) pr.stock += i.qty; });
    if (b.paid !== undefined) o.paid = !!b.paid; if (b.status) o.status = b.status; save(); broadcast('products', prods()); broadcast('order', { id: o.id, userId: o.userId, status: o.status });
    return send(res, 200, o);
  }
  if (p === '/api/suggestions' && m === 'GET') return send(res, 200, db.suggestions.slice(0, 50));
  if (p === '/api/suggestions' && m === 'POST') {
    if (!need()) return;
    const b = await readBody(req), text = clean(b.message, 500);
    if (text.length < 10) return send(res, 400, { error: 'Please write at least 10 characters.' });
    const s = { id: db.seq.suggestion++, name: user.name, topic: clean(b.topic, 40) || 'General', message: text, reply: '', created: new Date().toISOString() };
    db.suggestions.unshift(s); save(); broadcast('suggestion', s); return send(res, 201, s);
  }
  if (m === 'GET' && p === '/api/config') return send(res, 200, { providers: providers(), bank: BANK.number ? BANK : null });
  if (m === 'POST' && p === '/api/me/password') {
    if (!need()) return; const b = await readBody(req);
    if (!checkPw(String(b.current || ''), user.pass)) return send(res, 400, { error: 'Your current password is not correct.' });
    if (String(b.next || '').length < 6) return send(res, 400, { error: 'The new password must be at least 6 characters.' });
    user.pass = hashPw(String(b.next)); save(); return send(res, 200, { ok: true });
  }
  const sigOk = (a, b) => { a = String(a || ''); return !!b && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)); };
  const hook = p.match(/^\/api\/(paystack|flutterwave|monnify)\/webhook$/);
  if (m === 'POST' && hook) {
    const raw = await readRaw(req), hmac = k => k && crypto.createHmac('sha512', k).update(raw).digest('hex');
    let ev; try { ev = JSON.parse(raw); } catch { return send(res, 400, { error: 'Bad body.' }); }
    try {
      if (hook[1] === 'paystack') {
        if (!sigOk(req.headers['x-paystack-signature'], hmac(PAYSTACK))) return send(res, 401, { error: 'Bad signature.' });
        if (ev.event === 'charge.success') markPaid(ev.data.reference, { ok: true, naira: ev.data.amount / 100, currency: ev.data.currency }, 'paystack');
      } else if (hook[1] === 'flutterwave') {
        if (!sigOk(req.headers['verif-hash'], FLW_HASH)) return send(res, 401, { error: 'Bad signature.' });
        if (ev.event === 'charge.completed') { const t = await lookup('flutterwave', '', ev.data.id); markPaid(t.ref, t, 'flutterwave'); }
      } else {
        if (!sigOk(req.headers['monnify-signature'], hmac(MON.secret))) return send(res, 401, { error: 'Bad signature.' });
        if (ev.eventType === 'SUCCESSFUL_TRANSACTION') { const ref = ev.eventData.paymentReference; markPaid(ref, await lookup('monnify', ref), 'monnify'); }
      }
    } catch { return send(res, 500, { error: 'Could not process.' }); }
    return send(res, 200, { ok: true });
  }
  const pay = p.match(/^\/api\/orders\/(\d+)\/pay$/);
  if (pay && m === 'POST') {
    if (!need()) return; const b = await readBody(req), o = db.orders.find(x => x.id === Number(pay[1]) && x.userId === user.id), prov = String(b.provider || 'paystack');
    if (!o) return send(res, 404, { error: 'Order not found.' });
    if (o.paid || o.status === 'Cancelled') return send(res, 400, { error: 'This order does not need payment.' });
    if (!providers().includes(prov)) return send(res, 503, { error: 'That payment method is not set up yet. Please contact us to pay.' });
    const ref = 'SOL-' + o.id + '-' + crypto.randomBytes(5).toString('hex'), back = (process.env.SITE_URL || (req.headers['x-forwarded-proto'] || 'http') + '://' + req.headers.host) + '/pay-return/' + o.id;
    let link, post;
    if (prov === 'paystack') link = (await paystack('/transaction/initialize', { method: 'POST', body: JSON.stringify({ email: user.email, amount: o.total * 100, currency: 'NGN', reference: ref, callback_url: back }) })).authorization_url;
    else if (prov === 'flutterwave') link = (await flw('/payments', { method: 'POST', body: JSON.stringify({ tx_ref: ref, amount: o.total, currency: 'NGN', redirect_url: back,
      customer: { email: user.email, name: user.name, phonenumber: o.phone }, customizations: { title: 'SOLBATEC Industries', description: 'Order #' + o.id } }) })).link;
    else if (prov === 'remita') link = await remitaInit(o, ref, user, back);
    else if (prov === 'interswitch') post = { url: ISW.live ? 'https://newwebpay.interswitchng.com/collections/w/pay' : 'https://newwebpay.qa.interswitchng.com/collections/w/pay',
      fields: { merchant_code: ISW.code, pay_item_id: ISW.item, txn_ref: ref, amount: String(o.total * 100), currency: '566', site_redirect_url: back, cust_email: user.email, cust_name: user.name, pay_item_name: 'SOLBATEC order #' + o.id } };
    else link = (await monnify('/api/v1/merchant/transactions/init-transaction', { method: 'POST', body: JSON.stringify({ amount: o.total, customerName: user.name, customerEmail: user.email,
      paymentReference: ref, paymentDescription: 'SOLBATEC order #' + o.id, currencyCode: 'NGN', contractCode: MON.contract, redirectUrl: back, paymentMethods: ['CARD', 'ACCOUNT_TRANSFER'] }) })).checkoutUrl;
    o.payRef = ref; o.payProvider = prov; (o.attempts = o.attempts || []).push({ ref, provider: prov }); save(); return send(res, 200, { url: link, post });
  }
  const tr = p.match(/^\/api\/orders\/(\d+)\/transfer$/);
  if (tr && m === 'POST') {
    if (!need()) return; const o = db.orders.find(x => x.id === Number(tr[1]) && x.userId === user.id);
    if (!o || o.paid || o.status === 'Cancelled') return send(res, 400, { error: 'This order does not need payment.' });
    o.transferClaimed = true; o.transferNote = clean((await readBody(req)).note, 100); save();
    broadcast('order', { id: o.id, userId: o.userId, status: o.status }); return send(res, 200, { ok: true });
  }
  if (m === 'GET' && p === '/api/pay/verify') {
    if (!need()) return; const o = db.orders.find(x => x.id === Number(url.searchParams.get('order')));
    if (!o || (o.userId !== user.id && !['admin', 'staff'].includes(user.role))) return send(res, 404, { error: 'Payment not found.' });
    if (!o.paid) await checkOrder(o, url.searchParams.get('id'));
    return send(res, 200, { paid: !!o.paid, orderId: o.id });
  }
  if (p === '/api/users' && m === 'GET') {
    if (!need()) return; if (user.role !== 'admin') return send(res, 403, { error: 'Only the owner can manage staff access.' });
    return send(res, 200, db.users.map(pub));
  }
  const um = p.match(/^\/api\/users\/(\d+)$/);
  if (um && m === 'PATCH') {
    if (!need()) return; if (user.role !== 'admin') return send(res, 403, { error: 'Only the owner can manage staff access.' });
    const u = db.users.find(x => x.id === Number(um[1])), role = (await readBody(req)).role;
    if (!u || u.role === 'admin' || !['staff', 'customer'].includes(role)) return send(res, 400, { error: 'That change is not allowed.' });
    u.role = role; save(); broadcast('role', { id: u.id, role }); return send(res, 200, pub(u));
  }
  const sm = p.match(/^\/api\/suggestions\/(\d+)$/);
  if (sm && m === 'PATCH') {
    if (!adminOnly()) return; const s = db.suggestions.find(x => x.id === Number(sm[1])), reply = clean((await readBody(req)).reply, 500);
    if (!s || !reply) return send(res, 400, { error: 'Write a reply first.' });
    s.reply = reply; s.repliedAt = new Date().toISOString(); save(); broadcast('suggestion', { id: s.id }); return send(res, 200, s);
  }
  send(res, 404, { error: 'Not found' });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    const PUB = path.join(__dirname, 'public'), file = path.join(PUB, path.normalize(decodeURIComponent(url.pathname)));
    if (url.pathname.length > 1 && file.startsWith(PUB + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      const types = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' });
      return res.end(fs.readFileSync(file));
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(path.join(PUB, 'index.html')));
  } catch (e) { send(res, 400, { error: e.message === 'fetch failed' ? 'Could not reach the payment service. Please try again in a moment.' : e.message }); }
}).listen(PORT, () => console.log(`SOLBATEC Industries running at http://localhost:${PORT} | payments: ${providers().join(', ') || 'none'} | data file ${DB_FILE}`));
