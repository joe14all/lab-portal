/**
 * Service Worker for Offline PWA Support
 *
 * Implements offline-first caching strategy (Section 5.3.3)
 *
 * Cache Strategies:
 * - App Shell: Cache-first
 * - Manifest Data: Network-first with cache fallback
 * - API Calls: Network-only (queued when offline)
 * - Static Assets: Cache-first
 */

const CACHE_VERSION = "logistics-v1";
const CACHE_NAMES = {
  static: `${CACHE_VERSION}-static`,
  manifest: `${CACHE_VERSION}-manifest`,
  images: `${CACHE_VERSION}-images`,
};

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/src/main.jsx",
  "/src/App.jsx",
  "/src/index.css",
  "/src/App.css",
];

const MANIFEST_URLS = [
  "/api/logistics/routes",
  "/api/logistics/pickups",
  "/api/logistics/vehicles",
];

// =============================================================================
// INSTALL EVENT
// =============================================================================

self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");

  event.waitUntil(
    caches
      .open(CACHE_NAMES.static)
      .then((cache) => {
        console.log("[SW] Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Force activation immediately
        return self.skipWaiting();
      })
  );
});

// =============================================================================
// ACTIVATE EVENT
// =============================================================================

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");

  event.waitUntil(
    // Clean up old caches
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!Object.values(CACHE_NAMES).includes(cacheName)) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control immediately
        return self.clients.claim();
      })
  );
});

// =============================================================================
// FETCH EVENT
// =============================================================================

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // API requests: Network-first with cache fallback
  if (url.pathname.startsWith("/api/logistics")) {
    event.respondWith(networkFirstStrategy(request, CACHE_NAMES.manifest));
    return;
  }

  // Images: Cache-first
  if (request.destination === "image") {
    event.respondWith(cacheFirstStrategy(request, CACHE_NAMES.images));
    return;
  }

  // Static assets: Cache-first
  event.respondWith(cacheFirstStrategy(request, CACHE_NAMES.static));
});

// =============================================================================
// CACHE STRATEGIES
// =============================================================================

/**
 * Cache-first strategy
 * Tries cache first, falls back to network
 */
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error("[SW] Fetch failed:", error);

    // Return offline page if available
    const offlinePage = await cache.match("/offline.html");
    return offlinePage || new Response("Offline", { status: 503 });
  }
}

/**
 * Network-first strategy
 * Tries network first, falls back to cache
 */
async function networkFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log("[SW] Network failed, using cache for:", request.url);

    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    // Return error response
    return new Response(JSON.stringify({ error: "Offline", cached: false }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Network-only strategy
 * Always tries network, no cache
 */
async function networkOnlyStrategy(request) {
  try {
    return await fetch(request);
  } catch (error) {
    return new Response(JSON.stringify({ error: "Network unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// =============================================================================
// BACKGROUND SYNC
// =============================================================================

self.addEventListener("sync", (event) => {
  console.log("[SW] Sync event:", event.tag);

  if (event.tag === "sync-pending-actions") {
    event.waitUntil(syncPendingActions());
  }
});

/**
 * Sync pending actions from IndexedDB
 */
async function syncPendingActions() {
  console.log("[SW] Syncing pending actions...");

  // This would integrate with the offline queue
  // For now, just log
  return Promise.resolve();
}

// =============================================================================
// PUSH NOTIFICATIONS
// =============================================================================

self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");

  const data = event.data ? event.data.json() : {};

  const title = data.title || "Logistics Update";
  const options = {
    body: data.body || "You have a new update",
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    tag: data.tag || "logistics-update",
    data: data,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.notification.tag);

  event.notification.close();

  // Open or focus the app
  event.waitUntil(clients.openWindow(event.notification.data.url || "/"));
});

// =============================================================================
// MESSAGE HANDLING
// =============================================================================

self.addEventListener("message", (event) => {
  console.log("[SW] Message received:", event.data);

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }

  if (event.data.type === "GET_CACHE_STATS") {
    event.waitUntil(
      getCacheStats().then((stats) => {
        event.ports[0].postMessage(stats);
      })
    );
  }
});

/**
 * Get cache statistics
 */
async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {
    version: CACHE_VERSION,
    caches: [],
    totalSize: 0,
  };

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    stats.caches.push({
      name: cacheName,
      count: keys.length,
    });
  }

  return stats;
}

// =============================================================================
// PERIODIC BACKGROUND SYNC (if supported)
// =============================================================================

self.addEventListener("periodicsync", (event) => {
  console.log("[SW] Periodic sync event:", event.tag);

  if (event.tag === "cleanup-old-cache") {
    event.waitUntil(cleanupOldCache());
  }
});

/**
 * Clean up old cached data
 */
async function cleanupOldCache() {
  console.log("[SW] Cleaning up old cache...");

  const cache = await caches.open(CACHE_NAMES.manifest);
  const keys = await cache.keys();

  // Delete cache entries older than 7 days
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  for (const request of keys) {
    const response = await cache.match(request);
    const date = response.headers.get("date");

    if (date && new Date(date).getTime() < sevenDaysAgo) {
      await cache.delete(request);
    }
  }
}

console.log("[SW] Service worker loaded");
