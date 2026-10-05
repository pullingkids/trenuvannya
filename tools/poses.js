/* Кінематична модель вправ: пози, темп, інверсна кінематика.
   Змінюй тут пози/темп і запускай tools/lottie-illustrated.js, щоб перегенерувати animations/*.json. */
// Кути в градусах: 0 = вправо, 90 = вниз, -90 = вгору. У вигляді збоку фігура дивиться вправо.
// Кожна вправа — ланцюжок ключових поз із тривалістю в секундах (реальний темп: повільний негатив,
// пауза, швидший підйом). Руки й ноги розв'язуються інверсною кінематикою: кисть іде точною
// траєкторією снаряда (вертикально в Сміті, J-крива в жимі), стопи й таз не ковзають.
const L = {tl: 42, neck: 14, head: 8.5, ua: 26, fa: 24, th: 33, sh: 31, foot: 10};
const RAD = Math.PI / 180;
const P2 = (p, a, l) => [p[0] + Math.cos(a * RAD) * l, p[1] + Math.sin(a * RAD) * l];
const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) / RAD;
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const f1 = n => n.toFixed(1);
const pt = p => f1(p[0]) + ' ' + f1(p[1]);
const EASE = {
  l: x => x,
  io: x => .5 - .5 * Math.cos(Math.PI * x),                    // плавно (негатив, паузи)
  p: x => .5 - .5 * Math.cos(Math.PI * Math.pow(x, .7))        // потужний старт, м'яке завершення (позитив)
};
// Дволанкова інверсна кінематика: корінь → середній суглоб → кінцева точка
function ik(root, target, a, b, sign) {
  let d = dist(root, target);
  const base = ang(root, target);
  d = Math.min(Math.max(d, Math.abs(a - b) + .01), a + b - .01);
  const al = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d)))) / RAD;
  const m = P2(root, base + sign * al, a);
  return [m, P2(m, ang(m, target), b)];
}
// лінія спинки/опори вздовж корпусу (з боку спини)
const bl = (hip, a, from, to, off = 10) => 'M' + pt(P2(P2(hip, a, from), a - 90, off)) + 'L' + pt(P2(P2(hip, a, to), a - 90, off));

const plate = (j, r = 14) => ({o: 'plate', r, at: J => J[j]});
const db = (j, r = 6) => ({o: 'db', r, at: J => J[j]});
const dbS = (j, rot = 0) => ({o: 'dbs', rot, at: J => J[j]});
const seg = (a, b, cls = 'eq', back = true) => ({o: 'line', a, b, cls, back});
const fixed = p => () => p;
const padAt = (at, back = false, r = 5.5) => ({o: 'pad', r, at, back});
const SHAPES = {
  plate: a => `<circle class="plate" r="${a.r}"/><circle class="hub" r="2.6"/>`,
  db: a => `<circle class="plate" r="${a.r}"/><circle class="hub" r="2"/>`,
  dbs: a => `<g transform="rotate(${a.rot})"><path class="dbh" d="M-8 0H8"/><rect class="dbp" x="-12" y="-6" width="5" height="12" rx="1.5"/><rect class="dbp" x="7" y="-6" width="5" height="12" rx="1.5"/></g>`,
  pad: a => `<circle class="padc" r="${a.r}"/>`
};

const LYING = {hip: [112, 99], torso: 180, a1: [140, 146], a2: [146, 146], ft2: 0};
const FLAT_BENCH = '<path class="rail" d="M60 42V151"/><path class="eq" d="M60 50h7"/><rect class="eqf" x="30" y="105" width="110" height="7" rx="3"/><path class="eq" d="M46 112V151M124 112V151"/>';
const INCL = {hip: [106, 113], torso: -140, a1: [138, 146], a2: [143, 146], ft2: 0};
const INCL_BENCH = `<path class="pad" d="${bl([106, 113], -140, -8, 50)}"/><path class="pad" d="M98 123H130"/><path class="eq" d="M114 127V151M86 112L96 151"/>`;
const shinPad = (pivot, along) => {
  const at = (J, q) => P2(P2(J.k1, q.sh1, along), q.sh1 - 90, 6);
  return [seg(fixed(pivot), at, 'eq'), padAt(at)];
};
const HACK0 = [123.8, 85], HACK1 = [139.8, 115];

