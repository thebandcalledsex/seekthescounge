import Phaser from "phaser";
import { RISING_FALLING_ANIMATION_VELOCITY_THRESHOLD } from "../constants";

interface AttackConfig {
    width: number;
    height: number;
    reach: number;
    verticalOffset: number;
    duration: number;
    cooldown: number;
    damage: number;
    knockback: {
        horizontal: number; // pixels to shove along X
        vertical: number; // pixels to lift (positive = up)
        duration: number; // milliseconds to complete knockback
    };
}

abstract class Player extends Phaser.Physics.Arcade.Sprite {
    protected speed: number = 200; // Horizontal speed for movement
    protected jumpSpeed: number = 200; // Vertical speed for jumping
    protected wallSlideFallSpeedFactor: number = 1; // Multiplier applied while wall sliding; subclasses override
    protected attackConfig: AttackConfig = {
        width: 18,
        height: 14,
        reach: 4,
        verticalOffset: 0,
        duration: 150,
        cooldown: 300,
        damage: 1,
        knockback: {
            horizontal: 28,
            vertical: 0,
            duration: 150,
        },
    };

    protected playerBody: Phaser.Physics.Arcade.Body;
    protected lastDirection: "left" | "right" = "right"; // Default to facing right
    private lastBodyFrame?: Phaser.Textures.Frame;
    private attackHitbox: Phaser.GameObjects.Zone;
    private attackHitboxBody: Phaser.Physics.Arcade.Body;
    private attackTargets?:
        | Phaser.Types.Physics.Arcade.ArcadeColliderType
        | Phaser.Types.Physics.Arcade.ArcadeColliderType[];
    private attackHitsThisSwing = new Set<Phaser.GameObjects.GameObject>();
    private attackActiveUntil = 0;
    private attackCooldownUntil = 0;
    private attackActive = false;
    private attackPressedLastFrame = false;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
        super(scene, x, y, texture); // Use "player" as a placeholder texture key

        scene.add.existing(this); // Add player to the scene
        scene.physics.world.enable(this); // Enable dynamic physics body (Phaser.Physics.Arcade.Body)
        this.setOrigin(0.5, 1); // Center the player sprite

        this.playerBody = this.body as Phaser.Physics.Arcade.Body;
        this.playerBody.setSize(16, 16); // Set the player body size

        this.playerBody.setCollideWorldBounds(true);

        this.setScale(1);
        this.updateBodyOffsetFromFrame();
        this.lastBodyFrame = this.frame;

