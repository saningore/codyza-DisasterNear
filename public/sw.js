const SHELL = "disasternear-shell-v2";
const DATA = "disasternear-data-v1";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await Promise.all(["/", "/sources", "/about", "/manifest.webmanifest"].map(async (path) => {
      try {
        await cache.add(path);
      } catch {
        // A missing shell page should not block the worker.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== SHELL && key !== DATA).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (event.request.mode !== "navigate") return;
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      const cache = await caches.open(SHELL);
      cache.put(event.request, response.clone());
      return response;
    } catch {
      const cached = await caches.match(event.request);
      return cached || caches.match("/") || Response.error();
    }
  })());
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;
  if (data.type === "cache-report" && data.report && typeof data.report === "object") {
    event.waitUntil(caches.open(DATA).then((cache) => cache.put(
      new Request("/offline-hazard-report"),
      new Response(JSON.stringify(data.report), { headers: { "Content-Type": "application/json" } }),
    )));
  }
  if (data.type === "watch" && Array.isArray(data.locations)) {
    const seen = Array.isArray(data.seen) ? data.seen.filter((item) => typeof item === "string").slice(-200) : [];
    event.waitUntil(writeValue("watch", { locations: data.locations.slice(0, 5), seen }));
  }
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "disasternear-nws") event.waitUntil(checkWatched());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = typeof event.notification.data?.url === "string" ? event.notification.data.url : "/";
  event.waitUntil(self.clients.openWindow(target));
});

async function checkWatched() {
  const watch = await readValue("watch");
  if (!watch || !Array.isArray(watch.locations)) return;
  const seen = new Set(Array.isArray(watch.seen) ? watch.seen : []);
  const nextSeen = [...seen];
  for (const location of watch.locations.slice(0, 5)) {
    if (!location || location.notify !== true) continue;
    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      label: typeof location.label === "string" ? location.label : "Saved location",
      precision: typeof location.precision === "string" ? location.precision : "place",
    });
    let response;
    try {
      response = await fetch(`/api/hazards?${params.toString()}`, { cache: "no-store" });
    } catch {
      continue;
    }
    if (!response.ok) continue;
    const report = await response.json();
    const alerts = Array.isArray(report.alerts) ? report.alerts : [];
    for (const alert of alerts) {
      if (!alert || typeof alert.id !== "string") continue;
      if (alert.severity !== "Extreme" && alert.severity !== "Severe") continue;
      if (seen.has(alert.id)) continue;
      seen.add(alert.id);
      nextSeen.push(alert.id);
      const title = typeof alert.event === "string" ? alert.event : "National Weather Service alert";
      const headline = typeof alert.headline === "string"
        ? alert.headline
        : `Severity: ${alert.severity}.`;
      const zone = alert.scope === "zone"
        ? " This point is outside the official polygon. NWS returned it for the same zone."
        : "";
      await self.registration.showNotification(title, {
        body: `${headline}${zone}`.slice(0, 240),
        tag: alert.id,
        data: { url: `/?${params.toString()}` },
      });
    }
  }
  await writeValue("watch", { locations: watch.locations, seen: nextSeen.slice(-200) });
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("disasternear", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("kv")) request.result.createObjectStore("kv");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readValue(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("kv", "readonly");
    const request = transaction.objectStore("kv").get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function writeValue(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("kv", "readwrite");
    transaction.objectStore("kv").put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
