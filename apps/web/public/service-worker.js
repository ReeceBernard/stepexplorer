const CACHE_NAME = "exploration-map-v1";
const STATIC_CACHE = "exploration-map-static-v1";
const DYNAMIC_CACHE = "exploration-map-dynamic-v1";

// Assets to cache on install
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-16x16.png",
  "/icons/icon-32x32.png",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/apple-touch-icon.png",
  "/styles.css",
  "/script.js",
];

// Install event
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing...");
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("Service Worker: Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error("Service Worker: Error caching static assets:", error);
      })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activating...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log("Service Worker: Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    // Handle map tiles separately - cache them for offline use
    if (
      url.hostname.includes("cartocdn.com") ||
      url.hostname.includes("openstreetmap.org")
    ) {
      event.respondWith(
        caches.open(DYNAMIC_CACHE).then((cache) => {
          return cache.match(request).then((response) => {
            if (response) {
              return response;
            }
            return fetch(request)
              .then((fetchResponse) => {
                // Only cache successful map tile responses
                if (fetchResponse.status === 200) {
                  cache.put(request, fetchResponse.clone());
                }
                return fetchResponse;
              })
              .catch(() => {
                // Return a placeholder tile if offline and not cached
                return new Response("", { status: 404 });
              });
          });
        })
      );
    }
    return;
  }

  // Handle same-origin requests
  if (request.method === "GET") {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }

        return fetch(request)
          .then((fetchResponse) => {
            // Don't cache API responses or very large files
            if (
              !request.url.includes("/api/") &&
              fetchResponse.status === 200 &&
              fetchResponse.headers.get("content-length") < 1024 * 1024 // 1MB limit
            ) {
              const responseClone = fetchResponse.clone();
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }

            return fetchResponse;
          })
          .catch(() => {
            // Return offline page or cached version
            if (request.destination === "document") {
              return caches.match("/") || new Response("Offline");
            }
            return new Response("", { status: 404 });
          });
      })
    );
  }
});

// Background sync for location updates (if supported)
self.addEventListener("sync", (event) => {
  if (event.tag === "location-sync") {
    event.waitUntil(
      // Handle offline location updates here
      console.log("Background sync: location-sync triggered")
    );
  }
});

// Push notifications (if you plan to add them later)
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "New exploration area discovered!",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: "1",
    },
    actions: [
      {
        action: "explore",
        title: "Explore",
        icon: "/icons/explore-icon.png",
      },
      {
        action: "close",
        title: "Close",
        icon: "/icons/close-icon.png",
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification("Exploration Map", options)
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "explore") {
    event.waitUntil(clients.openWindow("/"));
  }
});
