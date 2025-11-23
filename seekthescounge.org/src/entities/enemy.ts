import Phaser from "phaser";

export interface EnemyConfig {
    speed: number;
    damage: number;
    damageCooldown: number;
}

export interface Damageable {
    takeDamage(amount: number, source: Phaser.GameObjects.GameObject): void;
}

export interface BodySizeAdjustments {
    inset?: number | { x?: number; y?: number };
    offset?: { x?: number; y?: number };
    trim?:
        | number
        | {
              x?: number;
              y?: number;
              left?: number;
              right?: number;
              top?: number;
              bottom?: number;
          };
}

abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
    protected config: EnemyConfig;
    protected direction: 1 | -1 = -1;
    protected lastDamageTime = 0;
    protected enemyBody: Phaser.Physics.Arcade.Body;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        texture: string,
        config: EnemyConfig,
        frame?: string | number,
    ) {
        super(scene, x, y, texture, frame);

        this.config = config;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.enemyBody = this.body as Phaser.Physics.Arcade.Body;
        this.enemyBody.setAllowGravity(true);
        this.enemyBody.setImmovable(false);
        this.enemyBody.setCollideWorldBounds(true);
    }

    public preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);
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

    protected setBodySizeFromTextures(
        textureKeys: string | string[],
        adjustments?: BodySizeAdjustments,
    ) {
        const keys = Array.isArray(textureKeys) ? textureKeys : [textureKeys];

        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        for (const key of keys) {
            const bounds = this.getTextureFrameBounds(key);
            if (!bounds) {
                continue;
            }

            minX = Math.min(minX, bounds.minX);
            minY = Math.min(minY, bounds.minY);
            maxX = Math.max(maxX, bounds.maxX);
            maxY = Math.max(maxY, bounds.maxY);
        }

        if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
            console.warn(`[Enemy] Unable to derive body size from textures: ${keys.join(", ")}`);
            return;
        }

        const trim = adjustments?.trim;
        const trimAll = typeof trim === "number" ? trim : 0;
        const trimX = typeof trim === "object" ? trim.x ?? trimAll : trimAll;
        const trimY = typeof trim === "object" ? trim.y ?? trimAll : trimAll;
        const trimLeft = typeof trim === "object" ? trim.left ?? trimX : trimX;
        const trimRight = typeof trim === "object" ? trim.right ?? trimX : trimX;
        const trimTop = typeof trim === "object" ? trim.top ?? trimY : trimY;
        const trimBottom = typeof trim === "object" ? trim.bottom ?? trimY : trimY;

        minX += trimLeft;
        maxX -= trimRight;
        minY += trimTop;
        maxY -= trimBottom;

        if (minX >= maxX || minY >= maxY) {
            console.warn(
                `[Enemy] Body size collapsed after trim for textures: ${keys.join(", ")}`,
            );
            return;
        }

        const insetX =
            typeof adjustments?.inset === "number"
                ? adjustments.inset
                : (adjustments?.inset?.x ?? 0);
        const insetY =
            typeof adjustments?.inset === "number"
                ? adjustments.inset
                : (adjustments?.inset?.y ?? 0);

        const width = maxX - minX - insetX * 2;
        const height = maxY - minY - insetY * 2;

        if (width <= 0 || height <= 0) {
            console.warn(
                `[Enemy] Body size collapsed after adjustments for textures: ${keys.join(", ")}`,
            );
            return;
        }

        const offsetX = minX + insetX + (adjustments?.offset?.x ?? 0);
        const offsetY = minY + insetY + (adjustments?.offset?.y ?? 0);

        this.enemyBody.setSize(width, height, false);
        this.enemyBody.setOffset(offsetX, offsetY);
    }

    private getTextureFrameBounds(textureKey: string) {
        if (!this.scene.textures.exists(textureKey)) {
            return undefined;
        }

        const texture = this.scene.textures.get(textureKey);
        const frameNames = texture.getFrameNames();
        const candidates = frameNames.length > 0 ? frameNames : [texture.firstFrame];

        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        for (const frameName of candidates) {
            const frame = texture.get(frameName);
            if (!frame) {
                continue;
            }

            const left = frame.x;
            const top = frame.y;
            const right = left + frame.width;
            const bottom = top + frame.height;

            minX = Math.min(minX, left);
            minY = Math.min(minY, top);
            maxX = Math.max(maxX, right);
            maxY = Math.max(maxY, bottom);
        }

        if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
            return undefined;
        }

        return { minX, minY, maxX, maxY };
    }
}

export default Enemy;
