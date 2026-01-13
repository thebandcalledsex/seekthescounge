import Phaser from "phaser";
import Enemy, { EnemyConfig } from "./enemy";
import type Player from "./player";

const POZZUM_CONFIG: EnemyConfig = {
    speed: 40,
    damage: 1,
    damageCooldown: 1000,
    deathDespawnDelay: 600,
};

class Pozzum extends Enemy {
    constructor(scene: Phaser.Scene, x: number, y: number, configOverrides: Partial<EnemyConfig> = {}) {
        super(scene, x, y, "pozzum-cruzing-left", { ...POZZUM_CONFIG, ...configOverrides });

        this.setBodySizeFromTextures(["pozzum-cruzing-left", "pozzum-cruzing-right"], {
            trim: { left: 6, right: 10, top: 6, bottom: 0 },
            offset: { x: 0, y: 0 },
        });

        this.play("pozzum-cruzing-left");
    }

    public preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);
        this.updateAnimation();
    }

    protected updateAnimation() {
        const desiredAnimation =
            this.direction === 1 ? "pozzum-cruzing-right" : "pozzum-cruzing-left";
        if (this.anims.getName() !== desiredAnimation) {
            this.play(desiredAnimation, true);
        }
    }
}

interface ScoungedPozzumConfig extends EnemyConfig {
    snapiness: number;
    turnaroundDelay: number;
}

const SCOUNGED_POZZUM_CONFIG: ScoungedPozzumConfig = {
    ...POZZUM_CONFIG,
    snapiness: 0.50,
    turnaroundDelay: 200,
};

class ScoungedPozzum extends Pozzum {
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
        configOverrides: Partial<ScoungedPozzumConfig> = {},
    ) {
        const mergedConfig: ScoungedPozzumConfig = {
            ...SCOUNGED_POZZUM_CONFIG,
            ...configOverrides,
        };
        const { snapiness, turnaroundDelay, ...enemyConfig } = mergedConfig;
        super(scene, x, y, enemyConfig);
        this.target = target;
        this.snapiness = Phaser.Math.Clamp(snapiness, 0, 1);
        this.turnaroundDelay = Math.max(turnaroundDelay, 0);
    }

    public preUpdate(time: number, delta: number) {
        this.updateDirectionTowardTarget(time);
        const directionBeforeSuper = this.direction;
        super.preUpdate(time, delta);

        if (this.isTurningAround(time)) {
            this.direction = directionBeforeSuper;
            this.enemyBody.setVelocityX(0);
            this.updateAnimation();
        }
    }

    private isTurningAround(now: number) {
        return this.turningToDirection !== null && now < this.turnResumeTime;
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

export { ScoungedPozzum };
export default Pozzum;
