/*
 * Service Worker — Quran PWA
 * Version: 1.0.0
 *
 * Caching strategies:
 *   - Static assets (HTML, CSS, JS): Cache First
 *   - Fonts (Google Fonts Amiri): Cache First (runtime)
 *   - API (Quran data): Network First with IndexedDB/localStorage fallback
 *   - Audio: Cache on demand (streaming-friendly)
 *   - Images: Cache First
 */

const SW_VERSION = '1.1.0';
const CACHE_PREFIX = 'quran-pwa';

// ─── Cache Names ───────────────────────────────────────────────
const CACHES = {
    static:    `${CACHE_PREFIX}-static-v${SW_VERSION}`,
    fonts:     `${CACHE_PREFIX}-fonts-v${SW_VERSION}`,
    api:       `${CACHE_PREFIX}-api-v${SW_VERSION}`,
    audio:     `${CACHE_PREFIX}-audio-v${SW_VERSION}`,
    images:    `${CACHE_PREFIX}-images-v${SW_VERSION}`,
    pages:     `${CACHE_PREFIX}-pages-v${SW_VERSION}`,
};

// ─── Assets to pre-cache on install ────────────────────────────
const PRECACHE_ASSETS = [
    './index.html',
    './manifest.json',
    './favicon-16x16.png',
    './favicon-32x32.png',
    './favicon-48x48.png',
    './css/variables.css',
    './css/base.css',
    './css/sidebar.css',
    './css/header.css',
    './css/main-content.css',
    './css/navigation.css',
    './css/components.css',
    './css/tafsir.css',
    './css/animations.css',
    './css/image-export.css',
    './css/night-mode.css',
    './css/responsive.css',
    './css/search.css',
    './css/bookmarks.css',
    './css/controls.css',
    './css/share.css',
    './css/reading-progress.css',
    './css/fullscreen.css',
    './js/config.js',
    './js/state.js',
    './js/utils.js',
    './js/storage.js',
    './js/share.js',
    './js/audio.js',
    './js/audio-controls.js',
    './js/render.js',
    './js/tafsir.js',
    './js/verse-interactions.js',
    './js/navigation.js',
    './js/sidebar.js',
    './js/night-mode.js',
    './js/image-export.js',
    './js/search.js',
    './js/bookmarks.js',
    './js/font-controls.js',
    './js/reading-progress.js',
    './js/fullscreen.js',
    './js/app.js',
    './js/pwa.js',
];

// ─── Install ───────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    console.log(`[SW] Installing v${SW_VERSION}`);
    event.waitUntil(
        caches.open(CACHES.static).then(async (cache) => {
            let successCount = 0;
            let failCount = 0;
            for (const url of PRECACHE_ASSETS) {
                try {
                    await cache.add(url);
                    successCount++;
                } catch (err) {
                    console.warn(`[SW] Failed to cache: ${url}`, err);
                    failCount++;
                }
            }
            console.log(`[SW] Pre-cache done: ${successCount} ok, ${failCount} failed`);
            return self.skipWaiting();
        })
    );
});

// ─── Activate ──────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    console.log(`[SW] Activating v${SW_VERSION}`);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name.startsWith(CACHE_PREFIX) && !Object.values(CACHES).includes(name))
                    .map((name) => {
                        console.log(`[SW] Deleting old cache: ${name}`);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// ─── Fetch Router ──────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET, chrome-extension, and opaque requests
    if (request.method !== 'GET') return;
    if (url.protocol === 'chrome-extension:') return;

    // Route to appropriate strategy
    if (isStaticAsset(url)) {
        event.respondWith(cacheFirst(request, CACHES.static));
    } else if (isFontRequest(url)) {
        event.respondWith(cacheFirst(request, CACHES.fonts));
    } else if (isApiRequest(url)) {
        event.respondWith(networkFirst(request, CACHES.api));
    } else if (isAudioRequest(url)) {
        event.respondWith(cacheOnDemand(request, CACHES.audio));
    } else if (isImageRequest(url)) {
        event.respondWith(cacheFirst(request, CACHES.images));
    } else if (isNavigationRequest(request)) {
        event.respondWith(networkFirst(request, CACHES.pages));
    }
});

// ─── Request Classifiers ───────────────────────────────────────
function isStaticAsset(url) {
    return url.origin === self.location.origin && (
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.json')
    );
}

function isFontRequest(url) {
    return url.hostname === 'fonts.googleapis.com' ||
           url.hostname === 'fonts.gstatic.com' ||
           url.pathname.endsWith('.woff2') ||
           url.pathname.endsWith('.woff') ||
           url.pathname.endsWith('.ttf');
}

function isApiRequest(url) {
    return url.hostname === 'api.alquran.cloud' ||
           url.hostname === 'quranapi.pages.dev' ||
           url.pathname.includes('/api/');
}

function isAudioRequest(url) {
    return url.pathname.endsWith('.mp3') ||
           url.pathname.endsWith('.ogg') ||
           url.pathname.endsWith('.wav') ||
           url.hostname.includes('mp3quran') ||
           url.hostname.includes('server');
}

function isImageRequest(url) {
    return url.pathname.endsWith('.png') ||
           url.pathname.endsWith('.jpg') ||
           url.pathname.endsWith('.jpeg') ||
           url.pathname.endsWith('.gif') ||
           url.pathname.endsWith('.webp');
}

function isNavigationRequest(request) {
    return request.mode === 'navigate';
}

// ─── Cache Strategies ──────────────────────────────────────────

// Cache First: Check cache → network fallback → cache response
async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }
}

// Network First: Try network → cache fallback → offline page
async function networkFirst(request, cacheName) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;

        if (isNavigationRequest(request)) {
            return caches.match('./index.html');
        }
        return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Cache On Demand: Network → cache for future offline use
async function cacheOnDemand(request, cacheName) {
    // Check if already cached
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        return new Response('', { status: 503, statusText: 'Offline - Audio not cached' });
    }
}

// ─── Message Handler (for cache updates) ───────────────────────
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CACHE_VERSE_AUDIO') {
        const { url } = event.data;
        if (url) {
            caches.open(CACHES.audio).then((cache) => {
                cache.add(url).catch(() => {});
            });
        }
    }

    if (event.data && event.data.type === 'GET_CACHE_STATUS') {
        caches.keys().then((names) => {
            const status = {};
            Promise.all(
                names.filter(n => n.startsWith(CACHE_PREFIX)).map(async (name) => {
                    const cache = await caches.open(name);
                    const keys = await cache.keys();
                    status[name] = keys.length;
                })
            ).then(() => {
                event.source.postMessage({ type: 'CACHE_STATUS', data: status });
            });
        });
    }
});