const ANIM = {
  bench: {tempo: '↓ 2 с · пауза · ↑ 1 с', props: FLAT_BENCH, att: [plate('w1', 15)],
    steps: [{...LYING, w1: [71, 51]}, {d: .4}, {d: 2, w1: [84, 88]}, {d: .3},
      {d: 1.1, e: 'p', w1: [71, 51], via: [{w1: [79, 69]}]}]},
  inclDb: {tempo: '↓ 2 с · ↑ 1 с', props: INCL_BENCH, att: [db('w1', 6.5)],
    steps: [{...INCL, w1: [77, 38]}, {d: .4}, {d: 2.2, w1: [83, 86]}, {d: .2}, {d: 1.1, e: 'p', w1: [77, 38]}]},
  smithIncl: {tempo: '↓ 2 с · ↑ 1 с', props: '<path class="rail" d="M82.5 6V151"/>' + INCL_BENCH, att: [plate('w1', 14)],
    steps: [{...INCL, w1: [82.5, 38]}, {d: .4}, {d: 2, w1: [82.5, 80]}, {d: .2}, {d: 1, e: 'p', w1: [82.5, 38]}]},
  flyes: {cap: 'Вигляд з боку голови', tempo: '↓ 2 с · розтяг · ↑ 1,5 с', front: true, body: false,
    props: '<rect class="eqf" x="91" y="112" width="38" height="8" rx="3"/><path class="eq" d="M97 120V151M123 120V151"/>' +
      '<circle class="bodyf" cx="110" cy="96" r="8.5"/><ellipse class="bodyf" cx="110" cy="104.5" rx="19" ry="7.5"/>' +
      '<path class="limb leg" d="M103 109L89 117L84 147L78 149"/><path class="limb leg" d="M117 109L131 117L136 147L142 149"/>',
    att: [db('w1'), db('w2')],
    steps: [{sc: [110, 102], torso: -90, tl: 0, sw: 16, sym: true, ua1: -92, fa1: -112}, {d: .4},
      {d: 2.2, ua1: 6, fa1: -14}, {d: .3}, {d: 1.3, e: 'p', ua1: -92, fa1: -112}]},
  dips: {tempo: '↓ 2 с · ↑ 1 с', props: '<path class="eq" d="M74 86V151M158 86V151"/>',
    att: [seg(fixed([66, 86]), fixed([166, 86]), 'eq', false)],
    steps: [{sc: [113, 36], torso: -78, w1: [112, 84], th1: 105, sh1: 160, ft1: 135, th2: 101, sh2: 155, ft2: 130}, {d: .4},
      {d: 2, sc: [131, 60], torso: -58, th1: 115, sh1: 170, ft1: 145, th2: 111, sh2: 165, ft2: 140}, {d: .2},
      {d: 1, e: 'p', sc: [113, 36], torso: -78, th1: 105, sh1: 160, ft1: 135, th2: 101, sh2: 155, ft2: 130}]},
  french: {tempo: '↓ 2 с · ↑ 1 с', props: FLAT_BENCH, att: [plate('w1', 9)],
    steps: [{...LYING, ua1: -102, fa1: -94}, {d: .4}, {d: 2, ua1: -106, fa1: -168}, {d: .2}, {d: 1, e: 'p', ua1: -102, fa1: -94}]},
  pullup: {cap: 'Вигляд спереду', tempo: 'лопатки ↓ · ↑ 1 с · ↓ 2 с', front: true, vb: '0 0 220 182', noFloor: true,
    props: '<path class="rail" d="M34 26V182M186 26V182"/><path class="eq" d="M28 26H192"/>',
    steps: [{sc: [110, 74], torso: -90, sw: 15, hw: 8, sym: true, w1: [140, 28], th1: 93, sh1: 91, shl: 22, fl: 5, ft1: 70}, {d: .4},
      {d: .35, sc: [110, 70]}, {d: 1, e: 'p', sc: [110, 30]}, {d: .4}, {d: 2, sc: [110, 74]}]},
  latPull: {cap: 'Вигляд спереду', tempo: '↓ 1 с · пауза · ↑ 2 с', front: true,
    props: '<path class="rail" d="M110 0V5"/><circle class="eq" cx="110" cy="9" r="4"/><rect class="eqf" x="84" y="116" width="52" height="7" rx="3"/><path class="eq" d="M110 123V151"/>',
    att: [seg(fixed([110, 13]), J => mid(J.w1, J.w2), 'cable'), seg(fixed([86, 112]), fixed([134, 112]), 'pad', false),
      seg(J => [J.w2[0] - 10, J.w2[1]], J => [J.w1[0] + 10, J.w1[1]], 'bar', false)],
    steps: [{hip: [110, 111], torso: -90, tl: 45, sw: 15, hw: 9, sym: true, w1: [143, 22], th1: 80, thl: 10, sh1: 92, shl: 27, fl: 5, ft1: 60}, {d: .4},
      {d: 1, e: 'p', tl: 41, w1: [141, 71]}, {d: .4}, {d: 2, tl: 45, w1: [143, 22]}]},
  bbRow: {tempo: '↑ 1 с · пауза · ↓ 1,5 с', att: [plate('w1', 15)],
    steps: [{hip: [91, 90], torso: -30, ht: -8, a1: [114, 147], a2: [110, 147], ft2: 0, w1: [126, 117]}, {d: .3},
      {d: .9, e: 'p', w1: [106, 94], via: [{w1: [119, 106]}]}, {d: .4}, {d: 1.6, w1: [126, 117], via: [{w1: [119, 106]}]}]},
  dbRow: {tempo: '↑ 1 с · пауза · ↓ 2 с',
    props: '<rect class="eqf" x="24" y="122" width="92" height="7" rx="3"/><path class="eq" d="M36 129V151M104 129V151"/>',
    att: [dbS('w1')],
    steps: [{hip: [68, 85], torso: -20, ht: -6, a1: [58, 147], th2: 90, sh2: 180, ft2: 165, w2: [110, 118], eb2: 1, w1: [109, 119]}, {d: .3},
      {d: .9, e: 'p', w1: [86, 93], via: [{w1: [101, 107]}]}, {d: .4}, {d: 1.8, w1: [109, 119], via: [{w1: [101, 107]}]}]},
  curl: {tempo: '↑ 1 с · ↓ 2 с', att: [plate('w1', 12)],
    steps: [{hip: [106, 84], torso: -89, a1: [108, 147], a2: [104, 147], ft2: 0, ua1: 88, fa1: 82}, {d: .2},
      {d: 1, e: 'p', ua1: 80, fa1: -62}, {d: .3}, {d: 2, ua1: 88, fa1: 82}]},
  hack: {tempo: '↓ 2 с · ↑ 1 с',
    props: '<path class="rail" d="M91 51L140 143"/><path class="pad" d="M141 145.5L173 137"/><path class="eq" d="M139 143L141 151"/>',
    att: [seg((J, q) => P2(P2(J.hip, q.torso, -6), q.torso - 90, 10), (J, q) => P2(P2(J.hip, q.torso, 44), q.torso - 90, 10), 'pad'),
      padAt((J, q) => P2(P2(J.sc, q.torso, 3), q.torso - 90, 3), true)],
    steps: [{hip: HACK0, torso: -118, a1: [152, 138], a2: [148, 139], ft1: -15, ft2: -15, ua1: 70, fa1: -75}, {d: .4},
      {d: 2, hip: HACK1}, {d: .2}, {d: 1, e: 'p', hip: HACK0}]},
  legPress: {tempo: '↓ 2 с · ↑ 1 с',
    props: `<path class="rail" d="M103.5 99L160 42.4"/><path class="pad" d="${bl([78, 120], -148, -8, 50)}"/><path class="eq" d="M78 134L68 151M96 132L108 151"/>`,
    att: [seg(J => P2(P2(J.a1, -45, 4.5), 45, 10), J => P2(P2(J.a1, -45, 4.5), -135, 24), 'pad', false)],
    steps: [{hip: [78, 120], torso: -148, ht: 15, a1: [123.3, 79.2], a2: [121, 82], ft1: -135, ft2: -135, ua1: 65, fa1: 15}, {d: .4},
      {d: 2, a1: [100.7, 101.8], a2: [98.4, 104.6]}, {d: .2}, {d: 1, e: 'p', a1: [123.3, 79.2], a2: [121, 82]}]},
  legExt: {tempo: '↑ 1 с · пауза · ↓ 2 с',
    props: `<path class="pad" d="M66 120H114"/><path class="pad" d="${bl([86, 112], -98, -4, 46)}"/><path class="eq" d="M94 124V151M76 124L68 151"/><circle class="eqf" cx="119" cy="112" r="3.5"/>`,
    att: shinPad([119, 112], 26),
    steps: [{hip: [86, 112], torso: -98, th1: 0, sh1: 98, ft1: 15, th2: 2, sh2: 100, ft2: 17, ua1: 100, fa1: 25}, {d: .2},
      {d: 1, e: 'p', sh1: -2, ft1: -80, sh2: 0, ft2: -78}, {d: .5}, {d: 2, sh1: 98, ft1: 15, sh2: 100, ft2: 17}]},
  rdl: {tempo: '↓ 2,5 с · ↑ 1 с', att: [plate('w1', 15)],
    steps: [{hip: [101, 84], torso: -88, a1: [104, 147], a2: [100, 147], ft2: 0, hx1: 111}, {d: .3},
      {d: 2.4, hip: [92, 87], torso: -25, via: [{hip: [95, 86], torso: -58}]}, {d: .3},
      {d: 1.2, e: 'p', hip: [101, 84], torso: -88, via: [{hip: [95, 86], torso: -58}]}]},
  legCurl: {tempo: '↑ 1 с · пауза · ↓ 2 с',
    props: '<rect class="eqf" x="24" y="105" width="100" height="7" rx="3"/><path class="eq" d="M38 112V151M112 112V151"/><circle class="eqf" cx="123" cy="98" r="3.5"/>',
    att: shinPad([123, 98], 27),
    steps: [{hip: [90, 97], torso: 180, flip: true, th1: 2, sh1: 4, ft1: 94, th2: 2, sh2: 6, ft2: 96, ua1: 118, fa1: 172}, {d: .2},
      {d: 1, e: 'p', sh1: -118, ft1: -28, sh2: -116, ft2: -26}, {d: .4}, {d: 2, sh1: 4, ft1: 94, sh2: 6, ft2: 96}]},
  smithPress: {tempo: '↑ 1 с · ↓ 2 с',
    props: `<path class="rail" d="M106 6V151"/><path class="pad" d="M82 126H112"/><path class="pad" d="${bl([96, 116], -92, -4, 48)}"/><path class="eq" d="M98 130V151"/>`,
    att: [plate('w1', 13)],
    steps: [{hip: [96, 116], torso: -92, a1: [126, 147], a2: [122, 147], ft2: 0, w1: [106, 72]}, {d: .3},
      {d: 1, e: 'p', w1: [106, 26]}, {d: .4}, {d: 2, w1: [106, 72]}]},
  lateral: {cap: 'Вигляд спереду', tempo: '↑ 1 с · ↓ 2 с', front: true, att: [db('w1'), db('w2')],
    steps: [{hip: [110, 83], torso: -90, sw: 15, hw: 9, sym: true, th1: 91, sh1: 90, fl: 4, ft1: 20, ua1: 80, fa1: 86}, {d: .2},
      {d: 1, e: 'p', ua1: -2, fa1: 8}, {d: .3}, {d: 2, ua1: 80, fa1: 86}]},
  rearDelt: {cap: 'Збоку і спереду: руки розводяться в сторони до лінії плечей', tempo: '↑ 1 с · ↓ 2 с',
    extra: '<path class="divider" d="M73 18V146"/>',
    parts: [
      {tx: -76, lbl: [112, 14, 'ЗБОКУ'], att: [dbS('w1')],
        steps: [{hip: [84, 88], torso: -12, ht: -5, a1: [104, 147], a2: [100, 147], ft2: 0, ua1: 92, fa1: 96, ual: 26, fal: 24}, {d: .2},
          {d: 1, e: 'p', ua1: 100, fa1: 120, ual: 3, fal: 3}, {d: .4}, {d: 2, ua1: 92, fa1: 96, ual: 26, fal: 24}]},
      {tx: 36, lbl: [110, 14, 'СПЕРЕДУ'], front: true, att: [db('w1'), db('w2')],
        steps: [{hip: [110, 88], torso: -90, tl: 15, neck: 4, sw: 15, hw: 8, sym: true, th1: 91, sh1: 92, shl: 26, fl: 4, ft1: 20, ua1: 88, fa1: 92}, {d: .2},
          {d: 1, e: 'p', ua1: -4, fa1: 14}, {d: .4}, {d: 2, ua1: 88, fa1: 92}]}
    ]}
};

