import Phaser from "phaser";
import Enemy from "./enemy";

export default class Snail extends Enemy {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(
            scene,
            x,
            y,
            "snail-shmovin-left",
            {
                speed: 20,
                damage: 0,
                damageCooldown: 1000,
            },
            0,
        );

        this.setBodySizeFromTextures(["snail-shmovin-left", "snail-shmovin-right"]);
        this.play("snail-moving-left");
    }

    public override tryDamage(_target: Phaser.GameObjects.GameObject) {
        // Snails are passive
    }

    protected override die() {
        super.die();
        // Maybe play a different sound or particle effect?
    }

    public override preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);

        // Simple animation switching based on direction
        if (this.direction === -1) {
            if (this.anims.currentAnim?.key !== "snail-moving-left") {
                this.play("snail-moving-left", true);
            }
        } else {
            if (this.anims.currentAnim?.key !== "snail-moving-right") {
                this.play("snail-moving-right", true);
            }
        }
    }
}
