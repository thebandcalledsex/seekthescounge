export type OverlayMode = "loading" | "updating";

interface OverlayConfig {
    selector?: string;
    activeClass?: string;
    minLoadingDuration?: number;
    initialText?: string;
}

export interface OverlayControls {
    show: (mode: OverlayMode, minDuration?: number, message?: string) => void;
    hide: () => Promise<void>;
    waitForMinDuration: () => Promise<void>;
    isEnabled: () => boolean;
}

const DEFAULT_SELECTOR = "app-overlay";
const DEFAULT_ACTIVE_CLASS = "overlay-active";
const DEFAULT_LOADING_TEXT = "Loading...";

let overlayElement: HTMLDivElement | null = null;
let overlayMode: OverlayMode | null = null;
let overlayVisible = false;
let overlayShownAt = 0;
let overlayMinDuration = 0;
let overlayActiveClass = DEFAULT_ACTIVE_CLASS;
let overlayEnabled = false;

const showOverlay = (mode: OverlayMode, minDuration = 0, message?: string) => {
    if (!overlayEnabled || !overlayElement) {
        return;
    }

    overlayMode = mode;
    overlayVisible = true;
    overlayShownAt = performance.now();
    overlayMinDuration = Math.max(0, minDuration);
    overlayElement.textContent = message ?? (mode === "updating" ? "Updating..." : "Loading...");
    document.body?.classList.add(overlayActiveClass);
};

const waitForMinDuration = async () => {
    if (!overlayVisible) {
        return;
    }

    const elapsed = performance.now() - overlayShownAt;
    const remaining = Math.max(0, overlayMinDuration - elapsed);
    if (remaining > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remaining));
    }
};

const hideOverlay = async () => {
    if (!overlayEnabled || !overlayElement || !overlayVisible) {
        return;
    }

    await waitForMinDuration();

    overlayVisible = false;
    overlayMode = null;
    overlayMinDuration = 0;
    document.body?.classList.remove(overlayActiveClass);
};

const overlayControls: OverlayControls = {
    show: showOverlay,
    hide: hideOverlay,
    waitForMinDuration,
    isEnabled: () => overlayEnabled,
};

export const initOverlay = (config: OverlayConfig = {}): OverlayControls => {
    const {
        selector = DEFAULT_SELECTOR,
        activeClass = DEFAULT_ACTIVE_CLASS,
        minLoadingDuration = 0,
        initialText = DEFAULT_LOADING_TEXT,
    } = config;

    overlayActiveClass = activeClass;
    overlayElement = document.getElementById(selector) as HTMLDivElement | null;
    overlayEnabled = !!overlayElement;

    if (!overlayElement) {
        overlayMode = null;
        overlayVisible = false;
        overlayMinDuration = 0;
        return overlayControls;
    }

    overlayElement.textContent = initialText;
    overlayMode = "loading";
    overlayVisible = true;
    overlayShownAt = performance.now();
    overlayMinDuration = Math.max(0, minLoadingDuration);
    document.body?.classList.add(overlayActiveClass);

    return overlayControls;
};
