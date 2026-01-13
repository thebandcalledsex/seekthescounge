import Phaser from "phaser";
import OnScreenInput from "../input/on-screen-input";

export default class UiScene extends Phaser.Scene {
    public uiInput!: OnScreenInput;
    private fpsText?: Phaser.GameObjects.Text;
    private fpsElapsed = 0;
    private readonly fpsUpdateIntervalMs = 250;

    constructor() {
        super({ key: "Ui" });
    }

    create() {
        this.cameras.main.setScroll(0, 0);
        this.cameras.main.setZoom(1);
        this.cameras.main.setBackgroundColor("rgba(0,0,0,0)"); // transparent

        // Create on-screen input in UI space
        this.uiInput = new OnScreenInput(this);

        this.createFpsText();

        // Re-anchor on resize
        this.scale.on("resize", () => this.uiInput.layout(), this);

        // Safety: clear state on sleep/wake to avoid ghost presses
        this.events.on("sleep", () => this.uiInput.reset());
        this.events.on("wake", () => this.uiInput.reset());
        this.events.on(Phaser.Scenes.Events.PAUSE, () => {
            this.uiInput.reset();
            this.input.enabled = false;
        });
        this.events.on(Phaser.Scenes.Events.RESUME, () => {
            this.uiInput.reset();
            this.input.enabled = true;
        });

        // Emit event to signal that the UI is ready
        this.events.emit("ui-ready", this.uiInput);
    }

    update(_time: number, delta: number) {
        if (!this.fpsText) {
            return;
        }

        this.fpsElapsed += delta;
        if (this.fpsElapsed < this.fpsUpdateIntervalMs) {
            return;
        }

        this.fpsElapsed = 0;
        this.updateFpsText();
    }

    private createFpsText() {
        this.fpsText = this.add
            .text(this.cameras.main.width - 8, 8, "FPS: --", {
                color: "#ffffff",
                fontSize: "12px",
            })
            .setScrollFactor(0)
            .setDepth(10000)
            .setOrigin(1, 0);
    }

    private updateFpsText() {
        if (!this.fpsText) {
            return;
        }

        const fps = Math.round(this.game.loop.actualFps);
        this.fpsText.setText(`FPS: ${fps}`);
        this.fpsText.setPosition(this.cameras.main.width - 8, 8);
    }
}
