/**
 * Service Worker - Production-Grade PWA Support
 * Enables offline gameplay and improves performance
 * Version: 20260501-symbol-rain-lifecycle-2
 */

/** @typedef {{ waitUntil: (promise: PromiseLike<unknown>) => void }} ExtendableWorkerEvent */
/** @typedef {ExtendableWorkerEvent & { request: Request; respondWith: (response: Promise<Response> | Response) => void }} FetchWorkerEvent */
/** @typedef {ExtendableWorkerEvent & { data?: any; ports: MessagePort[] }} MessageWorkerEvent */
/** @typedef {ExtendableWorkerEvent & { tag: string }} SyncWorkerEvent */
/** @typedef {ExtendableWorkerEvent & { data?: { json: () => any } }} PushWorkerEvent */
/** @typedef {ExtendableWorkerEvent & { notification: { close: () => void; data?: { url?: string } } }} NotificationClickWorkerEvent */

const serviceWorkerScope = /** @type {{
  clients: { claim: () => Promise<void>; openWindow: (url: string) => Promise<any> };
  registration: { showNotification: (title: string, options?: NotificationOptions) => Promise<void> };
  skipWaiting: () => Promise<void>;
}} */ (/** @type {unknown} */ (self));

const BUILD_VERSION = "20260501-symbol-rain-lifecycle-2";
const CACHE_PREFIX = "math-master";
const CACHE_NAME = `${CACHE_PREFIX}-static-${BUILD_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${BUILD_VERSION}`;
const APP_CACHE_PREFIXES = [`${CACHE_PREFIX}-static-`, `${CACHE_PREFIX}-runtime-`];
const ACTIVE_RUNTIME_PAGES = [
  "/src/pages/index.html",
  "/src/pages/level-select.html",
  "/src/pages/game.html",
];
const DYNAMIC_GAME_MODULES = [
  "/src/scripts/game-init.js",
  "/src/scripts/game-problem-manager.js",
  "/src/scripts/game-symbol-handler.stolen.js",
  "/src/scripts/game-symbol-handler.core.js",
  "/src/scripts/game-symbol-handler.events.js",
  "/src/scripts/game-symbol-handler.js",
  "/src/scripts/game-state-manager.js",
];

// Assets to cache immediately on install
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/level-select.html",
  "/game.html",
  "/manifest.json",
  "/src/pages/index.html",
  "/src/pages/level-select.html",
  "/src/pages/game.html",
  "/src/styles/css/index.css",
  "/src/styles/css/level-select.css",
  "/src/styles/css/game.css",
  "/src/styles/css/game-animations.css",
  "/src/styles/css/game-responsive.css",
  "/src/styles/css/game-modals.css",
  `/src/styles/css/game.css?v=${BUILD_VERSION}`,
  `/src/styles/css/game-responsive.css?v=${BUILD_VERSION}`,
  `/src/styles/css/game-modals.preload.css?v=${BUILD_VERSION}`,
  `/src/styles/css/lock-responsive.css?v=${BUILD_VERSION}`,
  "/src/styles/css/console.css",
  "/src/styles/css/worm-base.css",
  "/src/styles/css/worm-effects.css",
  "/src/styles/css/lock-responsive.css",
  "/src/styles/css/modern-ux-enhancements.css",
  "/src/scripts/service-worker-register.js",
  "/src/scripts/index-page.matrix.js",
  "/src/scripts/index-page.effects.js",
  "/src/scripts/index-page.ripple.js",
  "/src/scripts/index-page.core.js",
  "/src/scripts/index-page.js",
  "/src/scripts/level-select-page.effects.js",
  "/src/scripts/level-select-page.interactions.js",
  "/src/scripts/level-select-page.progress.js",
  "/src/scripts/level-select-page.js",
  "/src/scripts/game-page.js",
  "/src/scripts/utils.js",
  "/src/scripts/constants.js",
  "/src/scripts/ux-enhancements.js",
  "/src/scripts/lazy-component-loader.js",
  "/src/scripts/display-manager.js",
  `/src/scripts/display-manager.js?v=${BUILD_VERSION}`,
  `/src/scripts/display-manager.mobile.js?v=${BUILD_VERSION}`,
  "/src/scripts/performance-monitor.js",
  "/src/scripts/3rdDISPLAY.js",
  `/src/scripts/symbol-rain.helpers.js?v=${BUILD_VERSION}`,
  `/src/scripts/symbol-rain.helpers.utils.js?v=${BUILD_VERSION}`,
  `/src/scripts/symbol-rain.helpers.spatial.js?v=${BUILD_VERSION}`,
  `/src/scripts/symbol-rain.helpers.face-reveal.js?v=${BUILD_VERSION}`,
  `/src/scripts/symbol-rain.helpers.pool.js?v=${BUILD_VERSION}`,
  `/src/scripts/symbol-rain.helpers.spawn.js?v=${BUILD_VERSION}`,
  `/src/scripts/symbol-rain.helpers.interactions.js?v=${BUILD_VERSION}`,
  `/src/scripts/symbol-rain.config.js?v=${BUILD_VERSION}`,
  `/src/scripts/symbol-rain.spawn.js?v=${BUILD_VERSION}`,
  `/src/scripts/symbol-rain.animation.js?v=${BUILD_VERSION}`,
  `/src/scripts/symbol-rain.interactions.js?v=${BUILD_VERSION}`,
  `/src/scripts/3rdDISPLAY.js?v=${BUILD_VERSION}`,
  "/src/scripts/problem-loader.js",
  "/src/scripts/symbol-validator.js",
  "/src/scripts/worm-factory.js",
  "/src/scripts/worm-movement.js",
  "/src/scripts/worm-spawn-manager.js",
  "/src/scripts/worm-powerups.js",
  "/src/scripts/worm.js",
  "/src/scripts/lock-responsive.js",
  "/src/scripts/lock-manager.js",
  "/src/scripts/console-manager.js",
  "/src/scripts/game.js",
  "/src/scripts/game-onboarding.storage.js",
  "/src/scripts/game-onboarding.bootstrap.js",
  "/src/scripts/evan-helper.presenter.js",
  "/src/scripts/game-tutorial-level.js",
  "/src/scripts/game-onboarding.controller.js",
  "/src/scripts/evan-helper.controller.targets.js",
  "/src/scripts/evan-helper.controller.runtime.js",
  "/src/scripts/evan-helper.controller.js",
  "/src/scripts/game-background-warmup.js",
  "/src/scripts/build-version.js",
  "/src/scripts/install-prompt.js",
  `/src/scripts/startup-preload.js?v=${BUILD_VERSION}`,
  `/src/scripts/game-page.js?v=${BUILD_VERSION}`,
  `/src/scripts/service-worker-register.js?v=${BUILD_VERSION}`,
];