        this.attackHitbox = scene.add.zone(
            this.x,
            this.y,
            this.attackConfig.width,
            this.attackConfig.height,
        );
        scene.physics.add.existing(this.attackHitbox);
        this.attackHitboxBody = this.attackHitbox.body as Phaser.Physics.Arcade.Body;
        this.attackHitboxBody.setAllowGravity(false);
        this.attackHitboxBody.setImmovable(true);
        this.attackHitboxBody.pushable = false;
        this.attackHitbox.setActive(false).setVisible(false);
        this.attackHitboxBody.enable = false;
    }

    public update(moveLeft: boolean, moveRight: boolean, jump: boolean, attack: boolean): void {
        const wantsLeft = moveLeft && !moveRight;
        const wantsRight = moveRight && !moveLeft;

        const blockedLeft =
            this.playerBody.blocked.left ||
            this.playerBody.touching.left ||
            this.playerBody.wasTouching.left;
        const blockedRight =
            this.playerBody.blocked.right ||
            this.playerBody.touching.right ||
            this.playerBody.wasTouching.right;

        // Reset horizontal velocity each frame
        let targetVelocityX = 0;

        // Handle horizontal movement input
        if (wantsLeft) {
            if (blockedLeft) {
            } else {
                targetVelocityX = -this.speed;
                this.lastDirection = "left";
            }
        } else if (wantsRight) {
            if (blockedRight) {
            } else {
                targetVelocityX = this.speed;
                this.lastDirection = "right";
            }
        }

        this.playerBody.setVelocityX(targetVelocityX);

        // Jumping is fun
        if (jump && this.playerBody.onFloor()) {
            this.jump();
        }

        // Attacking is cool too if you're into that sort of thing.
        const now = this.scene.time.now;
        if (attack) {
            this.handleAttackInput(now);
        } else {
            this.attackPressedLastFrame = false;
        }

        this.updateAttackState(now);
        this.postUpdate();

        if (this.attackActive) {
            return;
        }

        // Update movement animation
        this.refreshPlayerAnimation();
    }

    public override preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);
        if (this.frame !== this.lastBodyFrame) {
            this.updateBodyOffsetFromFrame();
            this.lastBodyFrame = this.frame;
        }
    }

    public setAttackTargets(
        targets?:
            | Phaser.Types.Physics.Arcade.ArcadeColliderType
            | Phaser.Types.Physics.Arcade.ArcadeColliderType[],
    ) {
        this.attackTargets = targets;
    }

    public takeDamage(_amount: number, _source: Phaser.GameObjects.GameObject) {
        if (!this.active) {
            return;
        }
        this.handleDeath();
    }

    public isAttackInProgress(): boolean {
        return this.attackActive;
    }

    protected abstract playIdleAnimation(direction: "left" | "right"): void;

    protected abstract playRunAnimation(direction: "left" | "right"): void;

    protected postUpdate(): void {
        // Extension point for subclasses that need extra per-frame work.
    }

    protected refreshPlayerAnimation(): void {
        const movedHorizontally = Math.abs(this.playerBody.deltaX()) > 1;
        const touchingHorizontally =
            this.playerBody.blocked.left ||
            this.playerBody.blocked.right ||
            this.playerBody.touching.left ||
            this.playerBody.touching.right;
        const onGround = this.playerBody.onFloor();

        if (movedHorizontally && !touchingHorizontally) {
            this.playRunAnimation(this.lastDirection);
        } else if (onGround) {
            this.playIdleAnimation(this.lastDirection);
        }

        // Jumping.falling animations are handled in subclasses rn.
    }

    protected onAttackStarted(): void {
        // Extension point for subclasses to react to attack start.
    }

    protected onAttackEnded(): void {
        this.refreshPlayerAnimation();
    }

    protected onAttackHit(target: Phaser.GameObjects.GameObject): void {
        const damageable = target as unknown as {
            takeDamage?: (amount: number, source: Player) => void;
        };
        if (typeof damageable.takeDamage === "function") {
            damageable.takeDamage(this.attackConfig.damage, this);
        }

        this.applyKnockback(target);

        this.scene.events.emit("player-attack-hit", {
            player: this,
            target,
            damage: this.attackConfig.damage,
        });
    }

    protected jump() {
        this.playerBody.setVelocityY(-this.jumpSpeed);
    }

    private handleAttackInput(now: number) {
        // Ignore if pressed last frame to prevent multiple attacks from a single press
        if (this.attackPressedLastFrame) {
            return;
        }
        this.attackPressedLastFrame = true;

        // Ignore if already attacking or in cooldown
        if (this.attackActive || now < this.attackCooldownUntil) {
            return;
        }

        this.beginAttack(now);
    }

    private beginAttack(now: number) {
        this.attackActive = true;
        this.attackActiveUntil = now + this.attackConfig.duration;
        this.attackCooldownUntil = now + this.attackConfig.cooldown;
        this.attackHitsThisSwing.clear();
        this.attackHitbox
            .setActive(true)
            .setVisible(false)
            .setSize(this.attackConfig.width, this.attackConfig.height);
        this.attackHitboxBody.enable = true;
        this.attackHitboxBody.setSize(this.attackConfig.width, this.attackConfig.height);
        this.attackHitboxBody.setAllowGravity(false);
        this.attackHitboxBody.setImmovable(true);

        this.refreshAttackHitboxPosition();
        this.onAttackStarted();
    }

    private updateAttackState(now: number) {
        if (!this.attackActive) {
            return;
        }

        this.refreshAttackHitboxPosition();
        this.checkAttackCollisions();

        if (now >= this.attackActiveUntil) {
            this.attackActive = false;
            this.attackHitboxBody.enable = false;
            this.attackHitbox.setActive(false);
            this.attackHitbox.setPosition(-9999, -9999);
            this.attackHitboxBody.reset(-9999, -9999);
            this.onAttackEnded();
        }
    }

    private refreshAttackHitboxPosition() {
        const halfBodyWidth = this.playerBody.width / 2;
        const facingMultiplier = this.lastDirection === "right" ? 1 : -1;
        const offsetX =
            facingMultiplier *
            (halfBodyWidth + this.attackConfig.reach + this.attackConfig.width / 2);
        const centerX = this.x + offsetX;
        const centerY = this.y - this.playerBody.height / 2 + this.attackConfig.verticalOffset;

        this.attackHitbox.setPosition(centerX, centerY);
        this.attackHitboxBody.reset(centerX, centerY);
    }

    private checkAttackCollisions() {
        if (!this.attackTargets) {
            return;
        }

        // Normalize to array
        const targets = Array.isArray(this.attackTargets)
            ? this.attackTargets
            : [this.attackTargets];

        targets.forEach((targetGroup) => {
            if (!targetGroup) {
                return;
            }

            this.scene.physics.overlap(
                this.attackHitbox,
                targetGroup,
                (_hitbox, target) => {
                    const resolved = this.resolveCollisionTarget(target);
                    if (!resolved || this.attackHitsThisSwing.has(resolved)) {
                        return;
                    }
                    this.attackHitsThisSwing.add(resolved);
                    this.onAttackHit(resolved);
                },
                undefined,
                this,
            );
        });
    }

    private resolveCollisionTarget(
        target:
            | Phaser.Types.Physics.Arcade.GameObjectWithBody
            | Phaser.Physics.Arcade.Body
            | Phaser.Physics.Arcade.StaticBody
            | Phaser.Tilemaps.Tile
            | null
            | undefined,
    ): Phaser.GameObjects.GameObject | null {
        if (!target) {
            return null;
        }

        if ("gameObject" in target && target.gameObject) {
            return target.gameObject as Phaser.GameObjects.GameObject;
        }

        if (target instanceof Phaser.GameObjects.GameObject) {
            return target;
        }

        return null;
    }

    private applyKnockback(target: Phaser.GameObjects.GameObject) {
        const body = this.resolvePhysicsBody(target);
        if (!body || body.immovable) {
            return;
        }

        const { horizontal, vertical, duration } = this.attackConfig.knockback;
        const ms = Math.max(duration, 1);
        const seconds = ms / 1000;
        const direction = this.lastDirection === "right" ? 1 : -1;

        if (horizontal !== 0) {
            const vx = (horizontal / seconds) * direction;
            body.setVelocityX(vx);
            this.scheduleVelocityReset(target, "x", vx, ms);
        }

        if (vertical !== 0) {
            const vy = -((Math.sign(vertical) * Math.abs(vertical)) / seconds);
            body.setVelocityY(vy);
            this.scheduleVelocityReset(target, "y", vy, ms);
        }
    }

    private resolvePhysicsBody(
        target: Phaser.GameObjects.GameObject,
    ): Phaser.Physics.Arcade.Body | null {
        const maybeBody = target.body;
        if (maybeBody instanceof Phaser.Physics.Arcade.Body) {
            return maybeBody;
        }

        return null;
    }

    private handleDeath() {
        if (!this.active) {
            return;
        }

        this.playerBody.enable = false;

        // Death zoom transition, then switch to PlayerSelect scene.
        const { x: focusX, y: focusY } = this.playerBody.center;
        const camera = this.scene.cameras.main;
        const originalZoom = camera.zoom;
        const zoomDuration = 2000;
        camera.stopFollow();
        camera.pan(focusX, focusY, zoomDuration, "Sine.easeInOut", true);
        camera.zoomTo(originalZoom * 2, zoomDuration, "Sine.easeInOut");

        this.scene.time.delayedCall(3000, () => {
            camera.setZoom(originalZoom);

            const scenePlugin = this.scene.scene;
            if (scenePlugin.isActive("ui")) {
                scenePlugin.stop("ui");
            }

            this.setActive(false);
            this.setVisible(false);
            this.scene.events.emit("player-dead", { player: this });

            scenePlugin.stop("Game");

            scenePlugin.start("PlayerSelect");
        });
    }

    private scheduleVelocityReset(
        target: Phaser.GameObjects.GameObject,
        axis: "x" | "y",
        appliedVelocity: number,
        duration: number,
    ) {
        const dataKey = axis === "x" ? "__knockbackVX" : "__knockbackVY";
        target.setData(dataKey, appliedVelocity);

        this.scene.time.delayedCall(duration, () => {
            if (!target.active) {
                return;
            }
            const body = this.resolvePhysicsBody(target);
            if (!body) {
                return;
            }

            if (target.getData(dataKey) !== appliedVelocity) {
                return; // superseded by a more recent knockback
            }

            target.setData(dataKey, 0);

            if (axis === "x") {
                body.setVelocityX(0);
            } else {
                if (body.velocity.y < 0) {
                    body.setVelocityY(0);
                }
            }
        });
    }

    public override destroy(fromScene?: boolean): void {
        this.attackHitbox.destroy();
        super.destroy(fromScene);
    }

    // Update the body offset based on the current frame to keep the body centered on the sprite
    private updateBodyOffsetFromFrame(): void {
        const body = this.playerBody;
        if (!body) {
            return;
        }

        const frame = this.frame;
        if (frame) {
            const offsetX = frame.x + frame.width / 2 - body.width / 2;
            const offsetY = frame.y + frame.height - body.height;
            body.setOffset(Math.round(offsetX), Math.round(offsetY));
            return;
        }

        const fallbackOffsetX = this.displayOriginX - body.width / 2;
        const fallbackOffsetY = this.displayOriginY - body.height;
        body.setOffset(Math.round(fallbackOffsetX), Math.round(fallbackOffsetY));
    }
}

