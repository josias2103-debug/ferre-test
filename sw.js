// sw.js - Service Worker Ferretería Pro
const CACHE_NAME = 'ferreteria-v3-static';
const DYNAMIC_CACHE = 'ferreteria-v3-dynamic';

// Archivos críticos para funcionamiento offline
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './js/app.js',
  './js/cloud-service.js',
  './js/db.js',
  './js/templates.js',
  'https://cdn.tailwindcss.com?plugins=forms,container-queries',
  'https://unpkg.com/vue@3/dist/vue.global.js',
  'https://unpkg.com/html5-qrcode',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap'
];

// Instalación: Cachear recursos estáticos
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Cacheando App Shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activación: Limpiar cachés viejas
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activando...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
            console.log('[Service Worker] Borrando caché vieja:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch: Interceptar peticiones
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. Estrategia para API Google Scripts (Network Only con Fallback manual en app.js)
  // No cacheamos la API en el SW porque 'cloud-service.js' ya maneja LocalStorage
  if (url.hostname.includes('script.google.com')) {
    return; 
  }

  // 2. Estrategia Stale-While-Revalidate para recursos estáticos
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        return caches.open(DYNAMIC_CACHE).then(cache => {
          // Guardar copia actualizada solo si es válida
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
      }).catch(() => {
        // Si falla red y no hay caché, retornar offline fallback (opcional)
      });

      return cachedResponse || fetchPromise;
    })
  );
});
