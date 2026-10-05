// Ілюстровані Lottie-анімації вправ: персонаж з об'ємом, одягом і підсвіткою робочих м'язів.
// Рух береться з кінематичної моделі (IK, реальний темп); тут — лише новий вигляд.
// Запуск з кореня проєкту: node tools/lottie-illustrated.js [bench,pullup,...]
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), indexPath = path.join(ROOT, 'index.html'), outDir = path.join(ROOT, 'animations');
const only = process.argv[2];
const E = require('./poses.js');
const NAMES = {};
for (const m of fs.readFileSync(indexPath, 'utf8').matchAll(/\{id: '(\w+)', name: '([^']+)'/g)) NAMES[m[1]] = m[2];

const SCALE = 2, FR = 30, KPS = 12, TK = 1.15; // TK — товщина тулуба збоку

/* ---------- палітра ---------- */
const COL = {
  skin: '#f1c5a2', skinFar: '#c69878', skinShade: '#d9a582', hair: '#2b211c', eye: '#1b1f24',
  shirt: '#eef1f5', shirtFar: '#a9b1bb', shorts: '#3d4855', shortsFar: '#2b333c',
  shoe: '#f5f7f9', shoeFar: '#aeb6bf', sole: '#c6ff3d',
  muscle: '#ff3b47', acc: '#c6ff3d',
  eq: '#5a6573', eqf: '#3a4450', pad: '#4b5562', rail: '#323b46', padc: '#7a8594', cable: '#9aa5b2',
  floor: '#2b333d', plateFill: '#252b32', plateRing: '#46505c', dbh: '#a3adb9', shadow: '#05070a'
};
const STY = { // класи статичних деталей
  eq: {st: [COL.eq, 4.5]}, eqf: {fl: [COL.eqf]}, pad: {st: [COL.pad, 8]}, rail: {st: [COL.rail, 3]},
  padc: {fl: [COL.padc]}, cable: {st: [COL.cable, 1.6], dash: [3, 3]}, bar: {st: [COL.acc, 4]},
  floor: {st: [COL.floor, 2]}, divider: {st: [COL.floor, 1], dash: [3, 4]}
};

/* ---------- геометрія ---------- */
const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]], mul = (a, k) => [a[0] * k, a[1] * k];
const len = a => Math.hypot(a[0], a[1]), unit = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
const perp = u => [-u[1], u[0]]; // поворот на +90° (за годинниковою на екрані)
const dirv = a => [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)];
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
// точка в системі відрізка A→B: t — частка довжини, o — зсув уздовж перпендикуляра
const segPt = (A, B, t, o) => { const d = sub(B, A), u = unit(d), n = perp(u); return add(add(A, mul(d, t)), mul(n, o)); };
function interpW(prof, t) {
  for (let i = 1; i < prof.length; i++) if (t <= prof[i][0]) { const [t0, w0] = prof[i - 1], [t1, w1] = prof[i]; return w0 + (w1 - w0) * (t - t0) / (t1 - t0); }
  return prof[prof.length - 1][1];
}
// «капсула» кінцівки зі змінною товщиною (м'язи) і закругленими кінцями
function capsule(A, B, prof) {
  const d = sub(B, A), u = unit(d), n = perp(u), out = [];
  for (const [t, w] of prof) out.push(add(add(A, mul(d, t)), mul(n, w)));
  const wB = prof[prof.length - 1][1], wA = prof[0][1];
  const Bc = add(A, mul(d, prof[prof.length - 1][0])), Ac = add(A, mul(d, prof[0][0])); // кінці по краю профілю
  for (const f of [60, 30, 0, -30, -60]) out.push(add(Bc, add(mul(u, Math.cos(f * Math.PI / 180) * wB), mul(n, Math.sin(f * Math.PI / 180) * wB))));
  for (let i = prof.length - 1; i >= 0; i--) { const [t, w] = prof[i]; out.push(add(add(A, mul(d, t)), mul(n, -w))); }
  for (const f of [-60, -30, 0, 30, 60]) out.push(add(Ac, add(mul(u, -Math.cos(f * Math.PI / 180) * wA), mul(n, Math.sin(f * Math.PI / 180) * wA))));
  return out;
}
const region = (A, B, list, side = 1) => list.map(([t, o]) => segPt(A, B, t, o * side));
const circlePts = (c, r, n = 12) => Array.from({length: n}, (_, i) => add(c, mul(dirv(i * 360 / n), r)));

