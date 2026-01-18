const VERSION_URL = "/version.json";
const CACHE_VERSION_FALLBACK = "0.00";
const APP_SHELL_CACHE_PREFIX = "seekthescounge-shell-v";
const CORE_ASSETS = ["/", "/index.html", "/manifest.webmanifest", "/src/bundle.js", VERSION_URL];
const OFFLINE_FALLBACK = "/index.html";

const resolveCacheVersion = async () => {
    try {
        const response = await fetch(VERSION_URL, { cache: "no-store" });
        if (response.ok) {
            const data = await response.json();
            if (data && typeof data.version === "string") {
                return data.version;
            }
        }
    } catch (error) {
        // Ignore and fall back to cached or default version.
    }

    const cached = await caches.match(VERSION_URL);
    if (cached) {
        try {
            const data = await cached.json();
            if (data && typeof data.version === "string") {
                return data.version;
            }
        } catch (error) {
            // Ignore cached parse errors.
        }
    }

    return CACHE_VERSION_FALLBACK;
};

const cacheVersionPromise = resolveCacheVersion();
const buildAppShellCacheName = (version) => `${APP_SHELL_CACHE_PREFIX}${version}`;
const withAppShellCache = (handler) =>
    cacheVersionPromise.then((version) => handler(buildAppShellCacheName(version)));

self.addEventListener("install", (event) => {
    event.waitUntil(
        withAppShellCache((cacheName) =>
            caches.open(cacheName).then((cache) => cache.addAll(CORE_ASSETS)),
        )
            .catch((error) => {
                console.warn("Failed to pre-cache core assets", error);
            }),
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        withAppShellCache((currentCache) =>
            caches.keys().then((keys) =>
                Promise.all(
                    keys.map((key) => {
                        if (key.startsWith(APP_SHELL_CACHE_PREFIX) && key !== currentCache) {
                            return caches.delete(key);
                        }
                        return undefined;
                    }),
                ),
            ),
        )
            .then(() => self.clients.claim()),
    );
});

self.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || typeof data.type !== "string") {
        return;
    }

    if (data.type === "SKIP_WAITING") {
        self.skipWaiting();
        return;
    }

    if (data.type === "VERSION_REQUEST") {
        cacheVersionPromise.then((version) => {
            const message = { type: "VERSION_RESPONSE", version };
            if (event.ports && event.ports[0]) {
                event.ports[0].postMessage(message);
            } else if (event.source && "postMessage" in event.source) {
                event.source.postMessage(message);
            }
        });
    }
});

const isSameOrigin = (requestUrl) => {
    const reqOrigin = new URL(requestUrl, self.location.origin).origin;
    return reqOrigin === self.location.origin;
};
const isVersionRequest = (requestUrl) =>
    new URL(requestUrl, self.location.origin).pathname === VERSION_URL;

self.addEventListener("fetch", (event) => {
    const { request } = event;

    if (request.method !== "GET") {
        return;
    }

    if (isVersionRequest(request.url)) {
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(
            withAppShellCache((appShellCache) => {
                return fetch(request)
                    .then((response) => {
                        const clone = response.clone();
                        caches.open(appShellCache).then((cache) => {
                            cache.put(OFFLINE_FALLBACK, clone);
                        });
                        return response;
                    })
                    .catch(async () => {
                        const cached = await caches.match(OFFLINE_FALLBACK);
                        if (cached) {
                            return cached;
                        }
                        throw new Error("Offline and no cached fallback available.");
                    });
            }),
        );
        return;
    }

    if (!isSameOrigin(request.url)) {
        return;
    }

    event.respondWith(
        withAppShellCache((appShellCache) => {
            return fetch(request)
                .then((response) => {
                    if (!response || response.status !== 200) {
                        return response;
                    }

                    const clone = response.clone();
                    caches.open(appShellCache).then((cache) => cache.put(request, clone));

                    return response;
                })
                .catch(async () => {
                    const cached = await caches.match(request, { ignoreSearch: true });
                    if (cached) {
                        return cached;
                    }
                    const fallback = await caches.match(OFFLINE_FALLBACK);
                    if (fallback) {
                        return fallback;
                    }
                    throw new Error("Offline and resource not cached.");
                });
        }),
    );
});
