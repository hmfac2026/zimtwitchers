/* Zim Twitchers service worker
 *
 * Caching strategy:
 *  - App shell + logo: pre-cache on install
 *  - HTML / Next.js JS chunks: network-first, cache fallback when offline
 *  - Wikimedia thumbnails:    cache-first, refresh in background
 *  - Supabase API + auth:     never intercepted (always network)
 *
 * Bump CACHE_VERSION when you change the SW logic (not for content changes —
 * those are picked up automatically by network-first).
 */

const CACHE_VERSION = "v1";
const CACHE_NAME = `zim-twitchers-${CACHE_VERSION}`;
const IMAGE_CACHE = `zim-twitchers-images-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/logo/pitta-hero.svg",
  "/logo/pitta-icon.svg",
  "/logo/icon-192.png",
  "/logo/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Use addAll with individual fetches so one 404 doesn't kill install.
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "no-cache" });
            if (res.ok) await cache.put(url, res);
          } catch {
            /* ignore */
          }
        }),
      );
    })(),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (k) =>
              k.startsWith("zim-twitchers-") &&
              k !== CACHE_NAME &&
              k !== IMAGE_CACHE,
          )
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never intercept auth or API calls.
  if (url.hostname.endsWith(".supabase.co")) return;
  if (url.pathname.startsWith("/auth/")) return;
  if (url.pathname.startsWith("/api/")) return;

  // Wikimedia image thumbnails: cache-first.
  if (url.hostname === "upload.wikimedia.org") {
    event.respondWith(cacheFirstImage(req));
    return;
  }

  // Same-origin GET: network-first with cache fallback (covers HTML and
  // Next.js JS chunks). _next/static/* is hashed so cache-first is safer
  // and faster, but network-first is correct enough for v1.
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(req));
    return;
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type !== "opaque") {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    // For navigations, fall back to the cached landing page if we have it.
    if (request.mode === "navigate") {
      const fallback = await cache.match("/");
      if (fallback) return fallback;
    }
    throw err;
  }
}

async function cacheFirstImage(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    // Refresh in background, but return cached immediately.
    fetch(request)
      .then((res) => {
        if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
      })
      .catch(() => {});
    return cached;
  }
  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}