/* ---------- профілі тіла (половини товщини) ---------- */
const P_UA = [[0, 4.7], [.35, 4.5], [.65, 3.9], [1, 3.3]];
const P_FA = [[0, 3.4], [.25, 3.7], [.7, 2.9], [1, 2.5]];
const P_TH = [[0, 6.6], [.4, 5.8], [.8, 4.7], [1, 4.3]];
const P_SH = [[0, 4.1], [.25, 4.7], [.6, 3.4], [1, 2.6]];
const P_NECK = [[0, 3.6], [1, 3.1]];
const P_SLEEVE = [[0, 5.6], [.34, 5.2]];
const P_SHORTS = [[0, 7.4], [.36, 6.9]];
const TORSO_SIDE = [[-.06, -6.8], [.12, -6.3], [.3, -5.2], [.55, -6.4], [.8, -7.2], [.97, -6.2], [1.06, -2.6], [1.07, 2.4], [.96, 6.6],
  [.8, 9], [.62, 8.3], [.45, 7.1], [.25, 7.1], [.05, 6.9], [-.08, 4.6], [-.12, -1], [-.1, -5]];
const SHORTS_SIDE = [[.17, -6.1], [.05, -6.8], [-.06, -6.9], [-.1, -5.1], [-.12, -1], [-.08, 4.7], [.05, 7], [.17, 7.2]];

/* ---------- робочі м'язи вправ ---------- */
const MUSCLES = {
  bench: ['chest', 'triceps', 'frontDelt'], inclDb: ['upperChest', 'frontDelt'], smithIncl: ['upperChest', 'frontDelt', 'triceps'],
  flyes: ['pecs'], dips: ['chest', 'triceps'], french: ['triceps'],
  pullup: ['latsF'], bbRow: ['lats', 'upperBack', 'rearDelt'], dbRow: ['lats', 'upperBack'], latPull: ['latsF'], curl: ['biceps'],
  hack: ['quads', 'glutes'], legPress: ['quads', 'glutes'], legExt: ['quads'], rdl: ['hamstrings', 'glutes'], legCurl: ['hamstrings'],
  smithPress: ['frontDelt', 'sideDelt', 'triceps'], lateral: ['sideDeltF'], rearDelt: ['rearDelt', 'rearDeltF']
};

