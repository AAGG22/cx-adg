const CACHE = "cx-adg-static-v13";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./sw.js"];
const GIF_CDN = "https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/";
const CDN_ASSETS = [
  GIF_CDN + "gif.js",
  GIF_CDN + "gif.worker.js"
];

self.addEventListener("install", (ev) => {
  ev.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all([
        cache.addAll(ASSETS),
        cache.addAll(CDN_ASSETS).catch((err) => console.warn("gif.js precache:", err))
      ]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function cacheFirst(request, fallback) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((resp) => {
      if (resp.ok) {
        caches.open(CACHE).then((cache) => cache.put(request, resp.clone()));
      }
      return resp;
    }).catch(() => fallback ? caches.match(fallback) : undefined);
  });
}

/** HTML / navegación: red primero para no quedar atrapado en UI vieja (ej. sin APNG). */
function networkFirst(request, fallback) {
  return fetch(request).then((resp) => {
    if (resp.ok) {
      const clone = resp.clone();
      caches.open(CACHE).then((cache) => cache.put(request, clone));
    }
    return resp;
  }).catch(() =>
    caches.match(request).then((cached) => cached || (fallback ? caches.match(fallback) : undefined))
  );
}

self.addEventListener("fetch", (ev) => {
  if (ev.request.method !== "GET") return;
  const url = new URL(ev.request.url);

  if (url.href.startsWith(GIF_CDN)) {
    ev.respondWith(cacheFirst(ev.request));
    return;
  }

  if (url.origin !== self.location.origin) return;

  const isNav = ev.request.mode === "navigate";
  const isHtml = url.pathname.endsWith(".html") || url.pathname === "/" || url.pathname.endsWith("/");
  if (isNav || isHtml || url.pathname.endsWith("/sw.js")) {
    ev.respondWith(networkFirst(ev.request, "./index.html"));
    return;
  }

  ev.respondWith(cacheFirst(ev.request, "./index.html"));
});
