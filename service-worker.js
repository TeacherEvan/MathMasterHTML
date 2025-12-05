/**
 * Service Worker - Production-Grade PWA Support
 * Enables offline gameplay and improves performance
 * Version: 1.0.0
 */

const CACHE_NAME = 'math-master-v1.0.0';
const RUNTIME_CACHE = 'math-master-runtime-v1.0.0';

// Assets to cache immediately on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/level-select.html',
    '/game.html',
    '/style.css',
    '/css/game.css',
    '/css/game-animations.css',
    '/css/game-responsive.css',
    '/css/game-modals.css',
    '/css/console.css',
    '/css/worm-base.css',
    '/css/worm-effects.css',
    '/css/lock-responsive.css',
    '/css/level-select.css',
    '/css/modern-ux-enhancements.css',
    '/js/utils.js',
    '/js/constants.js',
    '/js/ux-enhancements.js',
    '/js/lazy-component-loader.js',
    '/js/display-manager.js',
    '/js/performance-monitor.js',
    '/js/3rdDISPLAY.js',
    '/js/problem-loader.js',
    '/js/symbol-validator.js',
    '/js/worm-factory.js',
    '/js/worm-movement.js',
    '/js/worm-spawn-manager.js',
    '/js/worm-powerups.js',
    '/js/worm.js',
    '/js/lock-responsive.js',
    '/js/lock-manager.js',
    '/js/console-manager.js',
    '/js/game.js'
];

// Assets to cache on first use (lazy cache)
const LAZY_CACHE_PATTERNS = [
    /\/Assets\/.+\.md$/,
    /\/lock-components\/.+\.html$/,
    /\/Images\/.+\.(jpg|png|gif|svg)$/
];

// ============================================
// INSTALL EVENT - Cache static assets
// ============================================
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[ServiceWorker] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[ServiceWorker] Install complete - skip waiting');
                return self.skipWaiting(); // Activate immediately
            })
            .catch((error) => {
                console.error('[ServiceWorker] Install failed:', error);
            })
    );
});

// ============================================
// ACTIVATE EVENT - Clean old caches
// ============================================
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                            console.log('[ServiceWorker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[ServiceWorker] Claiming clients');
                return self.clients.claim(); // Take control immediately
            })
    );
});

// ============================================
// FETCH EVENT - Serve from cache, fallback to network
// ============================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip cross-origin requests (like Google Fonts)
    if (url.origin !== location.origin) {
        return;
    }

    event.respondWith(
        cacheFirst(request)
            .catch(() => networkFirst(request))
            .catch(() => fallbackResponse(request))
    );
});

// ============================================
// CACHING STRATEGIES
// ============================================

/**
 * Cache First Strategy - Try cache, fallback to network
 * Best for static assets that rarely change
 */
async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    
    if (cached) {
        console.log('[ServiceWorker] Serving from cache:', request.url);
        return cached;
    }
    
    throw new Error('Not in cache');
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
            
            // Check if this URL matches lazy cache patterns
            const shouldCache = LAZY_CACHE_PATTERNS.some(pattern => 
                pattern.test(request.url)
            );
            
            if (shouldCache) {
                console.log('[ServiceWorker] Caching new resource:', request.url);
                cache.put(request, response.clone());
            }
        }
        
        return response;
    } catch (error) {
        console.log('[ServiceWorker] Network failed, trying cache:', request.url);
        
        // Try runtime cache
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(request);
        
        if (cached) {
            return cached;
        }
        
        throw error;
    }
}

/**
 * Fallback Response - Return offline page or error
 */
function fallbackResponse(request) {
    console.log('[ServiceWorker] All strategies failed for:', request.url);
    
    // Return a basic offline response
    if (request.destination === 'document') {
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
                    <h1>📡 You're Offline</h1>
                    <p>Math Master requires an internet connection for this page.</p>
                    <button onclick="location.reload()">Try Again</button>
                </div>
            </body>
            </html>`,
            {
                headers: {
                    'Content-Type': 'text/html',
                    'Cache-Control': 'no-store'
                }
            }
        );
    }
    
    return new Response('Offline', {
        status: 503,
        statusText: 'Service Unavailable'
    });
}

// ============================================
// MESSAGE EVENT - Handle commands from app
// ============================================
self.addEventListener('message', (event) => {
    console.log('[ServiceWorker] Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            }).then(() => {
                console.log('[ServiceWorker] All caches cleared');
                event.ports[0].postMessage({ success: true });
            })
        );
    }
});

// ============================================
// BACKGROUND SYNC - Retry failed requests
// ============================================
self.addEventListener('sync', (event) => {
    console.log('[ServiceWorker] Background sync:', event.tag);
    
    if (event.tag === 'sync-gameplay-data') {
        event.waitUntil(
            syncGameplayData()
        );
    }
});

async function syncGameplayData() {
    // TODO: Implement gameplay data sync when backend is added
    console.log('[ServiceWorker] Syncing gameplay data...');
}

// ============================================
// PUSH NOTIFICATIONS - Future enhancement
// ============================================
self.addEventListener('push', (event) => {
    console.log('[ServiceWorker] Push notification received');
    
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Math Master';
    const options = {
        body: data.body || 'You have a new notification',
        icon: '/Images/icon-192.png',
        badge: '/Images/badge-72.png',
        vibrate: [200, 100, 200],
        data: data.data || {}
    };
    
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    console.log('[ServiceWorker] Notification clicked');
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/')
    );
});

console.log('[ServiceWorker] Service Worker loaded');