// Доповнює позу значеннями за замовчуванням і дзеркалить/копіює другу сторону тіла
function norm(p) {
  const q = Object.assign({tl: L.tl, neck: L.neck, ht: 0, sw: 0, hw: 0, ual: L.ua, fal: L.fa, thl: L.th, shl: L.sh, fl: L.foot, eb1: 1, kb1: -1, ft1: 0}, p);
  const cx = (q.hip || q.sc)[0], m = !!q.sym;
  const mx = v => [2 * cx - v[0], v[1]], ma = a => 180 - a;
  if (q.w2 == null && q.ua2 == null && q.hx2 == null) {
    if (q.w1) q.w2 = m ? mx(q.w1) : q.w1;
    if (q.hx1 != null) q.hx2 = m ? 2 * cx - q.hx1 : q.hx1;
    if (q.ua1 != null) { q.ua2 = m ? ma(q.ua1) : q.ua1; q.fa2 = m ? ma(q.fa1) : q.fa1; }
  }
  if (q.eb2 == null) q.eb2 = m ? -q.eb1 : q.eb1;
  if (q.a2 == null && q.th2 == null) {
    if (q.a1) q.a2 = m ? mx(q.a1) : q.a1;
    if (q.th1 != null) { q.th2 = m ? ma(q.th1) : q.th1; q.sh2 = m ? ma(q.sh1) : q.sh1; }
  }
  if (q.kb2 == null) q.kb2 = m ? -q.kb1 : q.kb1;
  if (q.ft2 == null) q.ft2 = m ? ma(q.ft1) : q.ft1;
  return q;
}
function solve(raw) {
  const q = norm(raw), J = {};
  if (q.sc) { J.sc = q.sc; J.hip = P2(q.sc, q.torso + 180, q.tl); }
  else { J.hip = q.hip; J.sc = P2(q.hip, q.torso, q.tl); }
  J.s1 = P2(J.sc, q.torso + 90, q.sw); J.s2 = P2(J.sc, q.torso - 90, q.sw);
  J.h1 = P2(J.hip, q.torso + 90, q.hw); J.h2 = P2(J.hip, q.torso - 90, q.hw);
  J.head = P2(J.sc, q.torso + q.ht, q.neck);
  for (const s of [1, 2]) {
    const S = J['s' + s], H = J['h' + s];
    let w = q['w' + s];
    if (q['hx' + s] != null) { // снаряд вільно висить на прямих руках на заданій вертикалі
      const x = q['hx' + s], R = q.ual + q.fal - 1.2;
      w = [x, S[1] + Math.sqrt(Math.max(0, R * R - (x - S[0]) ** 2))];
    }
    if (w) [J['e' + s], J['w' + s]] = ik(S, w, q.ual, q.fal, q['eb' + s]);
    else { J['e' + s] = P2(S, q['ua' + s], q.ual); J['w' + s] = P2(J['e' + s], q['fa' + s], q.fal); }
    if (q['a' + s]) [J['k' + s], J['a' + s]] = ik(H, q['a' + s], q.thl, q.shl, q['kb' + s]);
    else if (q['th' + s] != null) { J['k' + s] = P2(H, q['th' + s], q.thl); J['a' + s] = P2(J['k' + s], q['sh' + s], q.shl); }
    else J['k' + s] = J['a' + s] = H;
    J['t' + s] = P2(J['a' + s], q['ft' + s], q.fl);
  }
  return {q, J};
}
const lerpVal = (a, b, f) => typeof a === 'number' && typeof b === 'number' ? a + (b - a) * f
  : Array.isArray(a) && Array.isArray(b) ? a.map((v, i) => v + (b[i] - v) * f) : (a ?? b);
