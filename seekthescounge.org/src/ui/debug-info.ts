import Phaser from "phaser";

interface DebugInfoConfig {
    scene: Phaser.Scene;
    getPlayerBody: () => Phaser.Physics.Arcade.Body | undefined;
}

class DebugInfo {
    private scene: Phaser.Scene;
    private world: Phaser.Physics.Arcade.World;
    private getPlayerBody: () => Phaser.Physics.Arcade.Body | undefined;
    private overlayText?: Phaser.GameObjects.Text;
    private toggleKey?: Phaser.Input.Keyboard.Key;
    private readonly padding = 8;
    private readonly fontSize = "10px";

    private handleToggleKeyDown = () => this.toggle();

    constructor({ scene, getPlayerBody }: DebugInfoConfig) {
        this.scene = scene;
        this.world = scene.physics.world as Phaser.Physics.Arcade.World;
        this.getPlayerBody = getPlayerBody;

        this.registerToggleKey();
        this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    }

    public toggle() {
        const enableDebug = !this.world.drawDebug;
        this.world.drawDebug = enableDebug;

        if (!this.world.debugGraphic) {
            this.world.createDebugGraphic();
        }

        if (this.world.debugGraphic) {
            this.world.debugGraphic.clear();
            this.world.debugGraphic.setVisible(enableDebug);
        }

        if (!enableDebug) {
            if (this.overlayText) {
                this.overlayText.setVisible(false);
            }
            return;
        }

        this.updateOverlay();
    }

    public update() {
        if (!this.world.drawDebug) {
            if (this.overlayText) {
                this.overlayText.setVisible(false);
            }
            return;
        }

        this.updateOverlay();
    }

    public destroy() {
        if (this.toggleKey) {
            this.toggleKey.off("down", this.handleToggleKeyDown);
            this.toggleKey.destroy();
            this.toggleKey = undefined;
        }

        if (this.overlayText) {
            this.overlayText.destroy();
            this.overlayText = undefined;
        }
    }

    private registerToggleKey() {
        const keyboard = this.scene.input.keyboard;
        if (!keyboard) {
            return;
        }

        this.toggleKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
        this.toggleKey.on("down", this.handleToggleKeyDown);
    }

    private updateOverlay() {
        const body = this.getPlayerBody();
        if (!body) {
            if (this.overlayText) {
                this.overlayText.setVisible(false);
            }
            return;
        }

        const pixelX = Math.round(body.x);
        const pixelY = Math.round(body.bottom);
        const text = `Player px: x=${pixelX} y=${pixelY}`;
        const x = this.scene.cameras.main.width - this.padding;
        const y = this.padding;

        if (!this.overlayText) {
            this.overlayText = this.scene.add
                .text(x, y, text, {
                    color: "#ffffff",
                    fontSize: this.fontSize,
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    padding: { x: 6, y: 4 },
                })
                .setScrollFactor(0)
                .setDepth(9999)
                .setOrigin(1, 0);
        } else {
            this.overlayText.setText(text);
            this.overlayText.setPosition(x, y);
            this.overlayText.setStyle({
                color: "#ffffff",
                fontSize: this.fontSize,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
            });
            this.overlayText.setPadding(6, 4);
            this.overlayText.setOrigin(1, 0);
        }

        this.overlayText.setVisible(true);
    }
}

export default DebugInfo;
