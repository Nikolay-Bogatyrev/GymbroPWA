// GymBro Service Worker
// Стратегии:
//   - HTML / JS / CSS / JSON: network-first (всегда свежий код, fallback на кэш если оффлайн)
//   - manifest, иконки, изображения: cache-first
//   - Внешние ресурсы (YouTube, CDN): не трогаем (default browser fetch)

const CACHE_NAME = 'gymbroPWA-v10';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS).catch((e) => console.warn('SW preCache:', e)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Не трогаем сторонние ресурсы (YouTube, CDN-ы) — default browser fetch
  if (url.origin !== self.location.origin) return;

  const isHtml = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  const isCode = /\.(js|css|json)$/.test(url.pathname);

  // Network-first для HTML/JS/CSS — чтобы новые деплои сразу подхватывались
  if (isHtml || isCode) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first для статики (картинки, иконки)
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }))
  );
});

// Принудительное обновление по сообщению от страницы
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
