const CACHE_NAME = 'yandex-home-v3';
const CACHE_VERSION = '3.0.0';
const STATIC_CACHE_TIME = 365 * 24 * 60 * 60 * 1000; // 1 год в миллисекундах

// Более агрессивный список ресурсов для кеширования
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

// Паттерны для определения кешируемых ресурсов
const CACHE_PATTERNS = [
  /\/assets\/.*\.(js|css|woff2|woff|ttf|otf|png|webp|avif|svg|jpg|jpeg|gif|ico)$/,
  /\/dz-perfomance-vite\/assets\//,
  /\.(js|css|woff2|png|webp|avif|svg)$/
];

// Установка Service Worker с агрессивным кешированием
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker v2: Кеширование статических ресурсов на 1 год');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Добавляем timestamp для отслеживания времени кеширования
        return caches.open(CACHE_NAME).then(cache => {
          const cacheTimestamp = {
            timestamp: Date.now(),
            version: CACHE_VERSION,
            expiry: Date.now() + STATIC_CACHE_TIME
          };
          return cache.put('cache-metadata', new Response(JSON.stringify(cacheTimestamp)));
        });
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

// Максимально агрессивное кеширование для обхода GitHub Pages
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Проверяем, является ли запрос статическим ресурсом
  const isStaticAsset = CACHE_PATTERNS.some(pattern => pattern.test(url.pathname)) || 
                        STATIC_ASSETS.includes(url.pathname) ||
                        url.pathname.includes('/assets/');
  
  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
          if (cachedResponse) {
            // ПРИНУДИТЕЛЬНО возвращаем из кеша БЕЗ проверки сети
            console.log('Service Worker v3: Принудительный возврат из кеша (bypass network)', url.pathname);
            return cachedResponse;
          }
          
          // Если нет в кеше, загружаем один раз и кешируем навсегда
          return fetch(request).then(response => {
            if (response.status === 200) {
              const responseClone = response.clone();
              
              // Создаем новый ответ с принудительными заголовками
              const headers = new Headers(responseClone.headers);
              headers.set('Cache-Control', 'public, max-age=31536000, immutable');
              headers.set('Expires', new Date(Date.now() + STATIC_CACHE_TIME).toUTCString());
              headers.set('ETag', `"sw-${Date.now()}"`);
              
              const newResponse = new Response(responseClone.body, {
                status: responseClone.status,
                statusText: responseClone.statusText,
                headers: headers
              });
              
              cache.put(request, newResponse.clone());
              console.log('Service Worker v3: Кеширование навсегда', url.pathname);
              return newResponse;
            }
            return response;
          }).catch(() => {
            // Если сеть недоступна, возвращаем из кеша (если есть)
            return cachedResponse || new Response('Offline', { status: 503 });
          });
        });
      })
    );
  }
  
  // Для HTML файлов - стратегия "сеть первая" с коротким кешированием
  else if (request.headers.get('Accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                // HTML кешируем на 5 минут
                const headers = new Headers(responseClone.headers);
                headers.set('Cache-Control', 'public, max-age=300');
                
                const newResponse = new Response(responseClone.body, {
                  status: responseClone.status,
                  statusText: responseClone.statusText,
                  headers: headers
                });
                
                cache.put(request, newResponse);
              });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
  }
});

// Периодическая очистка истекших кешей
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CACHE_CLEANUP') {
    caches.open(CACHE_NAME).then(cache => {
      cache.match('cache-metadata').then(metaResponse => {
        if (metaResponse) {
          metaResponse.json().then(metadata => {
            if (Date.now() > metadata.expiry) {
              console.log('Service Worker: Очистка истекшего кеша');
              caches.delete(CACHE_NAME);
            }
          });
        }
      });
    });
  }
}); 