/* ---------- Lottie-примітиви ---------- */
const hex = (h, o) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, 1].map(v => +v.toFixed(4)); };
const r1 = v => Math.round(v * 2) / 2;
const S = p => [r1(p[0] * SCALE), r1(p[1] * SCALE)];
function paint(sty) {
  const out = [];
  if (sty.st) {
    const st = {ty: 'st', c: {a: 0, k: hex(sty.st[0])}, o: {a: 0, k: sty.st[2] ?? 100}, w: {a: 0, k: sty.st[1] * SCALE}, lc: 2, lj: 2, ml: 4, nm: 'stroke'};
    if (sty.dash) st.d = [{n: 'd', nm: 'dash', v: {a: 0, k: sty.dash[0] * SCALE}}, {n: 'g', nm: 'gap', v: {a: 0, k: sty.dash[1] * SCALE}}, {n: 'o', nm: 'offset', v: {a: 0, k: 0}}];
    out.push(st);
  }
  if (sty.fl) out.push({ty: 'fl', c: {a: 0, k: hex(sty.fl[0])}, o: {a: 0, k: sty.fl[1] ?? 100}, r: 1, nm: 'fill'});
  return out;
}
const TR = (p = [0, 0]) => ({ty: 'tr', p: p.a !== undefined ? p : {a: 0, k: p}, a: {a: 0, k: [0, 0]}, s: {a: 0, k: [100, 100]}, r: {a: 0, k: 0}, o: {a: 0, k: 100}, sk: {a: 0, k: 0}, sa: {a: 0, k: 0}, nm: 'transform'});
const group = (nm, items, p) => ({ty: 'gr', nm, it: [...items, TR(p)]});
// гладкий замкнений контур: дотичні Catmull-Rom → безьє
function shapeVal(pts, closed, smooth) {
  const n = pts.length, i = [], o = [];
  for (let k = 0; k < n; k++) {
    if (!smooth || (!closed && (k === 0 || k === n - 1))) { i.push([0, 0]); o.push([0, 0]); continue; }
    const p = pts[(k - 1 + n) % n], q = pts[(k + 1) % n];
    const t = [r1((q[0] - p[0]) / 6 * SCALE), r1((q[1] - p[1]) / 6 * SCALE)];
    o.push(t); i.push([-t[0], -t[1]]);
  }
  return {i, o, v: pts.map(S), c: closed};
}
const eqJSON = (x, y) => JSON.stringify(x) === JSON.stringify(y);
function keyed(times, vals) {
  if (vals.every(v => eqJSON(v, vals[0]))) return {a: 0, k: vals[0]};
  const k = [];
  vals.forEach((v, idx) => {
    if (idx > 0 && idx < vals.length - 1 && eqJSON(v, vals[idx - 1]) && eqJSON(v, vals[idx + 1])) return;
    k.push({t: +(times[idx] * FR).toFixed(3), s: [v], i: {x: [1], y: [1]}, o: {x: [0], y: [0]}});
  });
  return {a: 1, k};
}
function pathItem(nm, times, frames, closed, smooth, sty) {
  const ks = keyed(times, frames.map(p => shapeVal(p, closed, smooth)));
  return group(nm, [{ty: 'sh', ks, nm: 'path'}, ...paint(sty)]);
}
function posProp(times, pts) {
  const kf = keyed(times, pts.map(S));
  if (kf.a === 0) return kf;
  kf.k.forEach(k => { k.s = k.s[0]; k.i = {x: 1, y: 1}; k.o = {x: 0, y: 0}; });
  return kf;
}
const ellipse = (nm, c, rx, ry, sty) => group(nm, [{ty: 'el', p: {a: 0, k: S(c)}, s: {a: 0, k: [rx * 2 * SCALE, (ry ?? rx) * 2 * SCALE]}, nm: 'ellipse'}, ...paint(sty)]);
const rectI = (nm, x, y, w, h, rx, sty) => group(nm, [{ty: 'rc', p: {a: 0, k: S([x + w / 2, y + h / 2])}, s: {a: 0, k: [w * SCALE, h * SCALE]}, r: {a: 0, k: (rx || 0) * SCALE}, nm: 'rect'}, ...paint(sty)]);

/* ---------- статичні деталі з SVG-фрагментів ---------- */
function svgPathPoints(d) {
  const subs = []; let cur = null, x = 0, y = 0, m;
  const re = /([MLHVhvlm])\s*([-\d.\s,]*)/g;
  while ((m = re.exec(d))) {
    const n = m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (m[1] === 'M') { x = n[0]; y = n[1]; cur = [[x, y]]; subs.push(cur); for (let i = 2; i < n.length; i += 2) cur.push([x = n[i], y = n[i + 1]]); }
    else if (m[1] === 'L') for (let i = 0; i < n.length; i += 2) cur.push([x = n[i], y = n[i + 1]]);
    else if (m[1] === 'H') cur.push([x = n[0], y]);
    else if (m[1] === 'V') cur.push([x, y = n[0]]);
    else if (m[1] === 'h') cur.push([x += n[0], y]);
    else if (m[1] === 'v') cur.push([x, y += n[0]]);
  }
  return subs;
}
function props(svg, tx) {
  const out = [];
  const attr = (t, k) => { const mm = t.match(new RegExp(`\\s${k}="([^"]*)"`)); return mm ? mm[1] : null; };
  for (const [tag] of (svg || '').matchAll(/<(rect|path|circle|ellipse)\b[^>]*\/>/g)) {
    const cls = attr(tag, 'class'), kind = tag.match(/^<(\w+)/)[1], num = k => +attr(tag, k);
    if (!STY[cls]) continue; // фігура старого стікмена (розведення) — малюємо заново
    if (kind === 'rect') {
      out.push(rectI(cls, num('x') + tx, num('y'), num('width'), num('height'), num('rx'), STY[cls]));
      if (cls === 'eqf' && num('height') <= 9) out.push(rectI('cushion top', num('x') + tx + 1, num('y'), num('width') - 2, 2.2, 1, {fl: ['#55616f']}));
    } else if (kind === 'circle') out.push(ellipse(cls, [num('cx') + tx, num('cy')], num('r'), null, STY[cls]));
    else for (const sp of svgPathPoints(attr(tag, 'd'))) out.push(group(cls, [{ty: 'sh', ks: {a: 0, k: shapeVal(sp.map(p => [p[0] + tx, p[1]]), false, false)}, nm: 'path'}, ...paint(STY[cls])]));
  }
  return out;
}
function objShapes(o) { // предмети на суглобах; перший елемент — верхній
  if (o.o === 'plate') return [ellipse('hub', [0, 0], 2.6, null, {fl: [COL.acc]}), ellipse('ring', [0, 0], o.r * .62, null, {st: [COL.plateRing, 1.6]}),
    ellipse('plate', [0, 0], o.r, null, {fl: [COL.plateFill], st: [COL.acc, 2.6]})];
  if (o.o === 'db') return [ellipse('hub', [0, 0], 2, null, {fl: [COL.acc]}), ellipse('plate', [0, 0], o.r, null, {fl: [COL.plateFill], st: [COL.acc, 2]})];
  if (o.o === 'pad') return [ellipse('pad', [0, 0], o.r, null, {fl: [COL.padc], st: ['#566170', 1]})];
  if (o.o === 'dbs') return [rectI('plate L', -12, -6.5, 5, 13, 1.6, {fl: [COL.plateFill], st: [COL.acc, 1.6]}), rectI('plate R', 7, -6.5, 5, 13, 1.6, {fl: [COL.plateFill], st: [COL.acc, 1.6]}),
    group('handle', [{ty: 'sh', ks: {a: 0, k: shapeVal([[-8, 0], [8, 0]], false, false)}, nm: 'path'}, ...paint({st: [COL.dbh, 3]})])];
  throw new Error(o.o);
}

