import Phaser from "phaser";

export interface EnemyConfig {
    speed: number;
    damage: number;
    damageCooldown: number;
}

export interface Damageable {
    takeDamage(amount: number, source: Phaser.GameObjects.GameObject): void;
}

abstract class Enemy extends Phaser.GameObjects.Rectangle {
    protected config: EnemyConfig;
    protected direction: 1 | -1 = -1;
    protected lastDamageTime = 0;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string, config: EnemyConfig) {
        super(scene, x, y, 16, 14, 0x4e2800);

        this.config = config;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(true);
        body.setImmovable(false);
    }

    public preUpdate(time: number, delta: number) {
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(this.direction * this.config.speed);

        if (body.blocked.left || body.touching.left) {
            this.direction = 1;
        } else if (body.blocked.right || body.touching.right) {
            this.direction = -1;
        }
    }

    // Attempt to damage the target if cooldown has passed
    public tryDamage(target: Phaser.GameObjects.GameObject) {
        const now = this.scene.time.now;
        if (now - this.lastDamageTime < this.config.damageCooldown) {
            return;
        }

        const damageable = target as unknown as Damageable;
        if (typeof damageable.takeDamage === "function") {
            damageable.takeDamage(this.config.damage, this);
            this.lastDamageTime = now;
        }
    }

    public takeDamage(_amount: number, _source: Phaser.GameObjects.GameObject) {
        this.die();
    }

    protected die() {
        this.destroy();
    }
}

export default Enemy;
