import Phaser from "phaser";
import Enemy, { EnemyConfig } from "./enemy";
import type Player from "./player";

const CHASER_TEXTURE_KEY = "chaser-enemy";
interface ChaserConfig extends EnemyConfig {
    snapiness: number;
}
const CHASER_CONFIG: ChaserConfig = {
    speed: 40,
    damage: 1,
    damageCooldown: 1000,
    snapiness: 0.25,
};

function ensureChaserTexture(scene: Phaser.Scene) {
    if (scene.textures.exists(CHASER_TEXTURE_KEY)) {
        return;
    }

    const graphics = scene.add.graphics({ x: 0, y: 0 }).setVisible(false);
    graphics.fillStyle(0xe63946, 1);
    graphics.fillRect(0, 0, 16, 20);
    graphics.generateTexture(CHASER_TEXTURE_KEY, 16, 20);
    graphics.destroy();
}

class Chaser extends Enemy {
    private target: Player;
    private snapiness: number;

    constructor(scene: Phaser.Scene, x: number, y: number, target: Player) {
        ensureChaserTexture(scene);
        super(scene, x, y, CHASER_TEXTURE_KEY, CHASER_CONFIG);
        this.target = target;
        this.snapiness = Phaser.Math.Clamp(CHASER_CONFIG.snapiness, 0, 1);
    }

    public preUpdate(time: number, delta: number) {
        this.updateDirectionTowardTarget();
        super.preUpdate(time, delta);
    }

    private updateDirectionTowardTarget() {
        if (!this.target?.active) {
            return;
        }

        if (this.snapiness <= 0) {
            return;
        }

        const desiredDirection: 1 | -1 = this.target.x >= this.x ? 1 : -1;
        if (desiredDirection === this.direction) {
            return;
        }

        // Higher snapiness shrinks the distance the player must cover before the enemy flips.
        const maxFlipThreshold = 96; // pixels
        const flipThreshold = Phaser.Math.Linear(maxFlipThreshold, 0, this.snapiness);
        const deltaX = Math.abs(this.target.x - this.x);

        if (deltaX > flipThreshold) {
            this.direction = desiredDirection;
        }
    }
}

export default Chaser;
