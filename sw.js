/**
 * MiniBook V3 - Service Worker (离线缓存)
 */

const CACHE_NAME = 'minibook-v3-cache-20260508';
const ASSETS = [
  './',
  './index.html',
  './css/base.css',
  './css/mobile.css',
  './css/desktop.css',
  './js/db.js',
  './js/app.js',
  './js/mobile.js',
  './js/desktop.js',
  './manifest.json',
];

// 安装: 预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// 激活: 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 请求拦截: Cache First
self.addEventListener('fetch', (event) => {
  // 只缓存同源请求
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // 缓存新资源
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // 离线回退
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
