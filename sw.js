const CACHE_NAME = 'yandex-home-v1';
const STATIC_ASSETS = [
  '/dz-perfomance-vite/',
  '/dz-perfomance-vite/assets/lato.woff2',
  '/dz-perfomance-vite/assets/logo.svg',
  '/dz-perfomance-vite/assets/bg@2x.avif',
  '/dz-perfomance-vite/assets/bg@1x.avif',
  '/dz-perfomance-vite/assets/bg@2x.webp',
  '/dz-perfomance-vite/assets/bg@1x.webp',
  '/dz-perfomance-vite/assets/bg@2x.png',
  '/dz-perfomance-vite/assets/cloud-drizzle.svg',
  '/dz-perfomance-vite/assets/icon_temperature.svg',
  '/dz-perfomance-vite/assets/icon_temperature_2.svg',
  '/dz-perfomance-vite/assets/icon_sun.svg',
  '/dz-perfomance-vite/assets/icon_sun_2.svg',
  '/dz-perfomance-vite/assets/icon_scheduled.svg',
  '/dz-perfomance-vite/assets/icon_list_m@1x.svg',
  '/dz-perfomance-vite/assets/arrow-down.svg',
  '/dz-perfomance-vite/assets/arrow-left.png'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Кеширование статических ресурсов');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Удаление старого кеша', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Обработка запросов
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Кеширование статических ресурсов
  if (request.url.includes('/assets/') || STATIC_ASSETS.includes(new URL(request.url).pathname)) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(request).then((response) => {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
              });
            return response;
          });
        })
    );
  }
  
  // Для HTML файлов - сеть первая, потом кеш
  else if (request.headers.get('Accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseClone);
            });
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
  }
}); 