// Assets to cache on first use (lazy cache)
const LAZY_CACHE_PATTERNS = [
  /\/src\/assets\/problems\/Assets\/.+\.json$/,
  /\/lock-components\/.+\.html$/,
  /\/(src\/assets\/images\/Images|Images)\/.+\.(jpg|png|gif|svg)$/,
];

function isMathMasterCacheName(cacheName) {
  return APP_CACHE_PREFIXES.some((prefix) => cacheName.startsWith(prefix));
}

function normalizeCacheAssetPath(assetPath) {
  if (typeof assetPath !== "string" || assetPath.length === 0) {
    return null;
  }

  try {
    const url = new URL(assetPath, location.origin);
    if (url.origin !== location.origin) {
      return null;
    }

    url.searchParams.delete("v");
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

function extractAssetReferences(html) {
  const assets = [];
  const assetPattern = /\b(?:src|href)=["']([^"']+)["']/g;
  for (const match of html.matchAll(assetPattern)) {
    const normalizedPath = normalizeCacheAssetPath(match[1]);
    if (!normalizedPath) {
      continue;
    }

    if (/\.(?:css|js|json|html)$/i.test(normalizedPath)) {
      assets.push(normalizedPath);
    }
  }

  return assets;
}

async function collectActiveRuntimeAssets() {
  const pageAssetLists = await Promise.all(
    ACTIVE_RUNTIME_PAGES.map(async (pagePath) => {
      try {
        const response = await fetch(pagePath);
        if (!response?.ok) {
          return [];
        }

        const html = await response.text();
        return extractAssetReferences(html);
      } catch {
        return [];
      }
    }),
  );

  return pageAssetLists.flat();
}

async function getInstallAssets() {
  const discoveredAssets = await collectActiveRuntimeAssets();
  return [
    ...new Set(
      [...STATIC_ASSETS, ...ACTIVE_RUNTIME_PAGES, ...DYNAMIC_GAME_MODULES, ...discoveredAssets]
        .map((assetPath) => normalizeCacheAssetPath(assetPath))
        .filter(Boolean),
    ),
  ];
}

// ============================================
// INSTALL EVENT - Cache static assets
// ============================================
self.addEventListener("install", (event) => {
  console.log("[ServiceWorker] Installing...");

  const installEvent = /** @type {ExtendableWorkerEvent} */ (/** @type {unknown} */ (event));

  installEvent.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        console.log("[ServiceWorker] Caching static assets");
        const installAssets = await getInstallAssets();
        const results = await Promise.allSettled(
          installAssets.map((assetPath) => cache.add(assetPath)),
        );
        const failed = results.filter((result) => result.status === "rejected");
        if (failed.length > 0) {
          console.warn(
            `[ServiceWorker] ${failed.length} static assets failed to cache during install`,
          );
        }
      })
      .then(() => {
        console.log("[ServiceWorker] Install complete - waiting for activation");
      })
      .catch((error) => {
        console.error("[ServiceWorker] Install failed:", error);
      }),
  );
});