function lerpPose(A, B, f) { const o = {}; for (const k in {...A, ...B}) o[k] = lerpVal(A[k], B[k], f); return o; }
function timeline(steps) {
  const keys = []; let t = 0, cur = {};
  steps.forEach(s => { const {d = 0, e = 'io', via, ...ch} = s; t += d; cur = {...cur, ...ch}; keys.push({t, q: {...cur}, e, via}); });
  return keys;
}
function poseAt(keys, t) {
  let i = 1;
  while (i < keys.length - 1 && keys[i].t < t) i++;
  const A = keys[i - 1], B = keys[i], span = B.t - A.t;
  const f = EASE[B.e](span > 0 ? Math.min(1, Math.max(0, (t - A.t) / span)) : 1);
  const q = lerpPose(A.q, B.q, f);
  if (B.via) { // плавна траєкторія через проміжні точки
    const n = B.via.length + 1, s = f * n, j = Math.min(n - 1, Math.floor(s));
    for (const k in B.via[0]) { const seq = [A.q[k], ...B.via.map(v => v[k]), B.q[k]]; q[k] = lerpVal(seq[j], seq[j + 1], s - j); }
  }
  return q;
}
function torsoPath(J, q, front) {
  const u = ang(J.hip, J.sc), len = dist(J.hip, J.sc);
  const P = (t, o) => P2(P2(J.hip, u, len * t), u + 90, o);
  let pts;
  if (front) {
    const a = q.sw + 4, b = q.hw + 4;
    pts = [P(1.02, -a), P(1.02, a), P(.62, q.sw), P(.3, q.hw + 2), P(-.04, b), P(-.04, -b), P(.3, -q.hw - 2), P(.62, -q.sw)];
  } else { // профіль: спина з прогином у попереку, груди, живіт
    const k = q.flip ? -1 : 1;
    pts = [[-.05, -5], [.3, -4.4], [.72, -6.2], [1, -5], [1.06, 0], [1, 4.5], [.8, 8.5], [.55, 7], [.28, 6.3], [-.02, 6]].map(([t, o]) => P(t, o * k));
  }
  return 'M' + pts.map(pt).join('L') + 'Z';
}
function buildPart(p, T, N, an, anT) {
  const keys = timeline(p.steps), F = [];
  for (let i = 0; i <= N; i++) F.push(solve(poseAt(keys, i / N * T)));
  const path = (cls, fn) => { const v = F.map(f => fn(f.J, f.q)); return `<path class="${cls}" d="${v[0]}">${an('d', v)}</path>`; };
  const chain = (...ks) => J => 'M' + ks.map(k => pt(J[k])).join('L');
  const dot = (cls, r, fn) => {
    const v = F.map(f => fn(f.J, f.q));
    return `<circle class="${cls}" r="${r}" cx="${f1(v[0][0])}" cy="${f1(v[0][1])}">${an('cx', v.map(c => f1(c[0])))}${an('cy', v.map(c => f1(c[1])))}</circle>`;
  };
  const att = back => (p.att || []).filter(a => !!a.back === back).map(a => {
    if (a.o === 'line') return path(a.cls, (J, q) => 'M' + pt(a.a(J, q)) + 'L' + pt(a.b(J, q)));
    const v = F.map(f => pt(a.at(f.J, f.q)));
    return `<g transform="translate(${v[0]})">${anT(v)}${SHAPES[a.o](a)}</g>`;
  }).join('');
  const arm = (s, far) => path('limb arm' + (far ? ' far' : ''), chain('s' + s, 'e' + s, 'w' + s));
  const leg = (s, far) => path('limb leg' + (far ? ' far' : ''), chain('h' + s, 'k' + s, 'a' + s, 't' + s));
  let s = (p.props || '') + att(true);
  if (p.body === false) s += arm(2) + arm(1);
  else if (p.front) {
    s += leg(2) + leg(1) + path('torso', (J, q) => torsoPath(J, q, true)) + path('limb neck', chain('sc', 'head'))
      + dot('headc', L.head, J => J.head) + arm(2) + arm(1);
  } else {
    s += leg(2, true) + arm(2, true) + path('torso', (J, q) => torsoPath(J, q, false)) + path('limb neck', chain('sc', 'head'))
      + dot('headc', L.head, J => J.head)
      + dot('eye', 1.6, (J, q) => { const n = q.torso + q.ht; return P2(P2(J.head, n + (q.flip ? -90 : 90), 4.2), n, 1.5); })
      + leg(1) + arm(1);
  }
  s += att(false);
  if (p.lbl) s += `<text class="lbl" x="${p.lbl[0]}" y="${p.lbl[1]}" text-anchor="middle">${p.lbl[2]}</text>`;
  return p.tx ? `<g transform="translate(${p.tx} 0)">${s}</g>` : s;
}
function buildFig(key) {
  const sp = ANIM[key], parts = sp.parts || [sp];
  const keys0 = timeline(parts[0].steps), T = keys0[keys0.length - 1].t;
  const N = Math.max(24, Math.round(T * 20));
  const kt = Array.from({length: N + 1}, (_, i) => (i / N).toFixed(4)).join(';');
  const common = `dur="${T.toFixed(2)}s" repeatCount="indefinite" keyTimes="${kt}"`;
  const an = (attr, vals) => `<animate attributeName="${attr}" ${common} values="${vals.join(';')}"/>`;
  const anT = vals => `<animateTransform attributeName="transform" type="translate" ${common} values="${vals.join(';')}"/>`;
  let s = `<svg class="fig" viewBox="${sp.vb || '0 0 220 165'}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Анімація техніки">`;
  if (!sp.noFloor) s += '<line class="floor" x1="4" y1="152" x2="216" y2="152"/>';
  s += (sp.extra || '') + parts.map(p => buildPart(p, T, N, an, anT)).join('');
  return s + '</svg>';
}

module.exports = {ANIM, timeline, poseAt, solve, L, P2, ang, dist};
