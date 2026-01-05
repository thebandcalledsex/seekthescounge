import Phaser from "phaser";

class DragonFalling extends Phaser.Scene {
    private returnSceneKey: string = "Game";
    private resumeUi: boolean = true;
    private loops: number = 3;
    private loopDurationMs: number = 1200;
    private gifPath: string = "../../assets/cut-scenes/dragon-fall-cutscene.gif";
    private burningGifPath: string = "../../assets/cut-scenes/dragon-fall-cutscene-burning.gif";
    private imgEl?: HTMLImageElement;

    constructor() {
        super({ key: "DragonFalling" });
    }

    init(data: {
        returnSceneKey?: string;
        resumeUi?: boolean;
        loops?: number;
        loopDurationMs?: number;
        gifPath?: string;
        burningGifPath?: string;
    }) {
        this.returnSceneKey = data.returnSceneKey ?? "Game";
        this.resumeUi = data.resumeUi ?? true;
        this.loops = typeof data.loops === "number" && data.loops > 0 ? Math.floor(data.loops) : 3;
        this.loopDurationMs =
            typeof data.loopDurationMs === "number" && data.loopDurationMs > 0
                ? data.loopDurationMs
                : 1200;
        this.gifPath = data.gifPath ?? "../../assets/cut-scenes/dragon-fall-cutscene.gif";
        this.burningGifPath =
            data.burningGifPath ?? "../../assets/cut-scenes/dragon-fall-cutscene-burning.gif";
    }

    create() {
        // Black background so any letterboxed space around the GIF reads as "bars".
        this.cameras.main.setBackgroundColor("#000000");

        const { width, height } = this.scale;
        let activeGifPath = this.gifPath;
        let burningActivated = false;
        const dom = this.add
            .dom(width / 2, height / 2)
            .createFromHTML(
                `<img alt="Dragon falling cutscene" src="${activeGifPath}?t=${Date.now()}" style="width:${width}px;height:${height}px;object-fit:contain;image-rendering:pixelated;background:#000;cursor:pointer;" />`,
            );
        dom.setOrigin(0.5);

        const node = dom.node;
        if (node instanceof HTMLElement) {
            const img = node.querySelector("img");
            if (img instanceof HTMLImageElement) {
                this.imgEl = img;
            }
        }

        const activateBurning = () => {
            if (burningActivated) {
                return;
            }
            burningActivated = true;
            activeGifPath = this.burningGifPath;
            if (this.imgEl) {
                this.imgEl.src = `${activeGifPath}?burning=1&t=${Date.now()}`;
            }
        };

        // Clicking on the DOM element won't reliably trigger Phaser's canvas pointer events,
        // so bind directly to the <img> as well.
        this.input.on(Phaser.Input.Events.POINTER_DOWN, activateBurning);
        if (this.imgEl) {
            this.imgEl.addEventListener("click", activateBurning);
            this.imgEl.addEventListener("touchstart", activateBurning, { passive: true });
        }
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.input.off(Phaser.Input.Events.POINTER_DOWN, activateBurning);
            if (this.imgEl) {
                this.imgEl.removeEventListener("click", activateBurning);
                this.imgEl.removeEventListener("touchstart", activateBurning);
            }
        });

        let completedLoops = 0;
        const tick = () => {
            completedLoops += 1;
            if (completedLoops >= this.loops) {
                this.scene.stop("DragonFalling");
                this.scene.resume(this.returnSceneKey);
                if (this.resumeUi) {
                    this.scene.resume("Ui");
                }
                return;
            }

            // Restart the GIF by reassigning the src with a cache-busting query.
            if (this.imgEl) {
                this.imgEl.src = `${activeGifPath}?loop=${completedLoops}&t=${Date.now()}`;
            }
            this.time.delayedCall(this.loopDurationMs, tick);
        };

        this.time.delayedCall(this.loopDurationMs, tick);
    }
}

export default DragonFalling;
