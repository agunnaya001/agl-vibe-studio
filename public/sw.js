// Agunnaya Studio Service Worker - Core Asset & App Shell Caching
const CACHE_NAME = "agunnaya-studio-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico"
];

// Install Event - Pre-cache core shell assets
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Pre-caching core application shell & static assets...");
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Some assets failed to precache during install:", err);
      });
    })
  );
});

// Activate Event - Clean up stale caches and claim clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log("[SW] Deleting old cache storage:", name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Dynamic caching strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests or WebSocket / HMR requests
  if (request.method !== "GET" || url.pathname.includes("vite-hmr") || url.pathname.includes("socket.io")) {
    return;
  }

  // Handle navigation requests (HTML document) - Stale-while-revalidate or cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback to cached shell
          return caches.match("/index.html").then((cached) => {
            return cached || caches.match("/");
          });
        })
    );
    return;
  }

  // Handle static assets (JS, CSS, Images, Fonts) - Stale-while-revalidate
  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "image" ||
    request.destination === "font" ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch((err) => {
            console.log("[SW] Network fetch failed for asset, serving cached version if available:", request.url);
          });

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // For all other GET requests (e.g., API calls, external resources), try network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && url.origin === self.location.origin) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// PostMessage Handler for status queries or explicit cache reloads
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (event.data && event.data.type === "GET_CACHE_STATUS") {
    caches.open(CACHE_NAME).then((cache) => {
      cache.keys().then((keys) => {
        event.ports[0].postMessage({
          type: "CACHE_STATUS_RESPONSE",
          cachedCount: keys.length,
          cacheName: CACHE_NAME
        });
      });
    });
  }
});
