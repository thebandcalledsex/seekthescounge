import Phaser from "phaser";
import { GAME_VERSION } from "../constants";

export default class Begin extends Phaser.Scene {
    private beginButton?: Phaser.GameObjects.Image;
    private versionText?: Phaser.GameObjects.Text;
    private isStarting: boolean = false;

    constructor() {
        super({ key: "Begin" });
    }

    preload() {
        this.load.image("begin-button-idle", "../../assets/ui/begin-buttion-idle.png");
        this.load.image("begin-button-pressed", "../../assets/ui/begin-button-pressed.png");
    }

    create() {
        this.isStarting = false;
        this.cameras.main.setBackgroundColor("#000000");

        const layout = () => {
            if (!this.beginButton) {
                return;
            }
            this.beginButton.setPosition(this.scale.width / 2, this.scale.height / 2);
            if (this.versionText) {
                this.versionText.setPosition(this.scale.width - 8, this.scale.height - 6);
            }
        };

        this.beginButton = this.add
            .image(this.scale.width / 2, this.scale.height / 2, "begin-button-idle")
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on(Phaser.Input.Events.POINTER_DOWN, () => {
                if (this.isStarting) {
                    return;
                }
                this.isStarting = true;

                this.beginButton?.setTexture("begin-button-pressed");
                this.beginButton?.disableInteractive();

                this.time.delayedCall(500, () => this.scene.start("Game"));
            });

        this.versionText = this.add
            .text(this.scale.width - 8, this.scale.height - 6, `v${GAME_VERSION}`, {
                font: "10px Courier",
                color: "#ffffff",
            })
            .setOrigin(1, 1);

        this.scale.on(Phaser.Scale.Events.RESIZE, layout);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off(Phaser.Scale.Events.RESIZE, layout);
            this.beginButton = undefined;
            this.versionText = undefined;
            this.isStarting = false;
        });
    }
}
