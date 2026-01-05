import type Phaser from "phaser";

export interface PortraitPauseConfig {
    game: Phaser.Game;
    enabled: boolean;
    overlayId?: string;
    activeClass?: string;
    unpauseDelayMs?: number;
}

const isPortraitOrientation = () =>
    typeof window.matchMedia === "function"
        ? window.matchMedia("(orientation: portrait)").matches
        : window.innerHeight > window.innerWidth;

export const initPortraitPause = (config: PortraitPauseConfig) => {
    const {
        game,
        enabled,
        overlayId = "pause-overlay",
        activeClass = "pause-overlay-active",
        unpauseDelayMs = 300,
    } = config;

    if (!enabled) {
        return;
    }

    const pauseOverlayElement = document.getElementById(overlayId);
    if (pauseOverlayElement) {
        pauseOverlayElement.textContent = "Paused";
    }

    let isPortraitPaused = false;
    let resumeTimeout: number | null = null;
    const pausedSceneKeys = new Set<string>();

    const pauseScenes = () => {
        pausedSceneKeys.clear();
        for (const scene of game.scene.getScenes(true)) {
            pausedSceneKeys.add(scene.scene.key);
            scene.scene.pause();
        }
    };

    const resumeScenes = () => {
        for (const key of pausedSceneKeys) {
            if (game.scene.isPaused(key)) {
                game.scene.resume(key);
            }
        }
        pausedSceneKeys.clear();
    };

    const setPaused = (paused: boolean) => {
        if (paused === isPortraitPaused) {
            return;
        }

        if (resumeTimeout !== null) {
            window.clearTimeout(resumeTimeout);
            resumeTimeout = null;
        }

        isPortraitPaused = paused;

        if (paused) {
            document.body?.classList.add(activeClass);
            pauseScenes();
            return;
        }

        document.body?.classList.remove(activeClass);
        resumeTimeout = window.setTimeout(() => {
            resumeScenes();
            resumeTimeout = null;
        }, unpauseDelayMs);
    };

    const syncPauseState = () => setPaused(isPortraitOrientation());

    window.addEventListener("orientationchange", syncPauseState);
    window.addEventListener("resize", syncPauseState);
    syncPauseState();
};
