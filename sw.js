const CACHE = "garage-circuit-v12-variety";
const STATIC_ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", (event) => {
  // The supplied ZIP lacks icons/manifest. A missing optional asset must not
  // prevent installation of the app shell on a device that already has them.
  event.waitUntil(caches.open(CACHE).then(async (cache) => {
    await cache.addAll(["./", "./index.html"]);
    await Promise.allSettled(STATIC_ASSETS.slice(2).map((url) => cache.add(url)));
    await self.skipWaiting();
  }));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys
    .filter((key) => key.startsWith("garage-circuit-") && key !== CACHE)
    .map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === "navigate" || event.request.destination === "document") {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          const cache = await caches.open(CACHE);
          await cache.put(event.request, response.clone());
          return response;
        }
        return await caches.match(event.request) || await caches.match("./index.html") || response;
      } catch {
        return await caches.match(event.request) || await caches.match("./index.html") || Response.error();
      }
    })());
  } else {
    event.respondWith((async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) { const cache = await caches.open(CACHE); await cache.put(event.request, response.clone()); }
      return response;
    })());
  }
});