// ============================================
// ACTIVATE EVENT - Clean old caches
// ============================================
self.addEventListener("activate", (event) => {
  console.log("[ServiceWorker] Activating...");

  const activateEvent = /** @type {ExtendableWorkerEvent} */ (/** @type {unknown} */ (event));

  activateEvent.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              isMathMasterCacheName(cacheName) &&
              cacheName !== CACHE_NAME &&
              cacheName !== RUNTIME_CACHE
            ) {
              console.log("[ServiceWorker] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }

            return Promise.resolve(false);
          }),
        );
      })
      .then(() => {
        console.log("[ServiceWorker] Claiming clients");
        return serviceWorkerScope.clients.claim(); // Take control immediately
      }),
  );
});

// ============================================
// FETCH EVENT - Serve from cache, fallback to network
// ============================================
self.addEventListener("fetch", (event) => {
  const fetchEvent = /** @type {FetchWorkerEvent} */ (/** @type {unknown} */ (event));
  const { request } = fetchEvent;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip cross-origin requests (like Google Fonts)
  if (url.origin !== location.origin) {
    return;
  }

  if (request.destination === "document") {
    fetchEvent.respondWith(
      networkFirst(request)
        .catch(() => cacheFirst(request))
        .catch(() => fallbackResponse(request)),
    );
    return;
  }

  if (isFreshnessCriticalRequest(request, url)) {
    fetchEvent.respondWith(
      networkFirst(request)
        .catch(() => staleWhileRevalidate(request))
        .catch(() => fallbackResponse(request)),
    );
    return;
  }

  fetchEvent.respondWith(
    staleWhileRevalidate(request)
      .catch(() => cacheFirst(request))
      .catch(() => fallbackResponse(request)),
  );
});

function isFreshnessCriticalRequest(request, url) {
  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "audio"
  ) {
    return true;
  }

  return /\.(js|css|ogg|mp3|wav)$/i.test(url.pathname);
}

// ============================================
// CACHING STRATEGIES
// ============================================

/**
 * Cache First Strategy - Try cache, fallback to network
 * Best for static assets that rarely change
 */
async function cacheFirst(request) {
  const cached = await matchCachedAsset(request);

  if (cached) {
    console.log("[ServiceWorker] Serving from cache:", request.url);
    return cached;
  }

  throw new Error("Not in cache");
}

/**
 * Network First Strategy - Try network, fallback to cache
 * Best for dynamic content that needs to be fresh
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response && response.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      const url = new URL(request.url);

      // Check if this URL matches lazy cache patterns
      let shouldCache = false;
      for (const pattern of LAZY_CACHE_PATTERNS) {
        if (pattern.test(request.url)) {
          shouldCache = true;
          break;
        }
      }

      if (shouldCache || isFreshnessCriticalRequest(request, url)) {
        console.log("[ServiceWorker] Caching new resource:", request.url);
        cache.put(request, response.clone());
      }
    }

    return response;
  } catch (error) {
    console.log("[ServiceWorker] Network failed, trying cache:", request.url);

    const cached = await matchCachedAsset(request);

    if (cached) {
      return cached;
    }

    throw error;
  }
}

/**
 * Stale-While-Revalidate Strategy - Return cache, update in background
 * Best for static assets where speed matters
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await matchCachedAsset(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    networkPromise.catch(() => null);
    return cached;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) return networkResponse;
  throw new Error("Network failed and no cache available");
}

async function matchCachedAsset(request) {
  const runtimeCache = await caches.open(RUNTIME_CACHE);
  const runtimeCached = await runtimeCache.match(request);
  if (runtimeCached) {
    return runtimeCached;
  }

  const staticCache = await caches.open(CACHE_NAME);
  const staticCached = await staticCache.match(request);
  if (staticCached) {
    return staticCached;
  }

  const normalizedPath = normalizeCacheAssetPath(request.url);
  if (!normalizedPath || normalizedPath === request.url) {
    return null;
  }

  return (await runtimeCache.match(normalizedPath)) || staticCache.match(normalizedPath);
}

/**
 * Fallback Response - Return offline page or error
 */
