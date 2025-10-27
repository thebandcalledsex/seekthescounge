import type { OverlayControls } from "../ui/overlay";

interface ServiceWorkerOptions {
    gameVersion: string;
    minUpdateOverlayMs: number;
    overlay: Pick<OverlayControls, "show" | "hide" | "waitForMinDuration">;
}

const requestControllerVersion = (): Promise<string | null> =>
    new Promise((resolve) => {
        const controller = navigator.serviceWorker.controller;
        if (!controller) {
            resolve(null);
            return;
        }

        const channel = new MessageChannel();
        const timeout = window.setTimeout(() => {
            channel.port1.onmessage = null;
            resolve(null);
        }, 1000);

        channel.port1.onmessage = (event) => {
            window.clearTimeout(timeout);
            const data = event.data;
            if (data && typeof data.version === "string") {
                resolve(data.version);
            } else {
                resolve(null);
            }
        };

        controller.postMessage({ type: "VERSION_REQUEST" }, [channel.port2]);
    });

const showUpdateOverlay = (
    overlay: Pick<OverlayControls, "show">,
    minDuration: number,
    message?: string,
) => overlay.show("updating", minDuration, message);

export const unregisterServiceWorkers = () => {
    if (!("serviceWorker" in navigator)) {
        return;
    }

    navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
            registrations.forEach((registration) => registration.unregister());
        })
        .catch(() => {
            // Ignore failures; this is purely a dev convenience
        });
};

export const setupServiceWorker = ({
    gameVersion,
    minUpdateOverlayMs,
    overlay,
}: ServiceWorkerOptions) => {
    if (!("serviceWorker" in navigator)) {
        return;
    }

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) {
            return;
        }
        refreshing = true;
        showUpdateOverlay(overlay, minUpdateOverlayMs);
        overlay.waitForMinDuration().then(() => window.location.reload());
    });

    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/service-worker.js", { updateViaCache: "none" })
            .then((registration) => {
                const handleInstalling = (worker: ServiceWorker | null) => {
                    if (!worker) {
                        return;
                    }
                    if (navigator.serviceWorker.controller) {
                        showUpdateOverlay(overlay, minUpdateOverlayMs);
                    }
                    worker.addEventListener("statechange", () => {
                        if (worker.state === "installed" && navigator.serviceWorker.controller) {
                            showUpdateOverlay(overlay, minUpdateOverlayMs);
                        }
                    });
                };

                handleInstalling(registration.installing);
                registration.addEventListener("updatefound", () =>
                    handleInstalling(registration.installing),
                );

                registration
                    .update()
                    .catch((error) => {
                        console.warn("Service worker update failed:", error);
                    })
                    .finally(() => {
                        requestControllerVersion()
                            .then((version) => {
                                if (
                                    (version && version !== gameVersion) ||
                                    (navigator.serviceWorker.controller &&
                                        (registration.waiting || registration.installing))
                                ) {
                                    showUpdateOverlay(overlay, minUpdateOverlayMs);
                                    if (registration.waiting) {
                                        registration.waiting.postMessage({
                                            type: "SKIP_WAITING",
                                        });
                                    }
                                } else {
                                    overlay.hide();
                                }
                            })
                            .catch(() => overlay.hide());

                        if (registration.waiting && navigator.serviceWorker.controller) {
                            showUpdateOverlay(overlay, minUpdateOverlayMs);
                            registration.waiting.postMessage({
                                type: "SKIP_WAITING",
                            });
                        }
                    });
            })
            .catch((error) => console.warn("Service worker registration failed:", error));
    });

    navigator.serviceWorker.ready
        .then(() => requestControllerVersion())
        .then((version) => {
            if (version === gameVersion) {
                return overlay.hide();
            }
            return undefined;
        })
        .catch(() => {
            // Ignore
        });
};
