// TechCorp Expense Tracker - Service Worker
const CACHE_NAME = 'techcorp-expense-v1';
const STATIC_ASSETS = [
    '/ENCORP_FINAL_EXAM/',
    '/ENCORP_FINAL_EXAM/index.html',
    '/ENCORP_FINAL_EXAM/css/styles.css',
    '/ENCORP_FINAL_EXAM/js/config.js',
    '/ENCORP_FINAL_EXAM/js/app.js',
    '/ENCORP_FINAL_EXAM/manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch((error) => {
                console.error('[SW] Cache failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests (POST to webhooks should always go to network)
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip API calls and webhooks - always fetch from network
    if (url.hostname.includes('supabase') || 
        url.hostname.includes('n8n') || 
        url.pathname.includes('webhook')) {
        return;
    }
    
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Return cached version, but also fetch update in background
                    event.waitUntil(
                        fetch(request)
                            .then((networkResponse) => {
                                if (networkResponse && networkResponse.status === 200) {
                                    caches.open(CACHE_NAME)
                                        .then((cache) => cache.put(request, networkResponse));
                                }
                            })
                            .catch(() => {}) // Ignore network errors for background update
                    );
                    return cachedResponse;
                }
                
                // Not in cache, fetch from network
                return fetch(request)
                    .then((networkResponse) => {
                        // Cache successful responses
                        if (networkResponse && networkResponse.status === 200) {
                            const responseClone = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => cache.put(request, responseClone));
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        // Offline fallback for HTML pages
                        if (request.headers.get('accept').includes('text/html')) {
                            return caches.match('/ENCORP_FINAL_EXAM/index.html');
                        }
                    });
            })
    );
});

// Background sync for offline expense submissions (future enhancement)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-expenses') {
        console.log('[SW] Syncing expenses...');
        // Future: implement offline queue sync
    }
});
