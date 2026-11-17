"use strict";
const { useState, useEffect, useRef } = React, html = htm.bind(React.createElement);
const N = n => '₦' + Number(n).toLocaleString('en-NG');
async function api(p, o = {}) {
  const t = localStorage.token, r = await fetch('/api' + p, { method: o.method || 'GET', headers: { 'Content-Type': 'application/json', ...(t && { Authorization: 'Bearer ' + t }) }, body: o.body && JSON.stringify(o.body) });
  const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Something went wrong. Try again.'); return d;
}
const useHash = () => { const g = () => location.hash.slice(2).split('/'), [h, s] = useState(g);
  useEffect(() => { const f = () => { s(g()); scrollTo(0, 0); }; addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []); return h; };

/* ---------- drawing pieces ---------- */
const gearPath = (cx, cy, ro, ri, n) => { let d = ''; const st = 2 * Math.PI / n, P = (r, a) => (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1);
  for (let i = 0; i < n; i++) { const a = i * st; d += (i ? 'L' : 'M') + P(ri, a) + 'L' + P(ro, a + st * .14) + 'L' + P(ro, a + st * .4) + 'L' + P(ri, a + st * .54); } return d + 'Z'; };
const GL = { Machines: `<path d="${gearPath(24, 24, 19, 15, 10)}"/><circle cx="24" cy="24" r="6"/>`, Fabrication: '<path d="M6 9h36v6H28v18h14v6H6v-6h14V15H6z"/>',
  Tools: '<rect x="8" y="7" width="26" height="11" rx="2"/><rect x="19" y="18" width="7" height="24" rx="2"/>', 'Farm and Home': '<path d="M24 42V22M24 24c0-9-6-13-15-13 0 9 6 13 15 13zM24 30c0-7 5-11 14-11 0 7-5 11-14 11z"/>' };
const Glyph = ({ c }) => html`<svg className="gl" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true" dangerouslySetInnerHTML=${{ __html: GL[c] || GL.Machines }} />`;
const Tile = ({ p, big }) => html`<div className=${'tile' + (big ? ' big' : '')} aria-hidden="true"><${Glyph} c=${p.category} /><span>SB-${String(p.id).padStart(3, '0')}</span></div>`;
const sd = d => `class="dr" pathLength="1" style="animation-delay:${d}s"`;
const HERO = `<svg viewBox="0 0 520 340" role="img" aria-label="Engineering drawing of two meshing gears" fill="none" stroke="currentColor" stroke-width="2">
<path ${sd(0)} d="${gearPath(190, 170, 110, 92, 16)}"/><path ${sd(.4)} d="${gearPath(313, 84, 52, 42, 8)}"/><circle ${sd(.8)} cx="190" cy="170" r="62"/><circle ${sd(1)} cx="190" cy="170" r="16"/><circle ${sd(1)} cx="313" cy="84" r="12"/>
<g stroke-width="1" stroke-dasharray="14 4 3 4" opacity=".55"><line x1="60" y1="170" x2="320" y2="170"/><line x1="190" y1="40" x2="190" y2="300"/></g>
<g style="stroke:var(--bs-primary)" stroke-width="1.5"><line x1="80" y1="290" x2="80" y2="322"/><line x1="300" y1="290" x2="300" y2="322"/><line x1="80" y1="314" x2="300" y2="314"/><path style="fill:var(--bs-primary)" d="M80 314l9-4v8zM300 314l-9-4v8z"/></g>
<text x="190" y="306" text-anchor="middle" stroke="none" style="fill:var(--bs-primary);font:600 14px var(--hd)">Ø 220</text>
<g stroke-width="1.2"><line x1="357" y1="60" x2="420" y2="36"/><line x1="250" y1="212" x2="340" y2="262"/></g>
<g stroke="none" fill="currentColor" style="font:600 13px var(--hd)"><text x="424" y="40">Drive pinion</text><text x="344" y="267">Main gear, 16 teeth</text></g></svg>`;

/* ---------- small shared components ---------- */
const Stars = ({ r, n }) => html`<span><span className="text-warning" aria-label=${r + ' out of 5'}>${'★'.repeat(Math.round(r))}${'☆'.repeat(5 - Math.round(r))}</span>${n != null ? html` <small className="text-body-secondary">${n ? r + ' (' + n + ')' : 'No reviews yet'}</small>` : ''}</span>`;
const Stock = ({ p }) => p.stock < 1 ? html`<small className="fw-semibold text-danger">Out of stock</small>` : p.stock <= 3 ? html`<small className="fw-semibold text-warning-emphasis">Only ${p.stock} left</small>` : html`<small className="fw-semibold text-success">${p.stock} in stock</small>`;
const Card = ({ p, add }) => html`<div className="col"><div className="card h-100"><a href=${'#/product/' + p.id} className="position-relative d-block p-2 pb-0" aria-label=${p.name}><${Tile} p=${p} />
  ${p.stock < 1 ? html`<span className="badge text-bg-danger position-absolute" style=${{ left: 18, bottom: 10 }}>Sold out</span>` : p.stock <= 3 ? html`<span className="badge text-bg-warning position-absolute" style=${{ left: 18, bottom: 10 }}>Only ${p.stock} left</span>` : ''}</a>
  <div className="card-body d-flex flex-column gap-1"><small className="text-primary fw-semibold">${p.category}</small><h3 className="h6 mb-0"><a className="text-body text-decoration-none" href=${'#/product/' + p.id}>${p.name}</a></h3><${Stars} r=${p.rating} n=${p.reviews} />
  <div className="d-flex justify-content-between align-items-center mt-auto pt-2"><span className="fs-5 fw-bold">${N(p.price)}</span><button className="btn btn-brand btn-sm" disabled=${p.stock < 1} onClick=${() => add(p.id, 1)}>Add to cart</button></div><${Stock} p=${p} /></div></div></div>`;
const Grid = ({ list, add }) => html`<div className="row row-cols-1 row-cols-sm-2 row-cols-xl-3 g-3">${list.map(p => html`<${Card} key=${p.id} p=${p} add=${add} />`)}</div>`;
const Need = ({ what }) => html`<div className="py-4"><h2>Please log in</h2><p>Log in to ${what}.</p><a className="btn btn-brand" href="#/login">Log in or sign up</a></div>`;
const Field = ({ label, id, ...p }) => html`<div className="mb-3"><label htmlFor=${id} className="form-label fw-semibold">${label}</label><input id=${id} className="form-control" ...${p} /></div>`;

/* ---------- pages ---------- */
function Home({ c }) {
  const P = c.products, cs = [...new Set(P.map(p => p.category))], top = [...P].sort((a, b) => b.rating - a.rating || b.stock - a.stock).slice(0, 4);
  return html`<section className="row align-items-center g-4 py-2"><div className="col-lg-5"><h1 className="display-4 fw-bold">Tools and machines, built in Jos.</h1>
    <p className="lead text-body-secondary">SOLBATEC Industries makes workshop machines, farm equipment and hand tools. Order online, pay securely and follow your order until it is ready.</p>
    <div className="d-flex gap-2 flex-wrap"><a className="btn btn-brand btn-lg" href="#/products">Shop products</a><a className="btn btn-outline-secondary btn-lg" href="#/suggest">Suggest a product</a></div></div>
    <div className="col-lg-7"><figure className="sheet m-0"><div dangerouslySetInnerHTML=${{ __html: HERO }} /><div className="tb row g-0">
      <div className="col-4"><small>Products listed</small><b>${P.length}</b></div><div className="col-4"><small>Units ready now</small><b>${P.reduce((a, p) => a + p.stock, 0).toLocaleString()}</b></div><div className="col-4"><small>Categories</small><b>${cs.length}</b></div>
      <div className="col-12"><small>Built by</small><b className="fs-6">SOLBATEC Industries, Bukuru Express Road, Jos</b></div></div></figure></div></section>
    <div className="row strip g-0 border-top border-bottom my-4">${[['Made in Jos', 'Machines and tools from our own workshop.'], ['Pay your way', 'Card or bank transfer.'], ['Track every order', 'Watch the status change live.'], ['Need something else?', 'Send us a suggestion.']].map(([a, b]) => html`<div className="col-6 col-md-3 text-body-secondary" key=${a}><b className="text-body">${a}</b>${b}</div>`)}</div>
    <h2 className="mb-3">Shop by category</h2><div className="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-3 mb-5">${cs.map(k => html`<div className="col" key=${k}><a href="#/products" className="cat card flex-row align-items-center gap-3 p-3 text-body text-decoration-none" onClick=${() => c.setF({ cat: k })}><${Glyph} c=${k} /><div><b className="d-block brand fs-6">${k}</b><small className="text-body-secondary">${P.filter(p => p.category === k).length} products</small></div></a></div>`)}</div>
    <h2 className="mb-3">Top rated</h2><${Grid} list=${top} add=${c.addCart} />`;
}

function Products({ c }) {
  const f = c.f, P = c.products, cats = [...new Set(P.map(p => p.category))], q = f.q.toLowerCase();
  const so = { pa: (a, b) => a.price - b.price, pd: (a, b) => b.price - a.price, rt: (a, b) => b.rating - a.rating, nm: (a, b) => a.name.localeCompare(b.name) }[f.sort];
  const list = P.filter(p => (!f.cat || p.category === f.cat) && (p.name + ' ' + p.description + ' ' + p.category).toLowerCase().includes(q) && (!f.max || p.price <= +f.max) && (!f.stock || p.stock > 0) && p.rating >= f.rate);
  if (so) list.sort(so);
  return html`<div className="row g-4"><aside className="col-lg-3"><div className="card side"><div className="card-body"><h3 className="h6">Category</h3>
    ${['', ...cats].map(k => html`<div className="form-check" key=${k}><input className="form-check-input" type="radio" name="cat" id=${'c' + k} checked=${f.cat === k} onChange=${() => c.setF({ cat: k })} /><label className="form-check-label" htmlFor=${'c' + k}>${k || 'All'}</label></div>`)}
    <h3 className="h6 mt-3">Maximum price (₦)</h3><input className="form-control" type="number" min="0" placeholder="No limit" value=${f.max} onChange=${e => c.setF({ max: e.target.value })} aria-label="Maximum price" />
    <h3 className="h6 mt-3">Rating</h3><select className="form-select" value=${f.rate} onChange=${e => c.setF({ rate: +e.target.value })} aria-label="Minimum rating"><option value="0">Any</option>${[4, 3, 2].map(n => html`<option key=${n} value=${n}>${n} stars and up</option>`)}</select>
    <div className="form-check form-switch mt-3"><input className="form-check-input" type="checkbox" id="st" checked=${f.stock} onChange=${e => c.setF({ stock: e.target.checked })} /><label className="form-check-label" htmlFor="st">In stock only</label></div>
    <button className="btn btn-outline-secondary btn-sm mt-3" onClick=${() => c.setF({ q: '', cat: '', sort: 'rel', max: '', stock: false, rate: 0 })}>Clear filters</button></div></div></aside>
    <section className="col-lg-9"><div className="d-flex justify-content-between align-items-center mb-3 gap-2"><h2 className="h4 mb-0">${list.length} ${list.length === 1 ? 'product' : 'products'}${f.q ? ' for “' + f.q + '”' : ''}</h2>
    <select className="form-select w-auto" value=${f.sort} onChange=${e => c.setF({ sort: e.target.value })} aria-label="Sort by"><option value="rel">Featured</option><option value="pa">Price: low to high</option><option value="pd">Price: high to low</option><option value="rt">Best rated</option><option value="nm">Name A to Z</option></select></div>
    ${list.length ? html`<${Grid} list=${list} add=${c.addCart} />` : html`<p>No products match. Clear a filter or try a different word.</p>`}</section></div>`;
}

function Product({ c, id }) {
  const p = c.products.find(x => x.id === +id), [qty, setQty] = useState(1), [rs, setRs] = useState([]), [rv, setRv] = useState({ rating: 5, text: '' });
  useEffect(() => { api('/products/' + id + '/reviews').then(setRs).catch(() => {}); }, [id, c.tick]);
  if (!p) return html`<h2>Product not found</h2><p>It may have been removed.</p><a className="btn btn-brand" href="#/products">Back to products</a>`;
  const post = async e => { e.preventDefault(); try { await api('/products/' + id + '/reviews', { method: 'POST', body: rv }); setRv({ rating: 5, text: '' }); c.toast('Thanks for your review.'); } catch (x) { c.toast(x.message); } };
  return html`<nav aria-label="breadcrumb"><ol className="breadcrumb"><li className="breadcrumb-item"><a href="#/products">Products</a></li><li className="breadcrumb-item">${p.category}</li><li className="breadcrumb-item active">${p.name}</li></ol></nav>
    <div className="row g-4"><div className="col-md-6"><${Tile} p=${p} big=${true} /></div><div className="col-md-6"><h1 className="h2">${p.name}</h1><${Stars} r=${p.rating} n=${p.reviews} /><div className="display-6 fw-bold my-2">${N(p.price)}</div><p>${p.description}</p><${Stock} p=${p} />
      <div className="d-flex gap-2 flex-wrap mt-3 align-items-center"><input className="form-control w-auto" style=${{ width: 90 }} type="number" min="1" max=${Math.max(p.stock, 1)} value=${qty} onChange=${e => setQty(Math.max(1, +e.target.value || 1))} aria-label="Quantity" />
      <button className="btn btn-brand" disabled=${p.stock < 1} onClick=${() => c.addCart(p.id, qty)}>Add to cart</button><a className="btn btn-outline-secondary" href="#/cart">Go to cart</a></div></div></div>
    <h2 className="h4 mt-5 mb-3">Customer reviews</h2><div className="row g-4"><div className="col-md-7">${rs.length ? rs.map(r => html`<div className="card mb-2" key=${r.id}><div className="card-body py-2"><${Stars} r=${r.rating} /><div>${r.text}</div><small className="text-body-secondary">${r.name}, ${new Date(r.created).toLocaleDateString()}</small></div></div>`) : html`<p className="text-body-secondary">No reviews yet. Be the first to rate it.</p>`}</div>
    <div className="col-md-5">${c.user ? html`<form onSubmit=${post} className="card card-body"><h3 className="h6">Rate this product</h3><label htmlFor="ra" className="form-label">Your rating</label><select id="ra" className="form-select mb-2" value=${rv.rating} onChange=${e => setRv({ ...rv, rating: e.target.value })}>${[5, 4, 3, 2, 1].map(n => html`<option key=${n} value=${n}>${n} ${n === 1 ? 'star' : 'stars'}</option>`)}</select>
      <label htmlFor="rt" className="form-label">Your review (optional)</label><textarea id="rt" className="form-control mb-2" rows="3" value=${rv.text} onChange=${e => setRv({ ...rv, text: e.target.value })}></textarea><button className="btn btn-brand">Post review</button></form>` : html`<p>Log in to rate this product.</p><a className="btn btn-brand" href="#/login">Log in</a>`}</div></div>`;
}

function Cart({ c }) {
  const [f, setF] = useState({ address: '', phone: '', note: '' }), total = c.rows.reduce((s, r) => s + r.p.price * r.q, 0);
  if (!c.rows.length) return html`<h2>Your cart is empty</h2><p>Add a machine or tool to get started.</p><a className="btn btn-brand" href="#/products">Browse products</a>`;
  const go = async e => { e.preventDefault(); try { await api('/orders', { method: 'POST', body: { items: c.rows.map(r => ({ id: r.p.id, qty: r.q })), ...f } }); c.setCart({}); c.toast('Order placed. Follow its status here.'); location.hash = '#/orders'; } catch (x) { c.toast(x.message); } };
  const set = k => e => setF({ ...f, [k]: e.target.value });
  return html`<h2 className="mb-3">Your cart</h2><div className="row g-4"><div className="col-lg-7"><${CartLines} c=${c} /><p className="fs-4 fw-bold mt-3">Total: ${N(total)}</p></div>
    <div className="col-lg-5"><form className="card card-body" onSubmit=${go}><h3 className="h5">Delivery details</h3>${c.user ? html`<div><div className="mb-3"><label htmlFor="ad" className="form-label fw-semibold">Delivery address</label><textarea id="ad" className="form-control" rows="2" required value=${f.address} onChange=${set('address')}></textarea></div>
      <${Field} label="Phone number" id="ph" type="tel" required placeholder="0803 000 0000" value=${f.phone} onChange=${set('phone')} /><${Field} label="Note (optional)" id="nt" placeholder="Size, colour, delivery time" value=${f.note} onChange=${set('note')} /><button className="btn btn-brand w-100">Place order</button></div>` : html`<div><p>Log in to place your order. Your cart stays saved.</p><a className="btn btn-brand" href="#/login">Log in or sign up</a></div>`}</form></div></div>`;
}
const CartLines = ({ c }) => html`<ul className="list-group">${c.rows.map(r => html`<li className="list-group-item d-flex justify-content-between align-items-center gap-2 flex-wrap" key=${r.p.id}><div><a href=${'#/product/' + r.p.id} className="fw-semibold">${r.p.name}</a><br /><small className="text-body-secondary">${N(r.p.price)} each</small> <${Stock} p=${r.p} /></div>
  <div className="btn-group btn-group-sm"><button className="btn btn-outline-secondary" aria-label="Remove one" onClick=${() => c.step(r.p.id, -1)}>−</button><span className="btn disabled fw-bold">${r.q}</span><button className="btn btn-outline-secondary" aria-label="Add one" onClick=${() => c.step(r.p.id, 1)}>+</button></div></li>`)}</ul>`;

const STEPS = ['Received', 'In production', 'Ready for pickup', 'Delivered'], PN = { paystack: 'Paystack', flutterwave: 'Flutterwave', monnify: 'Monnify', remita: 'Remita', interswitch: 'Interswitch' };
function Order({ o, c }) {
  const [show, setShow] = useState(false), [note, setNote] = useState(''), bk = c.cfg.bank, run = async f => { try { await f(); } catch (e) { c.toast(e.message); } };
  const pay = p => run(async () => { const d = await api('/orders/' + o.id + '/pay', { method: 'POST', body: { provider: p } });
    if (d.post) { const f = document.createElement('form'); f.method = 'post'; f.action = d.post.url; Object.entries(d.post.fields).forEach(([k, v]) => { const i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = v; f.appendChild(i); }); document.body.appendChild(f); f.submit(); } else location.href = d.url; });
  const patch = body => run(async () => { await api('/orders/' + o.id, { method: 'PATCH', body }); c.toast('Updated'); });
  const open = !o.paid && o.status !== 'Cancelled';
  return html`<div className="card mb-3"><div className="card-body"><div className="d-flex justify-content-between align-items-center flex-wrap gap-2"><h3 className="h5 mb-0">Order #${o.id}</h3>
    ${c.staff ? html`<select className="form-select form-select-sm w-auto" value=${o.status} aria-label="Order status" onChange=${e => patch({ status: e.target.value })}>${['Received', 'In production', 'Ready for pickup', 'Delivered', 'Cancelled'].map(s => html`<option key=${s}>${s}</option>`)}</select>` : html`<span className="badge text-bg-secondary">${o.status}</span>`}</div>
    ${o.status === 'Cancelled' ? html`<p><span className="badge text-bg-danger">Cancelled</span></p>` : html`<ol className="steps" aria-label="Order progress">${STEPS.map((s, i) => html`<li key=${s} className=${i <= STEPS.indexOf(o.status) ? 'done' : ''}><i></i>${s}</li>`)}</ol>`}
    <small className="text-body-secondary d-block">${new Date(o.created).toLocaleString()}${c.staff ? ' · ' + o.customer + ' · ' + o.phone : ''}</small>
    <div className="my-2">${o.items.map(i => html`<div key=${i.id}>${i.qty} × ${i.name}</div>`)}</div><small className="text-body-secondary d-block">Deliver to: ${o.address}${o.note ? ' · Note: ' + o.note : ''}</small>
    <div className="fs-5 fw-bold mt-2">${N(o.total)} <span className=${'badge ' + (o.paid ? 'text-bg-success' : 'text-bg-secondary')}>${o.paid ? 'Paid' : 'Unpaid'}</span></div>
    ${c.staff ? html`<div className="mt-2">${o.transferClaimed && !o.paid ? html`<div className="alert alert-warning py-2">Customer says they paid by bank transfer.${o.transferNote ? ' Note: ' + o.transferNote : ''}</div>` : ''}<button className="btn btn-outline-secondary btn-sm" onClick=${() => patch({ paid: !o.paid })}>${o.paid ? 'Mark as unpaid' : 'Mark as paid'}</button></div>`
      : open ? html`<div className="mt-2 d-flex gap-2 flex-wrap">${(c.cfg.providers || []).map(p => html`<button key=${p} className="btn btn-brand btn-sm" onClick=${() => pay(p)}>Pay online with ${PN[p]} (card or bank transfer)</button>`)}${bk ? html`<button className="btn btn-outline-secondary btn-sm" onClick=${() => setShow(!show)}>Manual bank transfer (checked by our team)</button>` : ''}</div>
      ${bk && show ? html`<div className="alert alert-light border mt-2 mb-0"><b>Transfer ${N(o.total)} to:</b><br />${bk.bank}<br />Account number: <b>${bk.number}</b><br />Account name: ${bk.name}<br />Use this reference: <b>SOLBATEC-${o.id}</b>
        ${o.transferClaimed ? html`<div className="mt-2 fst-italic">You told us you have paid. We will confirm it soon.</div>` : html`<div className="mt-2"><label htmlFor=${'tn' + o.id} className="form-label fw-semibold">Sender name or transfer reference</label><input id=${'tn' + o.id} className="form-control mb-2" maxLength="100" value=${note} onChange=${e => setNote(e.target.value)} /><button className="btn btn-brand btn-sm" onClick=${() => run(async () => { await api('/orders/' + o.id + '/transfer', { method: 'POST', body: { note } }); c.toast('Thank you. We will confirm your transfer.'); })}>I have paid</button></div>`}</div>` : ''}` : ''}</div></div>`;
}
function Orders({ c }) {
  const [os, setOs] = useState(null), [err, setErr] = useState('');
  useEffect(() => { if (c.user) api('/orders').then(setOs).catch(e => setErr(e.message)); }, [c.user, c.tick]);
  if (!c.user) return html`<${Need} what="see your orders" />`;
  return html`<h2 className="mb-3">${c.staff ? 'All orders' : 'My orders'}</h2>${err ? html`<div className="alert alert-danger">${err}</div>` : ''}${os && !os.length ? html`<p>No orders yet. <a href="#/products">Browse products</a></p>` : ''}${(os || []).map(o => html`<${Order} key=${o.id} o=${o} c=${c} />`)}`;
}

function SItem({ s, c }) {
  const [r, setR] = useState(s.reply || '');
  const save = async () => { try { await api('/suggestions/' + s.id, { method: 'PATCH', body: { reply: r } }); c.toast('Reply sent'); } catch (e) { c.toast(e.message); } };
  return html`<div className="card mb-2"><div className="card-body py-2"><small className="text-primary fw-semibold">${s.topic}</small><div>${s.message}</div><small className="text-body-secondary">${s.name}, ${new Date(s.created).toLocaleDateString()}</small>
    ${s.reply && !c.staff ? html`<div className="border-start border-warning border-4 ps-2 mt-2"><b>SOLBATEC replied:</b> ${s.reply}</div>` : ''}
    ${c.staff ? html`<div className="mt-2"><textarea className="form-control mb-1" rows="2" placeholder="Write a reply" aria-label=${'Reply to ' + s.name} value=${r} onChange=${e => setR(e.target.value)}></textarea><button className="btn btn-brand btn-sm" onClick=${save}>${s.reply ? 'Update reply' : 'Send reply'}</button></div>` : ''}</div></div>`;
}
function Suggest({ c }) {
  const [list, setList] = useState([]), [f, setF] = useState({ topic: 'New product', message: '' });
  useEffect(() => { api('/suggestions').then(setList).catch(() => {}); }, [c.tick]);
  const send = async e => { e.preventDefault(); try { await api('/suggestions', { method: 'POST', body: f }); setF({ ...f, message: '' }); c.toast('Thank you. Your suggestion was sent.'); } catch (x) { c.toast(x.message); } };
  return html`<h2 className="mb-3">Suggestions</h2><div className="row g-4"><div className="col-md-6"><p>${c.staff ? 'Read customer suggestions and reply. Replies show publicly under each suggestion.' : 'Need a machine we do not make yet, or a change to one we do? Tell us. Our team replies right here.'}</p>
    ${c.user && !c.staff ? html`<form onSubmit=${send} className="card card-body"><label htmlFor="tp" className="form-label fw-semibold">Topic</label><select id="tp" className="form-select mb-2" value=${f.topic} onChange=${e => setF({ ...f, topic: e.target.value })}><option>New product</option><option>Improve a product</option><option>Website</option><option>Other</option></select>
      <label htmlFor="ms" className="form-label fw-semibold">Your suggestion</label><textarea id="ms" className="form-control mb-2" rows="4" required minLength="10" value=${f.message} onChange=${e => setF({ ...f, message: e.target.value })}></textarea><button className="btn btn-brand">Send suggestion</button></form>` : !c.user ? html`<a className="btn btn-brand" href="#/login">Log in to send a suggestion</a>` : ''}</div>
    <div className="col-md-6"><h3 className="h5">Recent suggestions</h3>${list.length ? list.map(s => html`<${SItem} key=${s.id} s=${s} c=${c} />`) : html`<p className="text-body-secondary">No suggestions yet.</p>`}</div></div>`;
}

function Login({ c }) {
  const [reg, setReg] = useState(false), [f, setF] = useState({ name: '', email: '', password: '' }), set = k => e => setF({ ...f, [k]: e.target.value });
  const go = async e => { e.preventDefault(); try { const d = await api('/auth/' + (reg ? 'register' : 'login'), { method: 'POST', body: f }); c.signIn(d); c.toast('Welcome, ' + d.user.name.split(' ')[0]); location.hash = ['admin', 'staff'].includes(d.user.role) ? '#/admin' : c.rows.length ? '#/cart' : '#/products'; } catch (x) { c.toast(x.message); } };
  return html`<div className="mx-auto" style=${{ maxWidth: 440 }}><h2>${reg ? 'Create your account' : 'Log in'}</h2><form onSubmit=${go} className="card card-body">${reg ? html`<${Field} label="Full name" id="nm" required autoComplete="name" value=${f.name} onChange=${set('name')} />` : ''}
    <${Field} label="Email" id="em" type="email" required autoComplete="email" value=${f.email} onChange=${set('email')} /><${Field} label="Password" id="pw" type="password" required minLength="6" autoComplete=${reg ? 'new-password' : 'current-password'} value=${f.password} onChange=${set('password')} />
    <div className="d-flex gap-2"><button className="btn btn-brand">${reg ? 'Sign up' : 'Log in'}</button><button type="button" className="btn btn-outline-secondary" onClick=${() => setReg(!reg)}>${reg ? 'I have an account' : 'Create an account'}</button></div></form></div>`;
}
function Account({ c }) {
  const [f, setF] = useState({ cur: '', nw: '', n2: '' }), set = k => e => setF({ ...f, [k]: e.target.value });
  if (!c.user) return html`<${Need} what="see your account" />`;
  const go = async e => { e.preventDefault(); if (f.nw !== f.n2) return c.toast('The new passwords do not match.'); try { await api('/me/password', { method: 'POST', body: { current: f.cur, next: f.nw } }); setF({ cur: '', nw: '', n2: '' }); c.toast('Password changed.'); } catch (x) { c.toast(x.message); } };
  return html`<h2>My account</h2><p><b>${c.user.name}</b><br /><small className="text-body-secondary">${c.user.email}, ${c.user.role === 'admin' ? 'Owner' : c.user.role === 'staff' ? 'Staff' : 'Customer'}</small></p>
    <form onSubmit=${go} className="card card-body" style=${{ maxWidth: 440 }}><h3 className="h5">Change password</h3><${Field} label="Current password" id="cp" type="password" required autoComplete="current-password" value=${f.cur} onChange=${set('cur')} />
    <${Field} label="New password (6 or more characters)" id="np" type="password" required minLength="6" autoComplete="new-password" value=${f.nw} onChange=${set('nw')} /><${Field} label="Repeat new password" id="n2" type="password" required minLength="6" autoComplete="new-password" value=${f.n2} onChange=${set('n2')} /><button className="btn btn-brand align-self-start">Change password</button></form>`;
}

const EMPTY = { id: '', name: '', category: '', price: '', stock: '', description: '' };
function Manage({ c }) {
  const [f, setF] = useState(EMPTY), set = k => e => setF({ ...f, [k]: e.target.value });
  if (!c.staff) return html`<h2>Staff only</h2><p>Log in with a staff or owner account to manage products.</p><a className="btn btn-brand" href="#/login">Log in</a>`;
  const save = async e => { e.preventDefault(); try { await api('/products' + (f.id ? '/' + f.id : ''), { method: f.id ? 'PUT' : 'POST', body: f }); c.toast(f.id ? 'Product updated' : 'Product added'); setF(EMPTY); } catch (x) { c.toast(x.message); } };
  const del = async p => { if (!confirm('Delete ' + p.name + '? This also removes its reviews.')) return; try { await api('/products/' + p.id, { method: 'DELETE' }); c.toast('Product deleted'); } catch (x) { c.toast(x.message); } };
  return html`<h2 className="mb-3">Manage products</h2><div className="row g-4"><div className="col-lg-4"><form onSubmit=${save} className="card card-body"><h3 className="h5">${f.id ? 'Edit product' : 'Add a product'}</h3>
    <${Field} label="Name" id="pn" required value=${f.name} onChange=${set('name')} /><${Field} label="Category" id="pc" required list="cl" value=${f.category} onChange=${set('category')} /><datalist id="cl">${[...new Set(c.products.map(p => p.category))].map(k => html`<option key=${k} value=${k} />`)}</datalist>
    <${Field} label="Price (₦)" id="pp" type="number" min="1" required value=${f.price} onChange=${set('price')} /><${Field} label="Units in stock" id="ps" type="number" min="0" required value=${f.stock} onChange=${set('stock')} />
    <div className="mb-3"><label htmlFor="pd" className="form-label fw-semibold">Description</label><textarea id="pd" className="form-control" rows="3" value=${f.description} onChange=${set('description')}></textarea></div>
    <div className="d-flex gap-2"><button className="btn btn-brand">${f.id ? 'Save changes' : 'Add product'}</button><button type="button" className="btn btn-outline-secondary" onClick=${() => setF(EMPTY)}>Clear</button></div></form></div>
    <div className="col-lg-8 table-responsive"><table className="table align-middle"><thead><tr><th>Product</th><th>Price</th><th>Stock</th><th></th></tr></thead><tbody>${c.products.map(p => html`<tr key=${p.id}><td>${p.name}<br /><small className="text-body-secondary">${p.category}</small></td><td>${N(p.price)}</td><td>${p.stock}</td>
    <td className="text-nowrap"><button className="btn btn-outline-secondary btn-sm me-1" onClick=${() => { setF({ id: p.id, name: p.name, category: p.category, price: p.price, stock: p.stock, description: p.description }); scrollTo(0, 0); }}>Edit</button><button className="btn btn-danger btn-sm" onClick=${() => del(p)}>Delete</button></td></tr>`)}</tbody></table></div></div>`;
}
function Staff({ c }) {
  const [us, setUs] = useState(null), [q, setQ] = useState('');
  useEffect(() => { if (c.owner) api('/users').then(setUs).catch(e => c.toast(e.message)); }, [c.owner]);
  if (!c.owner) return html`<h2>Owner only</h2><p>Only the owner can give or remove staff access.</p>`;
  const flip = async u => { try { const n = await api('/users/' + u.id, { method: 'PATCH', body: { role: u.role === 'staff' ? 'customer' : 'staff' } }); setUs(us.map(x => x.id === n.id ? n : x)); c.toast(n.name + (n.role === 'staff' ? ' now has staff access' : ' no longer has staff access')); } catch (e) { c.toast(e.message); } };
  return html`<h2>Staff access</h2><p>Staff can update products, manage orders and reply to customers. Only you can give or remove this access. A person must sign up first, then you can find them here.</p>
    <input className="form-control mb-3" style=${{ maxWidth: 360 }} type="search" placeholder="Search by name or email" aria-label="Search people" value=${q} onChange=${e => setQ(e.target.value)} />
    <ul className="list-group">${(us || []).filter(u => (u.name + u.email).toLowerCase().includes(q.toLowerCase())).map(u => html`<li key=${u.id} className="list-group-item d-flex justify-content-between align-items-center gap-2 flex-wrap"><div><b>${u.name}</b> <span className="badge text-bg-secondary">${u.role === 'admin' ? 'Owner' : u.role === 'staff' ? 'Staff' : 'Customer'}</span><br /><small className="text-body-secondary">${u.email}</small></div>
      ${u.role === 'admin' ? '' : html`<button className=${'btn btn-sm ' + (u.role === 'staff' ? 'btn-danger' : 'btn-brand')} onClick=${() => flip(u)}>${u.role === 'staff' ? 'Remove staff access' : 'Give staff access'}</button>`}</li>`)}</ul>`;
}

/* ---------- shell ---------- */
function Header({ c }) {
  const [open, setOpen] = useState(false), h = c.hash[0];
  const L = [['', 'Home'], ['products', 'Products'], ...(c.staff ? [['admin', 'Manage products']] : []), ...(c.owner ? [['staff', 'Staff access']] : []), ['orders', c.staff ? 'All orders' : 'My orders'], ['suggest', 'Suggestions'], ...(c.user ? [['account', 'Account']] : [['login', 'Log in']])];
  const n = c.rows.reduce((s, r) => s + r.q, 0);
  return html`<header className="navbar navbar-expand-lg sb-surface border-bottom sticky-top"><div className="container gap-2"><a className="navbar-brand d-flex align-items-center gap-2 me-3 text-body" href="#/" aria-label="SOLBATEC home"><span className="mark"><${Glyph} c="Machines" /></span><span className="brand">SOLBATEC<small>Industries</small></span></a>
    <form className="d-none d-md-flex flex-grow-1" style=${{ maxWidth: 480 }} role="search" onSubmit=${e => { e.preventDefault(); location.hash = '#/products'; }}><input className="form-control rounded-end-0" type="search" placeholder="Search machines, tools and fabrication" aria-label="Search products" value=${c.f.q} onChange=${e => c.setF({ q: e.target.value })} /><button className="btn btn-brand rounded-start-0">Search</button></form>
    <div className="ms-auto d-flex gap-2 order-lg-last"><button className="btn btn-outline-secondary btn-sm" onClick=${c.flipTheme} aria-label="Switch between light and dark mode">${c.theme === 'dark' ? 'Light' : 'Dark'}</button><button className="btn btn-outline-secondary btn-sm" onClick=${() => c.setDrawer(true)}>Cart <span className="badge text-bg-warning">${n}</span></button>
    <button className="navbar-toggler" aria-label="Menu" aria-expanded=${open} onClick=${() => setOpen(!open)}><span className="navbar-toggler-icon"></span></button></div>
    <div className=${'collapse navbar-collapse' + (open ? ' show' : '')} onClick=${() => setOpen(false)}><form className="d-md-none my-2" role="search" onSubmit=${e => { e.preventDefault(); location.hash = '#/products'; }}><input className="form-control" type="search" placeholder="Search products" aria-label="Search products" value=${c.f.q} onChange=${e => c.setF({ q: e.target.value })} /></form>
    <ul className="navbar-nav ms-lg-auto">${L.map(([k, t]) => html`<li className="nav-item" key=${k}><a className=${'nav-link' + (k === h ? ' on' : '')} href=${'#/' + k}>${t}</a></li>`)}${c.user ? html`<li className="nav-item"><button className="nav-link btn btn-link" onClick=${c.logout}>Log out</button></li>` : ''}</ul></div></div></header>`;
}
function Drawer({ c }) {
  const total = c.rows.reduce((s, r) => s + r.p.price * r.q, 0);
  return html`<${React.Fragment}><div className=${'offcanvas offcanvas-end' + (c.drawer ? ' show' : '')} style=${{ visibility: c.drawer ? 'visible' : 'hidden' }} tabIndex="-1" role="dialog" aria-label="Your cart"><div className="offcanvas-header border-bottom"><h3 className="h5 mb-0">Your cart</h3><button className="btn-close" aria-label="Close cart" onClick=${() => c.setDrawer(false)}></button></div>
    <div className="offcanvas-body">${c.rows.length ? html`<${CartLines} c=${c} />` : html`<p className="text-body-secondary">Your cart is empty. Add a product to start an order.</p>`}</div>
    <div className="p-3 border-top"><div className="d-flex justify-content-between fs-5 fw-bold mb-2"><span>Total</span><span>${N(total)}</span></div>${c.rows.length ? html`<a className="btn btn-brand w-100" href="#/cart" onClick=${() => c.setDrawer(false)}>View cart and check out</a>` : ''}</div></div>${c.drawer ? html`<div className="offcanvas-backdrop fade show" onClick=${() => c.setDrawer(false)}></div>` : ''}<//>`;
}
const Footer = () => html`<footer className="top-note mt-4"><div className="container py-4 row g-4"><div className="col-md-5"><h3 className="h6 text-white">SOLBATEC Industries</h3><p className="mb-0">We design and build tools and machines for farms, factories, workshops and homes.</p></div>
  <div className="col-md-3"><h3 className="h6 text-white">Shop</h3><a className="d-block text-white text-decoration-none" href="#/products">All products</a><a className="d-block text-white text-decoration-none" href="#/orders">My orders</a><a className="d-block text-white text-decoration-none" href="#/suggest">Suggestions</a></div>
  <div className="col-md-4"><h3 className="h6 text-white">Visit us</h3><p className="mb-0">Bukuru Express Road, opposite Jongrand Hotel<br />Jos, Plateau State, Nigeria</p></div></div></footer>`;

const PAGES = { '': Home, products: Products, product: Product, cart: Cart, orders: Orders, suggest: Suggest, login: Login, account: Account, admin: Manage, staff: Staff };
function App() {
  const hash = useHash(), [user, setUser] = useState(JSON.parse(localStorage.user || 'null')), [products, setProducts] = useState(null), [cfg, setCfg] = useState({}), [cart, setCart] = useState(JSON.parse(localStorage.cart || '{}'));
  const [theme, setTheme] = useState(localStorage.theme || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light')), [drawer, setDrawer] = useState(false), [toasts, setToasts] = useState([]), [tick, setTick] = useState(0);
  const [f, setFilters] = useState({ q: '', cat: '', sort: 'rel', max: '', stock: false, rate: 0 }), U = useRef(user); U.current = user;
  const toast = m => { const id = Math.random(); setToasts(t => [...t, { id, m }]); setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500); };
  const staff = ['admin', 'staff'].includes(user?.role), owner = user?.role === 'admin';
  useEffect(() => { document.documentElement.dataset.bsTheme = theme; localStorage.theme = theme; }, [theme]);
  useEffect(() => { localStorage.cart = JSON.stringify(cart); }, [cart]);
  useEffect(() => { const k = e => e.key === 'Escape' && setDrawer(false); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []);
  useEffect(() => { setDrawer(false); }, [hash.join('/')]);
  useEffect(() => {
    (async () => {
      try { setProducts(await api('/products')); } catch { toast('Could not load products. Check your connection.'); setProducts([]); }
      try { setCfg(await api('/config')); } catch {}
      if (localStorage.token) try { const u = await api('/me'); localStorage.user = JSON.stringify(u); setUser(u); } catch { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); }
      const pr = location.pathname.match(/^\/pay-return\/(\d+)/);
      if (pr) { if (localStorage.token) try { const q = new URLSearchParams(location.search), d = await api('/pay/verify?order=' + pr[1] + '&id=' + encodeURIComponent(q.get('transaction_id') || '')); toast(d.paid ? 'Payment received. Thank you!' : 'We have not received that payment yet. It may take a few minutes.'); } catch (e) { toast(e.message); }
        history.replaceState(null, '', '/#/orders'); dispatchEvent(new Event('hashchange')); }
    })();
    const es = new EventSource('/api/events'), on = (n, fn) => es.addEventListener(n, e => fn(JSON.parse(e.data)));
    on('products', setProducts); on('review', () => setTick(t => t + 1)); on('suggestion', () => setTick(t => t + 1));
    on('order', o => { const u = U.current; if (u && (o.userId === u.id || ['admin', 'staff'].includes(u.role))) { toast('Order #' + o.id + ': ' + o.status); setTick(t => t + 1); } });
    on('role', d => { const u = U.current; if (u && u.id === d.id) { const n = { ...u, role: d.role }; localStorage.user = JSON.stringify(n); setUser(n); toast(d.role === 'staff' ? 'You now have staff access.' : 'Your staff access was removed.'); } });
    return () => es.close();
  }, []);
  const rows = Object.entries(cart).map(([id, q]) => ({ p: (products || []).find(x => x.id == id), q })).filter(r => r.p);
  const step = (id, d) => { const p = products.find(x => x.id === id); setCart(cr => { const q = (cr[id] || 0) + d; if (q > p.stock) { toast('Only ' + p.stock + ' in stock.'); return cr; } const n = { ...cr, [id]: q }; if (q < 1) delete n[id]; return n; }); };
  const addCart = (id, q) => { const p = products.find(x => x.id === id); if ((cart[id] || 0) + q > p.stock) return toast('Only ' + p.stock + ' of ' + p.name + ' available.'); setCart({ ...cart, [id]: (cart[id] || 0) + q }); setDrawer(true); };
  const signIn = d => { localStorage.token = d.token; localStorage.user = JSON.stringify(d.user); setUser(d.user); };
  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); toast('You are logged out.'); location.hash = '#/'; };
  const c = { hash, user, staff, owner, products: products || [], cfg, cart, rows, setCart, step, addCart, toast, tick, f, setF: p => setFilters(x => ({ ...x, ...p })), signIn, logout, theme, flipTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'), drawer, setDrawer };
  const Page = PAGES[hash[0]] || Home;
  return html`<div className="d-flex flex-column min-vh-100"><div className="top-note small py-1"><div className="container d-flex justify-content-between flex-wrap gap-1"><span>Bukuru Express Road, opposite Jongrand Hotel, Jos, Plateau State</span><span>Stock and order status update live</span></div></div>
    <${Header} c=${c} /><main className="container py-4 flex-grow-1" id="main" tabIndex="-1">${products === null ? html`<div className="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3 placeholder-glow">${[1, 2, 3, 4].map(i => html`<div className="col" key=${i}><div className="card"><div className="card-body"><span className="placeholder col-12 py-5"></span></div></div></div>`)}</div>` : html`<${Page} c=${c} id=${hash[1]} />`}</main>
    <${Footer} /><${Drawer} c=${c} /><div className="toast-container position-fixed bottom-0 start-50 translate-middle-x p-3" aria-live="polite">${toasts.map(t => html`<div key=${t.id} className="toast show text-bg-dark border-0 border-start border-warning border-4" role="status"><div className="toast-body">${t.m}</div></div>`)}</div></div>`;
}
ReactDOM.createRoot(document.getElementById('root')).render(html`<${App} />`);
