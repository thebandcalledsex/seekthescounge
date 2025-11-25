import Phaser from "phaser";
import Enemy, { EnemyConfig } from "./enemy";

const POZZUM_CONFIG: EnemyConfig = {
    speed: 40,
    damage: 1,
    damageCooldown: 1000,
    deathDespawnDelay: 600,
};

class Pozzum extends Enemy {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, "pozzum-cruzing-left", POZZUM_CONFIG);

        this.setBodySizeFromTextures(["pozzum-cruzing-left", "pozzum-cruzing-right"], {
            trim: { left: 6, right: 10, top: 6, bottom: 0 },
            offset: { x: 0, y: 0 },
        });

        this.play("pozzum-cruzing-left");
    }

    public preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);
        const desiredAnimation =
            this.direction === 1 ? "pozzum-cruzing-right" : "pozzum-cruzing-left";
        if (this.anims.getName() !== desiredAnimation) {
            this.play(desiredAnimation, true);
        }
    }
}

export default Pozzum;
