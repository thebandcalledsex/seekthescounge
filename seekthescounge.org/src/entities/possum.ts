import Phaser from "phaser";
import Enemy, { EnemyConfig } from "./enemy";

export const POSSUM_CONFIG: EnemyConfig = {
    speed: 40,
    damage: 1,
    damageCooldown: 1000,
    deathDespawnDelay: 600,
};

class Possum extends Enemy {
    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        configOverrides: Partial<EnemyConfig> = {},
    ) {
        super(scene, x, y, "possum-cruzin-left", { ...POSSUM_CONFIG, ...configOverrides });

        this.setBodySizeFromTextures(["possum-cruzin-left", "pozzum-cruzing-right"], {
            trim: { left: 6, right: 10, top: 6, bottom: 0 },
            offset: { x: 0, y: 0 },
        });

        this.play("possum-cruzin-left");
    }

    public preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);
        this.updateAnimation();
    }

    protected updateAnimation() {
        const desiredAnimation =
            this.direction === 1 ? "pozzum-cruzing-right" : "possum-cruzin-left";
        if (this.anims.getName() !== desiredAnimation) {
            this.play(desiredAnimation, true);
        }
    }
}

export default Possum;
