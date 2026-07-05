// Bison Frame service worker.
//
// To formål:
//   1) Push-notifikationer (uændret fra før).
//   2) Offline-loading: cache app-skallen, så appen kan åbne uden signal
//      (kældre, nybyg). Kombineret med offline-stemplings-køen kan svenden så
//      både åbne appen OG stemple uden net.
//
// Cache-strategi (sikker mod stale data + opdateringer):
//   • Navigation/HTML  -> network-first, fallback til cachet skal (offline).
//   • Same-origin statiske filer (hash-navngivne JS/CSS/billeder) -> cache-first
//     med baggrunds-opdatering. Hash i filnavnet gør cache-first 100% korrekt.
//   • Cross-origin (Supabase, /api/*, Google Maps, OpenAI) -> RØRES IKKE,
//     går altid direkte på nettet. Intet API-svar caches nogensinde.

const CACHE = 'bison-frame-v2';
// Separat cache til Supabase Storage-billeder (logo, portræt, avatarer, skitse-
// miniaturer). Holdes adskilt fra app-skallen, så den kan have sit eget loft/oprydning.
const IMG_CACHE = 'bison-frame-img-v1';
// Design/skrifter fra CDN (Tailwind + Google Fonts). Egen cache, så appen har styling
// ved gentagne åbninger OG offline — uden at vente på fremmede servere ved hvert load.
const CDN_CACHE = 'bison-frame-cdn-v1';
const CORE_ASSETS = ['/', '/index.html', '/manifest.json', '/logo.png', '/favicon.svg'];

// Er dette en Supabase Storage-billedanmodning? (offentlige filer på et andet domæne)
// Vi cacher dem, så logo/portræt/avatar/skitser stadig kan vises uden net.
function isStorageImage(url) {
    return url.pathname.includes('/storage/v1/object/public/');
}

// Er dette design/skrifter fra CDN? (Tailwind + Google Fonts) — nødvendige for at
// appen ser rigtig ud, men ligger på fremmede domæner, så vi cacher dem selv.
function isStyleCdn(url) {
    return url.hostname === 'cdn.tailwindcss.com'
        || url.hostname === 'fonts.googleapis.com'
        || url.hostname === 'fonts.gstatic.com';
}

// ---- Install: precache app-skallen (best-effort, så install aldrig fejler) ----
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE).then((cache) =>
            Promise.allSettled(CORE_ASSETS.map((url) => cache.add(url)))
        ).then(() => self.skipWaiting())
    );
});

// ---- Activate: ryd gamle cache-versioner ----
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE && k !== IMG_CACHE && k !== CDN_CACHE).map((k) => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// ---- Fetch: offline-loading uden at røre API/cross-origin ----
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Kun GET caches. Alt andet (POST til Supabase/api) går direkte på nettet.
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Supabase Storage-billeder (andet domæne): cache-first + baggrunds-opdatering,
    // så logo/portræt/avatar/skitser vises offline når de er set mindst én gang online.
    // Billed-anmodninger fra <img> er 'no-cors' → opaque responses, som Cache API
    // gerne må gemme. Vi cacher kun ved reelt svar (aldrig en fejl/offline-respons).
    if (isStorageImage(url)) {
        event.respondWith(
            caches.open(IMG_CACHE).then((cache) =>
                cache.match(request).then((cached) => {
                    const network = fetch(request)
                        .then((resp) => {
                            if (resp && (resp.ok || resp.type === 'opaque')) {
                                cache.put(request, resp.clone()).catch(() => {});
                            }
                            return resp;
                        })
                        .catch(() => cached);
                    return cached || network;
                })
            )
        );
        return;
    }

    // Design/skrifter fra CDN (Tailwind + Google Fonts): cache-first + baggrunds-opdatering,
    // så appen har styling ved gentagne åbninger og offline — uden at vente på fremmede
    // servere. URL'erne er stabile (uden hash), så baggrunds-opdateringen henter nye versioner.
    if (isStyleCdn(url)) {
        event.respondWith(
            caches.open(CDN_CACHE).then((cache) =>
                cache.match(request).then((cached) => {
                    const network = fetch(request)
                        .then((resp) => {
                            if (resp && (resp.ok || resp.type === 'opaque')) {
                                cache.put(request, resp.clone()).catch(() => {});
                            }
                            return resp;
                        })
                        .catch(() => cached);
                    return cached || network;
                })
            )
        );
        return;
    }

    // Rør ellers kun vores eget domæne. Supabase-API/Google/OpenAI m.fl. går altid på nettet.
    if (url.origin !== self.location.origin) return;

    // API-ruter må aldrig caches.
    if (url.pathname.startsWith('/api/')) return;

    // Sider/navigation: network-first, fallback til cachet skal når offline.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((resp) => {
                    // Hold den cachede skal frisk til offline-brug.
                    const clone = resp.clone();
                    caches.open(CACHE).then((c) => c.put('/index.html', clone)).catch(() => {});
                    return resp;
                })
                .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
        );
        return;
    }

    // Statiske filer: cache-first + baggrunds-opdatering (stale-while-revalidate).
    event.respondWith(
        caches.match(request).then((cached) => {
            const network = fetch(request)
                .then((resp) => {
                    if (resp && resp.status === 200 && resp.type === 'basic') {
                        const clone = resp.clone();
                        caches.open(CACHE).then((c) => c.put(request, clone)).catch(() => {});
                    }
                    return resp;
                })
                .catch(() => cached);
            return cached || network;
        })
    );
});

// ============================================================================
// PUSH-NOTIFIKATIONER (uændret)
// ============================================================================
self.addEventListener('push', function(event) {
    if (event.data) {
        try {
            const data = event.data.json();
            const options = {
                body: data.body,
                icon: '/logo.png',
                badge: '/logo.png',
                vibrate: [100, 50, 100],
                data: {
                    url: data.url || '/'
                }
            };
            event.waitUntil(
                self.registration.showNotification(data.title || 'Bison Frame', options)
            );
        } catch (e) {
            // Fallback for plain text
            event.waitUntil(
                self.registration.showNotification('Bison Frame', {
                    body: event.data.text(),
                    icon: '/logo.png',
                })
            );
        }
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    // Resolve relative URL to absolute URL relative to the service worker origin
    const targetUrl = new URL(event.notification.data.url || '/', self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            // 1. Tjek om en af de åbne tabs har samme sti (fx /dashboard)
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                try {
                    const clientUrl = new URL(client.url);
                    const targetUrlObj = new URL(targetUrl);
                    
                    if (clientUrl.pathname === targetUrlObj.pathname && 'focus' in client) {
                        // Naviger den åbne tab til den specifikke URL (fx med nyt ?leadId=)
                        if ('navigate' in client) {
                            client.navigate(targetUrl);
                        }
                        return client.focus();
                    }
                } catch (err) {
                    console.error('Error matching URLs in service worker:', err);
                }
            }
            
            // 2. Hvis ingen tab matcher stien, åbn et nyt vindue
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
