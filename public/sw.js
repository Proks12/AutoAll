const CACHE_NAME = "autoevi-app-shell-v1";
const RUNTIME_CACHE = "autoevi-runtime-v1";
const API_CACHE = "autoevi-api-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/detail.html",
  "/forum.html",
  "/login.html",
  "/admin.html",
  "/theme.css",
  "/script.js",
  "/admin.js",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![CACHE_NAME, RUNTIME_CACHE, API_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

async function cacheFirst(request, cacheName = RUNTIME_CACHE) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);
  if (request.method === "GET" && networkResponse.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, networkResponse.clone());
  }

  return networkResponse;
}

async function networkFirst(request, cacheName = API_CACHE) {
  try {
    const networkResponse = await fetch(request);
    if (request.method === "GET" && networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  const isApiRequest = url.origin === self.location.origin && (
    url.pathname.startsWith("/cars") ||
    url.pathname.startsWith("/posts") ||
    url.pathname.startsWith("/admin") ||
    url.pathname === "/login" ||
    url.pathname === "/register" ||
    url.pathname === "/car-suggestions"
  );

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedPage = await caches.match(request);
        return cachedPage || caches.match("/index.html");
      })
    );
    return;
  }

  if (isApiRequest) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
