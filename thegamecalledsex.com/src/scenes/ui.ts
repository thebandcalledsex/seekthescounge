import Phaser from "phaser";
import OnScreenInput from "../input/on-screen-input";

export default class UiScene extends Phaser.Scene {
    public uiInput!: OnScreenInput;

    constructor() {
        super({ key: "ui" });
    }

    create() {
        this.cameras.main.setScroll(0, 0);
        this.cameras.main.setZoom(1);
        this.cameras.main.setBackgroundColor("rgba(0,0,0,0)"); // transparent

        // Create on-screen input in UI space
        this.uiInput = new OnScreenInput(this);

        // Re-anchor on resize
        this.scale.on("resize", () => this.uiInput.layout(), this);

        // Safety: clear state on sleep/wake to avoid ghost presses
        this.events.on("sleep", () => this.uiInput.reset());
        this.events.on("wake", () => this.uiInput.reset());
    }
}