/* ---------- персонаж ---------- */
function partItems(p, key, times) {
  const tx = p.tx || 0, keys = E.timeline(p.steps);
  const F = times.map(t => E.solve(E.poseAt(keys, t)));
  const mv = pt => [pt[0] + tx, pt[1]];
  const front = !!p.front, k = q => (q.flip ? -1 : 1);
  const items = [];
  const anim = (nm, fn, sty, smooth = true, closed = true) => items.push(pathItem(nm, times, F.map(f => fn(f.J, f.q).map(mv)), closed, smooth, sty));
  const dot = (nm, fn, r, sty) => items.push(group(nm, [{ty: 'el', p: posProp(times, F.map(f => mv(fn(f.J, f.q)))), s: {a: 0, k: [r * 2 * SCALE, r * 2 * SCALE]}, nm: 'ellipse'}, ...paint(sty)]));
  const atts = back => (p.att || []).filter(x => !!x.back === back).forEach(x => {
    if (x.o === 'line') anim(x.cls, (J, q) => [x.a(J, q), x.b(J, q)], STY[x.cls], false, false);
    else items.push(group(x.o, objShapes(x), posProp(times, F.map(f => mv(x.at(f.J, f.q))))));
  });
  // сторона згинання ліктя/коліна (стала для вправи) — для біцепса/трицепса й квадрицепса/біцепса стегна
  const bendSide = (a, b, c, s) => {
    let best = 0, sign = 1;
    F.forEach(({J}) => { const cr = cross(unit(sub(J[b + s], J[a + s])), unit(sub(J[c + s], J[b + s]))); if (Math.abs(cr) > best) { best = Math.abs(cr); sign = Math.sign(cr) || 1; } });
    return sign;
  };
  const armSide = bendSide('s', 'e', 'w', 1), legSide = bendSide('h', 'k', 'a', 1);
  const mus = MUSCLES[key] || [];
  const M = {fl: [COL.muscle, 62]};

  const arm = (s, far) => {
    const sk = far ? COL.skinFar : COL.skin, sl = far ? COL.shirtFar : COL.shirt;
    anim('forearm ' + s, J => capsule(J['e' + s], J['w' + s], P_FA), {fl: [sk]});
    anim('upper arm ' + s, J => capsule(J['s' + s], J['e' + s], P_UA), {fl: [sk]});
    if (!far) {
      if (mus.includes('biceps')) anim('biceps', J => region(J.s1, J.e1, [[.22, .5], [.3, 4.6], [.55, 4.3], [.8, 3.4], [.85, .4]], armSide), M);
      if (mus.includes('triceps')) anim('triceps', J => region(J.s1, J.e1, [[.3, -.5], [.32, -4.6], [.6, -4.1], [.85, -3.4], [.88, -.6]], armSide), M);
    }
    anim('sleeve ' + s, J => capsule(J['s' + s], J['e' + s], P_SLEEVE), {fl: [sl]});
    dot('hand ' + s, J => segPt(J['e' + s], J['w' + s], 1.06, 0), 3, {fl: [sk]});
  };
  const leg = (s, far) => {
    const sk = far ? COL.skinFar : COL.skin, sh = far ? COL.shortsFar : COL.shorts, shoe = far ? COL.shoeFar : COL.shoe;
    anim('shin ' + s, J => capsule(J['k' + s], J['a' + s], P_SH), {fl: [sk]});
    anim('thigh ' + s, J => capsule(J['h' + s], J['k' + s], P_TH), {fl: [sk]});
    if (!far && !front) {
      if (mus.includes('quads')) anim('quads', J => region(J.h1, J.k1, [[.4, -.5], [.42, -5.7], [.65, -5.3], [.88, -4.3], [.93, -.5]], -legSide), M);
      if (mus.includes('hamstrings')) anim('hamstrings', J => region(J.h1, J.k1, [[.42, .5], [.44, 5.7], [.68, 5.1], [.9, 4.1], [.93, .5]], -legSide), M);
    }
    anim('shorts leg ' + s, J => capsule(J['h' + s], J['k' + s], P_SHORTS), {fl: [sh]});
    if (front) anim('shoe ' + s, J => capsule(J['a' + s], J['t' + s], [[0, 3.6], [1, 3.2]]), {fl: [shoe]});
    else anim('shoe ' + s, (J, q) => {
      const A = J['a' + s], f = dirv(q['ft' + s]), dn = dirv(q['ft' + s] + 90 * k(q));
      const P = (a, b) => add(add(A, mul(f, a)), mul(dn, b));
      return [P(-3.4, -1.5), P(-4, 2.2), P(-2.5, 3.6), P(10, 3.6), P(12.3, 2.2), P(11.4, .3), P(7.5, -.6), P(2.5, -3)];
    }, {fl: [shoe], st: [far ? '#7d8792' : COL.sole, 1.1]});
  };
  const torso = () => {
    if (front) {
      const T = (J, q, list) => list.map(([t, o]) => E.P2(E.P2(J.hip, E.ang(J.hip, J.sc), E.dist(J.hip, J.sc) * t), E.ang(J.hip, J.sc) + 90, o));
      anim('neck', J => capsule(J.sc, segPt(J.sc, J.head, .7, 0), P_NECK), {fl: [COL.skinShade]});
      anim('shirt', (J, q) => { const a = q.sw + 3.5, h = q.hw; return T(J, q, [[1.04, a], [.86, q.sw + 1.5], [.55, q.sw - 2.5], [.3, h + 2], [.02, h + 4], [-.08, h + 2.5], [-.08, -h - 2.5], [.02, -h - 4], [.3, -h - 2], [.55, -q.sw + 2.5], [.86, -q.sw - 1.5], [1.04, -a], [1.08, -4], [1.06, 0], [1.08, 4]]); }, {fl: [COL.shirt]});
      if (mus.includes('latsF')) for (const sd of [1, -1]) anim('lats', (J, q) => T(J, q, [[.84, sd * (q.sw - .5)], [.62, sd * (q.sw - 1.2)], [.38, sd * (q.hw + 2.2)], [.42, sd * (q.hw - 1)], [.66, sd * (q.sw - 6.5)]]), M);
      anim('shorts', (J, q) => { const h = q.hw; return T(J, q, [[.2, h + 2.6], [.02, h + 4.2], [-.1, h + 2.6], [-.1, -h - 2.6], [.02, -h - 4.2], [.2, -h - 2.6]]); }, {fl: [COL.shorts]});
    } else {
      const T = (J, q, list) => { const u = E.ang(J.hip, J.sc), l = E.dist(J.hip, J.sc); return list.map(([t, o]) => E.P2(E.P2(J.hip, u, l * t), u + 90, o * k(q) * TK)); };
      anim('neck', J => capsule(J.sc, segPt(J.sc, J.head, .75, 0), P_NECK), {fl: [COL.skinShade]});
      anim('shirt', (J, q) => T(J, q, TORSO_SIDE), {fl: [COL.shirt]});
      const R = (nm, list) => mus.includes(nm) && anim(nm, (J, q) => T(J, q, list), M);
      R('chest', [[.93, 3], [.86, 7.6], [.74, 8.4], [.62, 7.4], [.6, 3.4], [.78, 2.4]]);
      R('upperChest', [[.97, 3], [.92, 6.8], [.82, 8.3], [.74, 6.4], [.8, 2.6]]);
      R('lats', [[.86, -3], [.86, -6.9], [.66, -6.4], [.45, -5.5], [.5, -3]]);
      R('upperBack', [[.98, -2.6], [.96, -6.2], [.84, -7.1], [.72, -6.6], [.74, -3]]);
      anim('shorts', (J, q) => T(J, q, SHORTS_SIDE), {fl: [COL.shorts]});
      R('glutes', [[.13, -3.6], [.11, -6.2], [-.04, -6.8], [-.09, -5.2], [-.05, -2.6]]);
    }
  };
  const head = () => {
    dot('head', J => J.head, 9, {fl: [COL.skin]});
    if (front) {
      anim('hair', J => [165, 200, 235, 270, 305, 340, 15].map(a => add(J.head, mul(dirv(a), 9.6)))
        .concat([[12, 7, -1.2], [-30, 5, 0], [-90, 3.2, 0], [-150, 5, 0], [168, 7, -1.2]].map(([a, r, dy]) => add(J.head, add(mul(dirv(a), r), [0, dy])))), {fl: [COL.hair]});
      dot('eye L', J => add(J.head, [-3, .8]), 1.1, {fl: [COL.eye]});
      dot('eye R', J => add(J.head, [3, .8]), 1.1, {fl: [COL.eye]});
    } else {
      anim('hair', (J, q) => {
        const n = q.torso + q.ht, f = n + 90 * k(q), at = (al, r) => add(J.head, mul(dirv(f - k(q) * al), r));
        return [at(48, 9.7), at(90, 9.9), at(135, 9.9), at(180, 9.8), at(225, 9.4), at(252, 8.6), at(245, 5.6), at(175, 3.4), at(100, 5), at(58, 7.6)];
      }, {fl: [COL.hair]});
      dot('ear', (J, q) => { const n = q.torso + q.ht, f = n + 90 * k(q); return add(J.head, mul(dirv(f), -1.2)); }, 2.2, {fl: [COL.skinShade]});
      dot('eye', (J, q) => { const n = q.torso + q.ht, f = n + 90 * k(q); return add(add(J.head, mul(dirv(f), 5.2)), mul(dirv(n), 1.3)); }, 1.2, {fl: [COL.eye]});
    }
  };
  const delts = () => {
    if (front) {
      if (mus.includes('sideDeltF') || mus.includes('rearDeltF'))
        for (const s of [1, 2]) dot('delt ' + s, (J, q) => segPt(J['s' + s], J['e' + s], .12, 0), 5.2, M);
      return;
    }
    const at = (side) => (J, q) => add(segPt(J.s1, J.e1, .12, 0), mul(dirv(q.torso + 90 * k(q)), side));
    if (mus.includes('frontDelt')) dot('front delt', at(2.4), 4.4, M);
    if (mus.includes('sideDelt')) dot('side delt', at(0), 4.6, M);
    if (mus.includes('rearDelt')) dot('rear delt', at(-2.4), 4.4, M);
  };

  // порядок малювання: знизу вгору
  items.push(...props(p.props, tx));
  atts(true);
  if (p.body === false) { arm(2); arm(1); }
  else if (front) { leg(2); leg(1); torso(); head(); arm(2); arm(1); delts(); }
  else { leg(2, true); arm(2, true); torso(); head(); leg(1); arm(1); delts(); }
  atts(false);
  return items;
}