class Rovert extends Player {
    protected speed: number = 150;
    protected jumpSpeed: number = 200;
    protected attackConfig: AttackConfig = {
        width: 22,
        height: 16,
        reach: 6,
        verticalOffset: -2,
        duration: 500,
        cooldown: 620,
        damage: 1,
        knockback: {
            horizontal: 20,
            vertical: 10,
            duration: 200,
        },
    };

    protected playIdleAnimation(direction: "left" | "right"): void {
        const newAnimation = direction === "left" ? "rovert-idle-left" : "rovert-idle-right";

        // Play the animation if there is no animation playing of if the current animation is different than the new one.
        if (
            !this.anims.isPlaying ||
            !this.anims.currentAnim ||
            this.anims.currentAnim.key !== newAnimation
        ) {
            this.play(newAnimation, true);
        }
    }
    protected playRunAnimation(direction: "left" | "right"): void {
        const animationKey = direction === "left" ? "rovert-running-left" : "rovert-running-right";

        // Only switch animation if it’s different than the current one.
        if (this.anims.currentAnim?.key !== animationKey || !this.anims.isPlaying) {
            const switchingDirectionWhileRunning =
                this.anims.currentAnim?.key?.includes("running") ?? false;
            const frameIdx = switchingDirectionWhileRunning
                ? (this.anims.currentFrame?.index ?? 0)
                : 0;
            this.play(animationKey, true);
            if (switchingDirectionWhileRunning && this.anims.currentAnim) {
                const frames = this.anims.currentAnim.frames;
                if (frames.length > 0) {
                    const clampedIndex = Math.min(frameIdx, frames.length - 1);
                    const frame = frames[clampedIndex];
                    if (frame) {
                        this.anims.setCurrentFrame(frame);
                    }
                }
            }
        }
    }
    protected override onAttackStarted(): void {
        super.onAttackStarted();

        const facing = this.lastDirection;
        const sceneAnims = this.scene.anims;
        const preferredKey = `rovert-idle-attack-${facing}`;
        if (sceneAnims?.exists(preferredKey)) {
            this.setFlipX(false);
            this.play(preferredKey, true);
            return;
        }

        this.setFlipX(facing === "left");
        this.play("rovert-idle-attack-right", true);
    }

