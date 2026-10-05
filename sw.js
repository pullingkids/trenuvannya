/* Service worker: застосунок працює без інтернету після першого відкриття.
   Після зміни файлів застосунку збільшуй VERSION, щоб телефон підтягнув нову версію. */
const VERSION = 'v1';
const SHELL = 'shell-' + VERSION;
const RUNTIME = 'runtime-v1';
const LOTTIE = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
const SHELL_FILES = [
  './', './index.html', './manifest.webmanifest',
  './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL);
    await shell.addAll(SHELL_FILES);
    // програвач анімацій — щоб анімації працювали в залі без зв'язку
    try {
      const res = await fetch(LOTTIE, {mode: 'cors'});
      if (res.ok) await (await caches.open(RUNTIME)).put(LOTTIE, res);
    } catch (e) { /* немає мережі — закешується при першому використанні */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('shell-') && k !== SHELL).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname === 'cdnjs.cloudflare.com') return event.respondWith(cacheFirst(req));
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/animations/')) return event.respondWith(networkFirst(req));
  if (req.mode === 'navigate') return event.respondWith(staleWhileRevalidate(req, './index.html'));
  event.respondWith(staleWhileRevalidate(req));
});

// миттєво з кешу, а в фоні оновлюємо — нова версія з'явиться при наступному запуску
async function staleWhileRevalidate(req, key) {
  const cache = await caches.open(SHELL);
  const cached = await cache.match(key || req, {ignoreSearch: true});
  const network = fetch(req).then(res => {
    if (res.ok) cache.put(key || req, res.clone());
    return res;
  }).catch(() => null);
  return cached || (await network) || new Response('Немає зʼєднання', {status: 503});
}

async function cacheFirst(req) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(req.url);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req.url, res.clone());
  return res;
}

// анімації: свіжі з мережі, без мережі — збережена копія
async function networkFirst(req) {
  const cache = await caches.open(RUNTIME);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req.url, res.clone());
    return res;
  } catch (e) {
    return (await cache.match(req.url)) || new Response('', {status: 504});
  }
}
