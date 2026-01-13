const CACHE_VERSION = "1.56";
const APP_SHELL_CACHE = `seekthescounge-shell-v${CACHE_VERSION}`;
const CORE_ASSETS = ["/", "/index.html", "/manifest.webmanifest"];
const OFFLINE_FALLBACK = "/index.html";

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(APP_SHELL_CACHE)
            .then((cache) => cache.addAll(CORE_ASSETS))
            .catch((error) => {
                console.warn("Failed to pre-cache core assets", error);
            }),
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys.map((key) => {
                        if (key !== APP_SHELL_CACHE) {
                            return caches.delete(key);
                        }
                        return undefined;
                    }),
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
        const message = { type: "VERSION_RESPONSE", version: CACHE_VERSION };
        if (event.ports && event.ports[0]) {
            event.ports[0].postMessage(message);
        } else if (event.source && "postMessage" in event.source) {
            event.source.postMessage(message);
        }
    }
});

const isSameOrigin = (requestUrl) => {
    const reqOrigin = new URL(requestUrl, self.location.origin).origin;
    return reqOrigin === self.location.origin;
};

self.addEventListener("fetch", (event) => {
    const { request } = event;

    if (request.method !== "GET") {
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(APP_SHELL_CACHE).then((cache) => {
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
                }),
        );
        return;
    }

    if (!isSameOrigin(request.url)) {
        return;
    }

    event.respondWith(
        fetch(request)
            .then((response) => {
                if (!response || response.status !== 200) {
                    return response;
                }

                const clone = response.clone();
                caches.open(APP_SHELL_CACHE).then((cache) => cache.put(request, clone));

                return response;
            })
            .catch(async () => {
                const cached = await caches.match(request);
                if (cached) {
                    return cached;
                }
                const fallback = await caches.match(OFFLINE_FALLBACK);
                if (fallback) {
                    return fallback;
                }
                throw new Error("Offline and resource not cached.");
            }),
    );
});
