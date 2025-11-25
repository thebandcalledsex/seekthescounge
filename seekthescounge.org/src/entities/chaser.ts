import Phaser from "phaser";
import Enemy, { EnemyConfig } from "./enemy";
import type Player from "./player";

const CHASER_TEXTURE_KEY = "chaser-enemy";
interface ChaserConfig extends EnemyConfig {
    snapiness: number;
    turnaroundDelay: number;
}
const CHASER_CONFIG: ChaserConfig = {
    speed: 40,
    damage: 1,
    damageCooldown: 1000,
    snapiness: 0.25,
    deathDespawnDelay: 600,
    turnaroundDelay: 200,
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
    private turnaroundDelay: number;
    private turningToDirection: 1 | -1 | null = null;
    private turnResumeTime = 0;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        target: Player,
        configOverrides: Partial<ChaserConfig> = {},
    ) {
        ensureChaserTexture(scene);
        const mergedConfig: ChaserConfig = { ...CHASER_CONFIG, ...configOverrides };
        super(scene, x, y, CHASER_TEXTURE_KEY, mergedConfig);
        this.target = target;
        this.snapiness = Phaser.Math.Clamp(mergedConfig.snapiness, 0, 1);
        this.turnaroundDelay = Math.max(mergedConfig.turnaroundDelay, 0);
    }

    public preUpdate(time: number, delta: number) {
        this.updateDirectionTowardTarget(time);
        const directionBeforeSuper = this.direction;
        super.preUpdate(time, delta);

        if (this.isTurningAround(time)) {
            this.direction = directionBeforeSuper;
            this.enemyBody.setVelocityX(0);
        }
    }

    private isTurningAround(now: number) {
        const turningAround: boolean =
            this.turningToDirection !== null && now < this.turnResumeTime;

        return turningAround;
    }

    private updateDirectionTowardTarget(now: number) {
        if (!this.target?.active || this.snapiness <= 0) {
            this.turningToDirection = null;
            return;
        }

        const desiredDirection: 1 | -1 = this.target.x >= this.x ? 1 : -1;

        if (this.turningToDirection !== null) {
            if (desiredDirection === this.direction) {
                this.turningToDirection = null;
                return;
            }

            if (now >= this.turnResumeTime) {
                this.direction = this.turningToDirection;
                this.turningToDirection = null;
            }

            return;
        }

        if (desiredDirection === this.direction) {
            return;
        }

        // Higher snapiness shrinks the distance the player must cover before the enemy flips.
        const maxFlipThreshold = 96; // pixels
        const flipThreshold = Phaser.Math.Linear(maxFlipThreshold, 0, this.snapiness);
        const deltaX = Math.abs(this.target.x - this.x);

        if (deltaX > flipThreshold) {
            if (this.turnaroundDelay <= 0) {
                this.direction = desiredDirection;
                return;
            }

            this.turningToDirection = desiredDirection;
            this.turnResumeTime = now + this.turnaroundDelay;
        }
    }
}

export default Chaser;