    protected override onAttackEnded(): void {
        this.setFlipX(false);
        super.onAttackEnded();
    }
}

class Shuey extends Player {
    protected speed: number = 90; // Horizontal speed for movement
    protected jumpSpeed: number = 215; // Vertical speed for jumping
    protected wallSlideFallSpeedFactor: number = 0.6;
    private suppressLeftInputUntilRelease = false;
    private suppressRightInputUntilRelease = false;
    private wasWallSlidingLastFrame = false;
    protected attackConfig: AttackConfig = {
        width: 18,
        height: 14,
        reach: 1,
        verticalOffset: -4,
        duration: 420,
        cooldown: 520,
        damage: 1,
        knockback: {
            horizontal: 3,
            vertical: 10,
            duration: 160,
        },
    };
    private movingAttackSprite: Phaser.GameObjects.Sprite;
    private static readonly movingAttackSpriteYOffset = 0;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
        super(scene, x, y, texture);

        this.movingAttackSprite = scene.add.sprite(x, y, texture);
        this.movingAttackSprite.setOrigin(this.originX, this.originY);
        this.movingAttackSprite.setScale(this.scaleX, this.scaleY);
        ``;
        this.movingAttackSprite.setVisible(false).setActive(false);

        this.playerBody.setSize(8, 13); // Set the player body size
    }

    public override update(
        moveLeft: boolean,
        moveRight: boolean,
        jump: boolean,
        attack: boolean,
    ): void {
        const landedFromWallSlide = this.wasWallSlidingLastFrame && this.playerBody.onFloor();
        if (landedFromWallSlide) {
            if (moveLeft) {
                this.suppressLeftInputUntilRelease = true;
            }
            if (moveRight) {
                this.suppressRightInputUntilRelease = true;
            }
        }

        if (this.suppressLeftInputUntilRelease) {
            if (moveLeft) {
                moveLeft = false;
            } else {
                this.suppressLeftInputUntilRelease = false;
            }
        }
        if (this.suppressRightInputUntilRelease) {
            if (moveRight) {
                moveRight = false;
            } else {
                this.suppressRightInputUntilRelease = false;
            }
        }

        super.update(moveLeft, moveRight, jump, attack);

        this.wasWallSlidingLastFrame = this.getWallSlideDirection() !== null;
    }

    protected playIdleAnimation(direction: "left" | "right"): void {
        const animationKey = direction === "left" ? "shuey-idle-left" : "shuey-idle-right";

        // Play the animation if there is no animation playing of if the current animation is different than the new one.
        if (
            !this.anims.isPlaying ||
            !this.anims.currentAnim ||
            this.anims.currentAnim.key !== animationKey
        ) {
            this.play(animationKey, true);
        }
    }

    protected playRunAnimation(direction: "left" | "right"): void {
        const animationKey = direction === "left" ? "shuey-running-left" : "shuey-running-right";

        if (this.anims.currentAnim?.key !== animationKey || !this.anims.isPlaying) {
            const switchingDirectionWhileRunning =
                this.anims.currentAnim?.key?.includes("running") ?? false;
            const frameIdx = switchingDirectionWhileRunning
                ? (this.anims.currentFrame?.index ?? 0)
                : 0;
            this.play(animationKey, true);
            if (switchingDirectionWhileRunning && this.anims.currentAnim) {
                const frames = this.anims.currentAnim.frames;
                if (frames.length > 0) {
                    const clampedIndex = Math.min(frameIdx, frames.length - 1);
                    const frame = frames[clampedIndex];
                    if (frame) {
                        this.anims.setCurrentFrame(frame);
                    }
                }
            }
        }
    }

    protected override refreshPlayerAnimation(): void {
        const body = this.playerBody;
        const wallSlideDirection = this.getWallSlideDirection();
        const isAirborne = !body.onFloor();

        if (wallSlideDirection) {
            const animationKey =
                wallSlideDirection === "left" ? "shuey-wall-slide-left" : "shuey-wall-slide-right";
            if (this.anims.currentAnim?.key !== animationKey || !this.anims.isPlaying) {
                this.play(animationKey, true);
            }
            const facingAwayFromWall = wallSlideDirection === "left" ? "right" : "left";
            this.lastDirection = facingAwayFromWall;
            return;
        }

        if (isAirborne && Math.abs(body.velocity.y) > RISING_FALLING_ANIMATION_VELOCITY_THRESHOLD) {
            const rising = body.velocity.y < 0;
            if (rising) {
                const animationKey =
                    this.lastDirection === "left"
                        ? "shuey-jump-rise-left"
                        : "shuey-jump-rise-right";
                if (this.anims.currentAnim?.key !== animationKey || !this.anims.isPlaying) {
                    this.play(animationKey, true);
                }
                return;
            } else {
                const animationKey =
                    this.lastDirection === "left"
                        ? "shuey-jump-fall-left"
                        : "shuey-jump-fall-right";
                if (this.anims.currentAnim?.key !== animationKey || !this.anims.isPlaying) {
                    this.play(animationKey, true);
                }
                return;
            }
        }

        super.refreshPlayerAnimation();
    }

    protected override postUpdate(): void {
        this.applyWallSlideFallRate();
        super.postUpdate();

        // Sync moving attack sprite position with base sprite
        const offsetY = Shuey.movingAttackSpriteYOffset;
        const snapX = Math.round(this.x);
        const snapY = Math.round(this.y - offsetY);
        this.movingAttackSprite.setPosition(snapX, snapY);
        this.movingAttackSprite.setDepth(this.depth + 1);
        this.movingAttackSprite.setScale(this.scaleX, this.scaleY);
    }

    private getWallSlideDirection(): "left" | "right" | null {
        const body = this.playerBody;
        if (!body || body.onFloor() || body.velocity.y <= 0) {
            return null;
        }

        const touchingLeft = body.blocked.left || body.touching.left || body.wasTouching.left;
        const touchingRight = body.blocked.right || body.touching.right || body.wasTouching.right;

        if (touchingLeft) {
            return "left";
        }
        if (touchingRight) {
            return "right";
        }
        return null;
    }

    private applyWallSlideFallRate(): void {
        const direction = this.getWallSlideDirection();
        if (!direction) {
            return;
        }
        const body = this.playerBody;
        if (body.velocity.y <= 0) {
            return;
        }
        const multiplier = this.wallSlideFallSpeedFactor ?? 1;
        if (multiplier === 1) {
            return;
        }
        body.setVelocityY(body.velocity.y * multiplier);
    }

    private cropSprite(): void {
        // Crop to show only the lower body of the sprite
        this.setCrop(0, 21, 1000, 20); // (x, y, w, h)
    }

    protected override onAttackStarted(): void {
        super.onAttackStarted();

        const movingHorizontally = Math.abs(this.playerBody.velocity.x) > 10;
        const direction = this.lastDirection;

        this.resetMovingAttackSprite();

        if (movingHorizontally) {
            this.cropSprite();

            this.playMovingAttackAnimation(direction);
            return;
        }

        this.playIdleAttackAnimation(direction);
    }

    protected override onAttackEnded(): void {
        // Reset any cropping applied during attack
        this.setCrop();

        this.resetMovingAttackSprite();
        super.onAttackEnded();
    }

    private playMovingAttackAnimation(direction: "left" | "right"): void {
        const animationKey =
            direction === "left" ? "shuey-moving-attack-left" : "shuey-moving-attack-right";

        this.movingAttackSprite.setActive(true).setVisible(true);
        this.movingAttackSprite.play(animationKey);
    }

    private playIdleAttackAnimation(direction: "left" | "right"): void {
        const animationKey =
            direction === "left" ? "shuey-idle-attack-left" : "shuey-idle-attack-right";

        this.play(animationKey, true);
    }

    private resetMovingAttackSprite(): void {
        this.movingAttackSprite.setVisible(false).setActive(false);
        this.movingAttackSprite.anims.stop();
    }

    public override destroy(fromScene?: boolean): void {
        this.movingAttackSprite.destroy();
        super.destroy(fromScene);
    }
}

export default Player;
export { Rovert, Shuey };