// розведення: статичне тіло «з боку голови» (тулуб, голова, ноги на підлозі)
function flyesBody() {
  const it = [];
  it.push(ellipse('head', [110, 95.5], 9, null, {fl: [COL.skin]}));
  it.push(group('hair', [{ty: 'sh', ks: {a: 0, k: shapeVal([165, 200, 235, 270, 305, 340, 15].map(a => add([110, 95.5], mul(dirv(a), 9.6))).concat([[118, 96], [110, 93], [102, 96]]), true, true)}, nm: 'path'}, ...paint({fl: [COL.hair]})]));
  for (const sd of [-1, 1]) {
    const H = [110 + 7 * sd, 109], K = [110 + 21 * sd, 117], A = [110 + 26 * sd, 146], T = [110 + 31 * sd, 147.5];
    it.push(group('shin', [{ty: 'sh', ks: {a: 0, k: shapeVal(capsule(K, A, P_SH), true, true)}, nm: 'path'}, ...paint({fl: [COL.skin]})]));
    it.push(group('thigh', [{ty: 'sh', ks: {a: 0, k: shapeVal(capsule(H, K, P_TH), true, true)}, nm: 'path'}, ...paint({fl: [COL.skin]})]));
    it.push(group('shorts', [{ty: 'sh', ks: {a: 0, k: shapeVal(capsule(H, K, [[0, 7.4], [.8, 6.8]]), true, true)}, nm: 'path'}, ...paint({fl: [COL.shorts]})]));
    it.push(group('shoe', [{ty: 'sh', ks: {a: 0, k: shapeVal(capsule(A, T, [[0, 3.8], [1, 3.4]]), true, true)}, nm: 'path'}, ...paint({fl: [COL.shoe]})]));
  }
  it.push(ellipse('torso', [110, 104.5], 20, 8.2, {fl: [COL.shirt]}));
  for (const sd of [-1, 1]) it.push(ellipse('pec', [110 + 8.5 * sd, 102.6], 7.5, 4.6, {fl: [COL.muscle, 62]}));
  return it;
}

