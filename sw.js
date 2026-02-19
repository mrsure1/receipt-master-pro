
const CACHE_NAME = 'receipt-master-v1';
const ASSETS = [
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 일부 파일이 없더라도 전체 설치가 실패하지 않도록 처리
      return Promise.allSettled(ASSETS.map(asset => cache.add(asset)))
        .then(() => self.skipWaiting());
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // 다른 origin (CDN 등) 요청은 캐싱하지 않고 통과
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // 네트워크 실패 시 캐시된 index.html 반환 (오프라인 지원)
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
