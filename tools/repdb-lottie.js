// Збирає Lottie-анімації вправ з ілюстрацій RepDB (старт ↔ пікова точка, плавний перехід).
// Зображення: animations/img/<slug>-start.webp і <slug>-peak.webp
// Exercise data by RepDB (repdb.co) — безкоштовна ліцензія з обов'язковою атрибуцією.
// Запуск з кореня проєкту: node tools/repdb-lottie.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

// id вправи в застосунку → slug ілюстрації RepDB
const MAP = {
  bench: 'bench-press', inclDb: 'incline-db-press', smithIncl: 'smith-machine-incline-bench-press', flyes: 'db-fly',
  dips: 'dips', french: 'ez-bar-lying-tricep-extension', pullup: 'pull-up', bbRow: 'barbell-row', dbRow: 'single-arm-db-row',
  latPull: 'lat-pulldown', curl: 'barbell-curl', hack: 'hack-squat', legPress: 'leg-press', legExt: 'leg-extension',
  rdl: 'romanian-deadlift', legCurl: 'leg-curl', smithPress: 'seated-smith-machine-shoulder-press', lateral: 'lateral-raise',
  rearDelt: 'rear-delt-fly'
};
const NAMES = {};
for (const m of fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/\{id: '(\w+)', name: '([^']+)'/g)) NAMES[m[1]] = m[2];

const FR = 30, SIZE = 512;
// цикл: старт 1 с → перехід 0,6 с → пікова точка 0,8 с → перехід 0,6 с
const T_START = 30, T_FADE = 18, T_PEAK = 24, OP = T_START + T_FADE + T_PEAK + T_FADE;
const ease = {i: {x: [0.45], y: [1]}, o: {x: [0.55], y: [0]}};
const layer = (ind, refId, nm, opacity) => ({
  ddd: 0, ind, ty: 2, nm, refId, sr: 1, ao: 0, ip: 0, op: OP, st: 0, bm: 0,
  ks: {o: opacity, r: {a: 0, k: 0}, p: {a: 0, k: [SIZE / 2, SIZE / 2, 0]}, a: {a: 0, k: [SIZE / 2, SIZE / 2, 0]}, s: {a: 0, k: [100, 100, 100]}}
});

for (const [id, slug] of Object.entries(MAP)) {
  for (const p of ['start', 'peak']) if (!fs.existsSync(path.join(ROOT, 'animations/img', `${slug}-${p}.webp`))) throw new Error('немає ' + slug + '-' + p);
  const peakOpacity = {a: 1, k: [
    {t: T_START, s: [0], ...ease},
    {t: T_START + T_FADE, s: [100], ...ease},
    {t: T_START + T_FADE + T_PEAK, s: [100], ...ease},
    {t: OP, s: [0]}
  ]};
  const json = {
    v: '5.7.4', fr: FR, ip: 0, op: OP, w: SIZE, h: SIZE, nm: NAMES[id], ddd: 0, markers: [],
    assets: [
      {id: 'start', w: SIZE, h: SIZE, u: 'img/', p: `${slug}-start.webp`, e: 0},
      {id: 'peak', w: SIZE, h: SIZE, u: 'img/', p: `${slug}-peak.webp`, e: 0}
    ],
    layers: [layer(1, 'peak', 'peak', peakOpacity), layer(2, 'start', 'start', {a: 0, k: 100})] // перший шар — верхній
  };
  fs.writeFileSync(path.join(ROOT, 'animations', NAMES[id] + '.json'), JSON.stringify(json));
  console.log(`${id.padEnd(11)} → ${NAMES[id]}.json (${slug})`);
}