function exportAnim(key) {
  const sp = E.ANIM[key], parts = sp.parts || [sp];
  const k0 = E.timeline(parts[0].steps), T = k0[k0.length - 1].t;
  const N = Math.round(T * KPS), times = Array.from({length: N + 1}, (_, i) => i / N * T);
  const vb = (sp.vb || '0 0 220 165').split(' ').map(Number);
  const items = [];
  if (!sp.noFloor) {
    items.push(...props('<path class="floor" d="M4 152H216"/>', 0));
    // м'яка тінь під персонажем
    const xs = parts.map(p => { const f = E.solve(E.poseAt(E.timeline(p.steps), 0)); return (f.J.a1[0] + f.J.hip[0]) / 2 + (p.tx || 0); });
    xs.forEach(x => items.push(ellipse('shadow', [x, 152.5], 30, 3.2, {fl: [COL.shadow, 55]})));
  }
  items.push(...props(sp.extra, 0));
  if (key === 'flyes') items.push(...props(sp.props, 0), ...flyesBody());
  for (const p of parts) items.push(...partItems(key === 'flyes' ? {...p, props: ''} : p, key, times));
  const op = Math.round(T * FR);
  return {
    v: '5.7.4', fr: FR, ip: 0, op, w: vb[2] * SCALE, h: vb[3] * SCALE, nm: NAMES[key] || key, ddd: 0, assets: [], markers: [],
    layers: [{ddd: 0, ind: 1, ty: 4, nm: 'figure', sr: 1, ip: 0, op, st: 0, bm: 0, ao: 0,
      ks: {o: {a: 0, k: 100}, r: {a: 0, k: 0}, p: {a: 0, k: [0, 0, 0]}, a: {a: 0, k: [0, 0, 0]}, s: {a: 0, k: [100, 100, 100]}},
      shapes: items.reverse()}]
  };
}

fs.mkdirSync(outDir, {recursive: true});
let total = 0;
const keysToDo = only ? only.split(',') : Object.keys(E.ANIM);
for (const key of keysToDo) {
  const json = JSON.stringify(exportAnim(key));
  fs.writeFileSync(path.join(outDir, NAMES[key] + '.json'), json);
  total += json.length;
  console.log(`${key.padEnd(11)} → ${NAMES[key]}.json  ${(json.length / 1024).toFixed(0)} KB`);
}
console.log(`разом: ${(total / 1024).toFixed(0)} KB`);
