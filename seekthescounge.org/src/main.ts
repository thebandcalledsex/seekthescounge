import Phaser from "phaser";
import Game from "./scenes/game";
import PlayerSelect from "./scenes/player-select";
import { GAME_WIDTH, GAME_HEIGHT, GAME_VERSION, calculateIntegerZoom } from "./constants";
import UiScene from "./scenes/ui";
import { initOverlay } from "./ui/overlay";
import { unregisterServiceWorkers, setupServiceWorker } from "./pwa/service-worker-client";

const MIN_LOADING_OVERLAY_MS = 500;
const MIN_UPDATE_OVERLAY_MS = 1500;
const overlay = initOverlay({ minLoadingDuration: MIN_LOADING_OVERLAY_MS });

const isDisplayMode = (mode: string) =>
    typeof window.matchMedia === "function" && window.matchMedia(`(display-mode: ${mode})`).matches;

const isPwaExperience = () =>
    isDisplayMode("standalone") ||
    isDisplayMode("fullscreen") ||
    isDisplayMode("minimal-ui") ||
    ((window.navigator as Navigator & { standalone?: boolean }).standalone ?? false);

const isMobilePlatform =
    /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);

const getResponsiveZoom = () => {
    if (typeof window === "undefined") {
        return 1;
    }
    return calculateIntegerZoom(window.innerWidth, window.innerHeight);
};

const initialZoom = getResponsiveZoom();

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    disableContextMenu: true,
    scene: [PlayerSelect, Game, UiScene],
    physics: {
        default: "arcade",
        arcade: {
            gravity: { x: 0, y: 500 },
            debug: false, // Show physics bodies
        },
    },
    scale: {
        mode: Phaser.Scale.NONE, // Keep the base resolution; zoom handles sizing
        autoCenter: Phaser.Scale.CENTER_BOTH, // Center the game horizontally and vertically
        parent: "phaser",
        zoom: initialZoom,
    },
    pixelArt: true, // Enable pixel-perfect rendering
    resizeInterval: 100,
};

const game = new Phaser.Game(config);
let currentZoom = initialZoom;

const handleViewportResize = () => {
    if (typeof window === "undefined") {
        return;
    }
    const newZoom = getResponsiveZoom();
    if (currentZoom !== newZoom) {
        game.scale.setZoom(newZoom);
        currentZoom = newZoom;
    }
};

window.addEventListener("resize", handleViewportResize);
window.addEventListener("orientationchange", handleViewportResize);

const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "" ||
    window.location.hostname === "::1" ||
    window.location.hostname.endsWith(".local");

const shouldUseServiceWorker = !isLocalhost && (isMobilePlatform || isPwaExperience());

const dismissOverlay = () => {
    if (!overlay.isEnabled()) {
        return;
    }
    void overlay.hide();
};

if ("serviceWorker" in navigator) {
    if (isLocalhost) {
        unregisterServiceWorkers();
        dismissOverlay();
    } else if (shouldUseServiceWorker) {
        setupServiceWorker({
            gameVersion: GAME_VERSION,
            minUpdateOverlayMs: MIN_UPDATE_OVERLAY_MS,
            overlay,
        });
    } else {
        unregisterServiceWorkers();
        dismissOverlay();
    }
} else {
    dismissOverlay();
}

console.info(`Seek The Scounge v${GAME_VERSION}`);
