/** 마이매쓰 서비스 워커 — PWA 설치 지원용 (최소 구현) */

const CACHE_NAME = 'mymath-v1';

/** 설치 시 기본 셸 캐싱 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['/', '/manifest.json', '/favicon.svg', '/icon-192.png'])
    )
  );
  self.skipWaiting();
});

/** 활성화 시 이전 캐시 정리 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/** 네트워크 우선, 실패 시 캐시 폴백 */
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
