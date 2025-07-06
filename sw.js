const CACHE_NAME = 'dz-performance-v1';
const STATIC_CACHE_NAME = 'dz-performance-static-v1';

// Ресурсы для кеширования
const STATIC_ASSETS = [
  '/dz-perfomance-vite/',
  '/dz-perfomance-vite/index.html',
  '/dz-perfomance-vite/assets/logo.svg',
  '/dz-perfomance-vite/assets/bg@2x-optimized.jpg',
  '/dz-perfomance-vite/assets/cloud-drizzle.svg',
  '/dz-perfomance-vite/assets/icon_temperature.svg',
  '/dz-perfomance-vite/assets/icon_temperature_2.svg',
  '/dz-perfomance-vite/assets/icon_sun.svg',
  '/dz-perfomance-vite/assets/icon_sun_2.svg',
  '/dz-perfomance-vite/assets/icon_scheduled.svg',
  '/dz-perfomance-vite/assets/arrow-left.png',
  '/dz-perfomance-vite/assets/arrow-down.svg',
  '/dz-perfomance-vite/assets/icon_list_m@1x.svg',
  '/dz-perfomance-vite/assets/lato.woff2'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Кеширование статических ресурсов');
        return cache.addAll(STATIC_ASSETS);
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== CACHE_NAME) {
            console.log('Удаление старого кеша:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Стратегия кеширования для статических ресурсов
  if (STATIC_ASSETS.includes(url.pathname) || 
      url.pathname.includes('/assets/') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css')) {
    
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response; // Возвращаем из кеша
          }
          return fetch(request)
            .then((response) => {
              // Кешируем новый ответ
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(STATIC_CACHE_NAME)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
              return response;
            });
        })
    );
  } else {
    // Для остальных запросов используем стратегию "сначала сеть, потом кеш"
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
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