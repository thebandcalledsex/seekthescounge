import Phaser from "phaser";
import type { EnemyConfig } from "./enemy";
import Possum, { POSSUM_CONFIG } from "./possum";
import type Player from "./player";

interface PozzumConfig extends EnemyConfig {
    snapiness: number;
    turnaroundDelay: number;
}

const POZZUM_CONFIG: PozzumConfig = {
    ...POSSUM_CONFIG,
    snapiness: 0.5,
    turnaroundDelay: 200,
};

class Pozzum extends Possum {
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
        configOverrides: Partial<PozzumConfig> = {},
    ) {
        const mergedConfig: PozzumConfig = {
            ...POZZUM_CONFIG,
            ...configOverrides,
        };
        const { snapiness, turnaroundDelay, ...enemyConfig } = mergedConfig;
        super(scene, x, y, enemyConfig);
        this.setBodySizeFromTextures(["pozzum-cruzing-left", "pozzum-cruzing-right"], {
            trim: { left: 6, right: 10, top: 6, bottom: 0 },
            offset: { x: 0, y: 0 },
        });
        this.play("pozzum-cruzing-left");
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

    protected updateAnimation() {
        const desiredAnimation =
            this.direction === 1 ? "pozzum-cruzing-right" : "pozzum-cruzing-left";
        if (this.anims.getName() !== desiredAnimation) {
            this.play(desiredAnimation, true);
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

export { Pozzum };
