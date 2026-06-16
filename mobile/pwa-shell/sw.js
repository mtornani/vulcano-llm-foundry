// Service worker: rende la fucina utilizzabile offline dopo il primo caricamento.
// - App shell precachata (HTML, manifest, icone).
// - Runtime cache "cache-first" per la libreria WebLLM dal CDN.
// I pesi dei modelli sono già gestiti dalla Cache API interna di WebLLM.
const VERSION = "vulcano-v1";
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./public/manifest.json",
  "./public/icons/icon-192.png",
  "./public/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // App shell same-origin: cache-first con fallback rete.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetchAndPut(req, SHELL))
    );
    return;
  }

  // Cross-origin (CDN libreria): cache-first, aggiorna in background.
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetchAndPut(req, RUNTIME).catch(() => hit);
      return hit || network;
    })
  );
});

async function fetchAndPut(req, cacheName) {
  const res = await fetch(req);
  // Cache anche risposte opache (CDN cross-origin senza CORS).
  if (res && (res.ok || res.type === "opaque")) {
    const cache = await caches.open(cacheName);
    cache.put(req, res.clone());
  }
  return res;
}
