/* ============================================================
   人間OS メカニズム辞典 - sw.js
   ------------------------------------------------------------
   ★ オフラインでも基本表示できるようにするためのキャッシュ。
   ★ ファイルを更新した時は CACHE_NAME のバージョン番号
     （-v1 の数字部分）を上げると、古いキャッシュが破棄されて
     新しいファイルに切り替わる。
============================================================ */

const CACHE_NAME = 'jinkan-os-jiten-v3';

const PRECACHE_URLS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './mechanisms.js',
  './books.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

/* インストール時：必要なファイルを先読みキャッシュ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

/* 有効化時：古いバージョンのキャッシュを掃除 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* fetch：キャッシュ優先 → なければネットワーク → 取得できたら保存
   ナビゲーション（画面遷移）がオフラインで失敗した場合は
   index.html を返してアプリの外枠だけは表示できるようにする */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => {
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return undefined;
        });
    })
  );
});
