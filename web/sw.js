// Stale-while-revalidate: serve from cache (works offline), refresh cache from the
// network in the background so the next launch picks up new deploys.
// Bump VERSION when the asset list changes.
// Caches are shared by every app on the origin (nukemberg.github.io), so only
// ever delete caches carrying this app's prefix.
const PREFIX = "cheap-leds-";
const VERSION = `${PREFIX}v1`;
const ASSETS = [
  "./",
  "index.html",
  "app.js",
  "device.js",
  "drivers/index.js",
  "drivers/mrstar.js",
  "drivers/melk.js",
  "style.css",
  "manifest.webmanifest",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const hit = await cache.match(e.request, { ignoreSearch: true });
      const refresh = fetch(e.request)
        .then((res) => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => hit);
      if (hit) e.waitUntil(refresh);
      return hit || refresh;
    }),
  );
});
