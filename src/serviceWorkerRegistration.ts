export interface ServiceWorkerStatus {
  isRegistered: boolean;
  isSupported: boolean;
  isOnline: boolean;
  cacheCount: number;
  cacheName: string;
}

export function registerServiceWorker(
  onStatusChange?: (status: ServiceWorkerStatus) => void,
  onOffline?: () => void,
  onOnline?: () => void
): void {
  if (typeof window === "undefined") return;

  const isSupported = "serviceWorker" in navigator;
  let status: ServiceWorkerStatus = {
    isRegistered: false,
    isSupported,
    isOnline: navigator.onLine,
    cacheCount: 0,
    cacheName: "agunnaya-studio-v1"
  };

  const updateStatus = (partial: Partial<ServiceWorkerStatus>) => {
    status = { ...status, ...partial };
    if (onStatusChange) {
      onStatusChange(status);
    }
  };

  // Listen for online / offline events
  window.addEventListener("online", () => {
    updateStatus({ isOnline: true });
    if (onOnline) onOnline();
  });

  window.addEventListener("offline", () => {
    updateStatus({ isOnline: false });
    if (onOffline) onOffline();
  });

  if (!isSupported) {
    console.warn("[SW] Service Workers are not supported in this browser environment.");
    updateStatus({ isSupported: false });
    return;
  }

  // Register service worker after window load
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        console.log("[SW] Registered successfully with scope:", registration.scope);
        updateStatus({ isRegistered: true });

        // Query cache status from worker
        if (registration.active) {
          queryCacheStatus((count, name) => {
            updateStatus({ cacheCount: count, cacheName: name });
          });
        }

        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === "installed") {
                if (navigator.serviceWorker.controller) {
                  console.log("[SW] New content available; please refresh.");
                } else {
                  console.log("[SW] Content cached for offline use!");
                  queryCacheStatus((count, name) => {
                    updateStatus({ cacheCount: count, cacheName: name });
                  });
                }
              }
            };
          }
        };
      })
      .catch((error) => {
        console.warn("[SW] Service Worker registration failed:", error);
        updateStatus({ isRegistered: false });
      });
  });
}

export function queryCacheStatus(callback: (cachedCount: number, cacheName: string) => void): void {
  if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) {
    // Fallback using CacheStorage API directly
    if ("caches" in window) {
      caches.keys().then((keys) => {
        if (keys.length > 0) {
          caches.open(keys[0]).then((cache) => {
            cache.keys().then((reqs) => {
              callback(reqs.length, keys[0]);
            });
          });
        } else {
          callback(0, "agunnaya-studio-v1");
        }
      });
    } else {
      callback(0, "agunnaya-studio-v1");
    }
    return;
  }

  const messageChannel = new MessageChannel();
  messageChannel.port1.onmessage = (event) => {
    if (event.data && event.data.type === "CACHE_STATUS_RESPONSE") {
      callback(event.data.cachedCount, event.data.cacheName);
    }
  };

  navigator.serviceWorker.controller.postMessage(
    { type: "GET_CACHE_STATUS" },
    [messageChannel.port2]
  );
}

export function unregisterServiceWorker(): void {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister().then(() => {
        console.log("[SW] Unregistered Service Worker successfully.");
      });
    });
  }
}
