/* Duroob service worker: the app shell works offline; prices always come from the network. */
const CACHE = "duroob-v1";
const SHELL = ["./", "index.html", "app.css", "en.js", "i18n.js", "meta.js", "demo.js", "core.js", "extras.js", "pages-search.js", "pages-plan.js", "pages-more.js", "pages-mine.js",
  "data/cities.json", "data/climate.json", "data/airports.json", "icons/icon-192.png", "manifest.webmanifest"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.includes("/api/")) return;
  // network first, so updates show up; fall back to the cached shell when offline
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(m => m || caches.match("index.html"))));
});