function fallbackResponse(request) {
  console.log("[ServiceWorker] All strategies failed for:", request.url);

  // Return a basic offline response
  if (request.destination === "document") {
    return new Response(
      `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Offline - Math Master</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        font-family: 'Orbitron', monospace;
                        background: #000;
                        color: #00ff00;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        text-align: center;
                    }
                    .offline-container {
                        padding: 40px;
                    }
                    h1 {
                        font-size: 3rem;
                        margin-bottom: 20px;
                        text-shadow: 0 0 20px #00ff00;
                    }
                    p {
                        font-size: 1.2rem;
                        margin-bottom: 30px;
                    }
                    button {
                        padding: 15px 30px;
                        font-family: 'Orbitron', monospace;
                        font-size: 1rem;
                        background: linear-gradient(145deg, rgba(0, 50, 0, 0.8), rgba(0, 20, 0, 0.9));
                        border: 2px solid #00ff00;
                        color: #00ff00;
                        cursor: pointer;
                        border-radius: 8px;
                        transition: all 0.3s ease;
                    }
                    button:hover {
                        box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
                        transform: scale(1.05);
                    }
                </style>
            </head>
            <body>
                <div class="offline-container">
                    <h1>You're Offline</h1>
                    <p>Math Master requires an internet connection for this page.</p>
                    <button onclick="location.reload()">Try Again</button>
                </div>
            </body>
            </html>`,
      {
        headers: {
          "Content-Type": "text/html",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return new Response("Offline", {
    status: 503,
    statusText: "Service Unavailable",
  });
}

// ============================================
// MESSAGE EVENT - Handle commands from app
// ============================================
self.addEventListener("message", (event) => {
  const messageEvent = /** @type {MessageWorkerEvent} */ (/** @type {unknown} */ (event));

  console.log("[ServiceWorker] Message received:", messageEvent.data);

  if (messageEvent.data && messageEvent.data.type === "SKIP_WAITING") {
    serviceWorkerScope.skipWaiting();
  }

  if (messageEvent.data && messageEvent.data.type === "CLEAR_CACHE") {
    messageEvent.waitUntil(
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              if (!isMathMasterCacheName(cacheName)) {
                return Promise.resolve(false);
              }

              return caches.delete(cacheName);
            }),
          );
        })
        .then(() => {
          console.log("[ServiceWorker] Math Master caches cleared");
          messageEvent.ports[0]?.postMessage({ success: true });
        }),
    );
  }
});

// ============================================
// BACKGROUND SYNC - Retry failed requests
// ============================================
self.addEventListener("sync", (event) => {
  const syncEvent = /** @type {SyncWorkerEvent} */ (/** @type {unknown} */ (event));

  console.log("[ServiceWorker] Background sync:", syncEvent.tag);

  if (syncEvent.tag === "sync-gameplay-data") {
    syncEvent.waitUntil(syncGameplayData());
  }
});

async function syncGameplayData() {
  // Gameplay data sync will be implemented when backend API is available
  // Planned features:
  // - Sync progress across devices
  // - Save high scores to cloud
  // - Track problem completion stats
  console.log(
    "[ServiceWorker] Gameplay data sync queued for backend integration",
  );
}

function readPushPayload(pushEvent) {
  if (!pushEvent.data?.json) {
    return {};
  }

  try {
    const payload = pushEvent.data.json();
    return payload && typeof payload === "object" ? payload : {};
  } catch {
    return {};
  }
}

function getNotificationTargetUrl(notificationData) {
  try {
    const candidateUrl =
      typeof notificationData?.url === "string" && notificationData.url
        ? notificationData.url
        : "/";
    const targetUrl = new URL(candidateUrl, location.origin);
    if (targetUrl.origin !== location.origin) {
      return "/";
    }

    return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
  } catch {
    return "/";
  }
}

// ============================================
// PUSH NOTIFICATIONS - Future enhancement
// ============================================
self.addEventListener("push", (event) => {
  console.log("[ServiceWorker] Push notification received");

  const pushEvent = /** @type {PushWorkerEvent} */ (/** @type {unknown} */ (event));

  const data = readPushPayload(pushEvent);
  const title = data.title || "Math Master";
  const options = {
    body: data.body || "You have a new notification",
    icon: "/src/assets/images/icon-192.png",
    badge: "/src/assets/images/badge-72.png",
    vibrate: [200, 100, 200],
    data: data.data || {},
  };

  pushEvent.waitUntil(serviceWorkerScope.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  const notificationEvent = /** @type {NotificationClickWorkerEvent} */ (/** @type {unknown} */ (event));

  console.log("[ServiceWorker] Notification clicked");
  notificationEvent.notification.close();

  notificationEvent.waitUntil(
    serviceWorkerScope.clients.openWindow(
      getNotificationTargetUrl(notificationEvent.notification.data),
    ),
  );
});

console.log("[ServiceWorker] Service Worker loaded");
