import Phaser from "phaser";
import { RISING_FALLING_ANIMATION_VELOCITY_THRESHOLD } from "../constants";

interface AttackConfig {
    width: number;
    height: number;
    reach: number;
    verticalOffset: number;
    startDelay: number; // ms offset before the hitbox becomes active
    duration: number;
    cooldown: number;
    damage: number;
    knockback: {
        horizontal: number; // pixels to shove along X
        vertical: number; // pixels to lift (positive = up)
        duration: number; // milliseconds to complete knockback
    };
}

interface AttackContext {
    isMovingAttack: boolean;
}

abstract class Player extends Phaser.Physics.Arcade.Sprite {
    protected speed: number = 200; // Horizontal speed for movement
    protected jumpSpeed: number = 200; // Vertical speed for jumping
    protected wallSlideFallSpeedFactor: number = 1; // Multiplier applied while wall sliding; subclasses override
    protected groundDragX: number = 0; // Ground friction
    protected airDragX: number = 80; // Air resistance
    protected attackConfig: AttackConfig = {
        width: 18,
        height: 14,
        reach: 4,
        verticalOffset: 0,
        startDelay: 0,
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
    protected isDead: boolean = false;
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
    private attackHitboxActive = false;
    private attackHitboxActivatesAt = 0;
    private attackPressedLastFrame = false;
    private activeAttackConfig!: AttackConfig;
    private activeAttackContext: AttackContext = { isMovingAttack: false };

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
        super(scene, x, y, texture); // Use "player" as a placeholder texture key

        scene.add.existing(this); // Add player to the scene
        scene.physics.world.enable(this); // Enable dynamic physics body (Phaser.Physics.Arcade.Body)
        this.setOrigin(0.5, 1); // Center the player sprite

        this.playerBody = this.body as Phaser.Physics.Arcade.Body;
        this.playerBody.setSize(16, 16); // Set the player body size

        this.playerBody.setCollideWorldBounds(true);
        this.playerBody.setDragX(this.groundDragX);

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

        this.activeAttackConfig = this.attackConfig;
    }

    public update(moveLeft: boolean, moveRight: boolean, jump: boolean, attack: boolean): void {
        const now = this.scene.time.now;

        if (this.isDead || !this.active) {
            this.attackPressedLastFrame = false;
            this.playerBody.setVelocityX(0);
            this.updateAttackState(now);
            this.postUpdate();
            return;
        }

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
        const currentlyTouchingLeft = this.playerBody.blocked.left || this.playerBody.touching.left;
        const currentlyTouchingRight =
            this.playerBody.blocked.right || this.playerBody.touching.right;

        const onGround = this.playerBody.onFloor();
        // Apply friction/air resistance
        this.playerBody.setDragX(onGround ? this.groundDragX : this.airDragX);

        // Preserve horizontal momentum in air; stop on ground when no input
        let targetVelocityX = onGround ? 0 : this.playerBody.velocity.x;

        // Handle horizontal movement input
        if (wantsLeft) {
            if (!blockedLeft) {
                targetVelocityX = -this.speed;
                this.lastDirection = "left";
            }
        } else if (wantsRight) {
            if (!blockedRight) {
                targetVelocityX = this.speed;
                this.lastDirection = "right";
            }
        }

        // If no input and the body is pressed into a wall, don't keep pushing
        if (!wantsLeft && !wantsRight) {
            if (currentlyTouchingLeft && targetVelocityX < 0) targetVelocityX = 0;
            if (currentlyTouchingRight && targetVelocityX > 0) targetVelocityX = 0;
        }

        this.playerBody.setVelocityX(targetVelocityX);

        // Jumping is fun
        if (jump && onGround) {
            this.jump();
        }

        // Attacking is cool too if you're into that sort of thing.
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
        if (!this.isDead) {
            this.refreshPlayerAnimation();
        }
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
        if (!this.active || this.isDead) {
            return;
        }

        // The player dies immediately upon taking any damage.
        this.handleDeath();
    }

    public isAttackInProgress(): boolean {
        return this.attackActive;
    }

    protected abstract playIdleAnimation(direction: "left" | "right"): void;

    protected abstract playRunAnimation(direction: "left" | "right"): void;

    protected abstract playDeathAnimation(): void;

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
        if (this.isDead) {
            return;
        }
        this.refreshPlayerAnimation();
    }

    protected onAttackHit(target: Phaser.GameObjects.GameObject): void {
        const damageable = target as unknown as {
            takeDamage?: (amount: number, source: Player) => void;
        };
        if (typeof damageable.takeDamage === "function") {
            damageable.takeDamage(this.getActiveAttackConfig().damage, this);
        }

        this.applyKnockback(target);

        this.scene.events.emit("player-attack-hit", {
            player: this,
            target,
            damage: this.getActiveAttackConfig().damage,
        });
    }

    protected jump() {
        this.playerBody.setVelocityY(-this.jumpSpeed);
    }

    protected canStartAttack(): boolean {
        return true;
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

        if (!this.canStartAttack()) {
            return;
        }

        this.beginAttack(now);
    }

    private beginAttack(now: number) {
        this.activeAttackContext = this.resolveAttackContext();
        this.activeAttackConfig = this.resolveAttackConfig(this.activeAttackContext);
        const config = this.getActiveAttackConfig();
        const startDelay = Math.max(0, config.startDelay);

        this.attackActive = true;
        this.attackHitboxActive = false;
        this.attackHitboxActivatesAt = now + startDelay;
        this.attackActiveUntil = this.attackHitboxActivatesAt + config.duration;
        this.attackCooldownUntil = now + config.cooldown;
        this.attackHitsThisSwing.clear();
        this.attackHitbox.setActive(false).setVisible(false).setSize(config.width, config.height);
        this.attackHitboxBody.enable = false;
        this.attackHitboxBody.setSize(config.width, config.height);
        this.attackHitboxBody.setAllowGravity(false);
        this.attackHitboxBody.setImmovable(true);
        this.attackHitbox.setPosition(-9999, -9999);
        this.attackHitboxBody.reset(-9999, -9999);
        if (startDelay === 0) {
            this.activateAttackHitbox();
        }
        this.onAttackStarted();
    }

    private activateAttackHitbox() {
        if (this.attackHitboxActive) {
            return;
        }
        this.attackHitboxActive = true;
        this.attackHitbox.setActive(true).setVisible(false);
        this.attackHitboxBody.enable = true;
        this.refreshAttackHitboxPosition();
    }

    private updateAttackState(now: number) {
        if (!this.attackActive) {
            return;
        }

        if (!this.attackHitboxActive && now >= this.attackHitboxActivatesAt) {
            this.activateAttackHitbox();
        }

        if (this.attackHitboxActive) {
            this.refreshAttackHitboxPosition();
            this.checkAttackCollisions();
        }

        if (now >= this.attackActiveUntil) {
            this.attackActive = false;
            this.attackHitboxActive = false;
            this.attackHitboxBody.enable = false;
            this.attackHitbox.setActive(false);
            this.attackHitbox.setPosition(-9999, -9999);
            this.attackHitboxBody.reset(-9999, -9999);
            this.onAttackEnded();
        }
    }

    private refreshAttackHitboxPosition() {
        const config = this.getActiveAttackConfig();
        const halfBodyWidth = this.playerBody.width / 2;
        const facingMultiplier = this.lastDirection === "right" ? 1 : -1;
        const offsetX = facingMultiplier * (halfBodyWidth + config.reach + config.width / 2);
        const centerX = this.x + offsetX;
        const centerY = this.y - this.playerBody.height / 2 + config.verticalOffset;

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

        const { horizontal, vertical, duration } = this.getActiveAttackConfig().knockback;
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

    protected resolveAttackContext(): AttackContext {
        return { isMovingAttack: false };
    }

    protected resolveAttackConfig(_context: AttackContext): AttackConfig {
        return this.attackConfig;
    }

    protected getActiveAttackConfig(): AttackConfig {
        return this.activeAttackConfig ?? this.attackConfig;
    }

    protected getActiveAttackContext(): AttackContext {
        return this.activeAttackContext;
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

    protected handleDeath() {
        if (!this.active) {
            return;
        }

        // Mark as dead to prevent further animation updates
        this.isDead = true;

        // Play death animation
        this.playDeathAnimation();

        // Death zoom transition, then switch back to the begin scene.
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
            if (scenePlugin.isActive("Ui")) {
                scenePlugin.stop("Ui");
            }

            this.setActive(false);
            this.setVisible(false);
            this.scene.events.emit("player-dead", { player: this });

            scenePlugin.stop("Game");

            scenePlugin.start("Begin");
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

    protected isTouchingStackedWall(direction: "left" | "right"): boolean {
        const body = this.playerBody;
        const touching =
            direction === "left"
                ? body.blocked.left || body.touching.left || body.wasTouching.left
                : body.blocked.right || body.touching.right || body.wasTouching.right;
        if (!touching) {
            return false;
        }

        const tilemapContext = this.getTilemapCollisionContext();
        if (!tilemapContext) {
            return touching;
        }

        const sideTile = this.getSideTileFacing(direction, tilemapContext);
        if (!sideTile || !sideTile.collides) {
            return false;
        }

        const aboveTile = tilemapContext.map.getTileAt(
            sideTile.x,
            sideTile.y - 1,
            false,
            tilemapContext.layer,
        );
        return Boolean(aboveTile && aboveTile.collides);
    }

    protected getTilemapCollisionContext(): {
        map: Phaser.Tilemaps.Tilemap;
        layer: Phaser.Tilemaps.TilemapLayer;
    } | null {
        const scene = this.scene as Phaser.Scene & {
            map?: Phaser.Tilemaps.Tilemap;
            groundLayer?: Phaser.Tilemaps.TilemapLayer;
            layer?: Phaser.Tilemaps.TilemapLayer;
        };
        const mapValue =
            scene.map ?? (scene.data?.get("map") as Phaser.Tilemaps.Tilemap | undefined);
        const layerValue =
            scene.groundLayer ??
            scene.layer ??
            (scene.data?.get("groundLayer") as Phaser.Tilemaps.TilemapLayer | undefined) ??
            (scene.data?.get("layer") as Phaser.Tilemaps.TilemapLayer | undefined);
        if (mapValue && layerValue) {
            return { map: mapValue, layer: layerValue };
        }
        return null;
    }

    protected getSideTileFacing(
        direction: "left" | "right",
        context: { map: Phaser.Tilemaps.Tilemap; layer: Phaser.Tilemaps.TilemapLayer },
    ): Phaser.Tilemaps.Tile | null {
        const body = this.playerBody;
        const sampleX = direction === "left" ? body.left - 1 : body.right + 1;
        const sampleYs = [body.bottom - 1, body.center.y, body.top + 1];
        const camera = this.scene.cameras?.main;

        for (const sampleY of sampleYs) {
            const tile = context.map.getTileAtWorldXY(
                sampleX,
                sampleY,
                false,
                camera,
                context.layer,
            );
            if (tile) {
                return tile;
            }
        }
        return null;
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
        startDelay: 120,
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

    protected playDeathAnimation(): void {
        this.play("rovert-idle", true);
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
    protected wallSlideFallSpeedFactor: number = 0.6; // 60% fall speed when wall sliding
    protected wallJumpHorizontalSpeed: number = 144; // Horizontal speed away from wall
    protected wallJumpUpwardSpeed: number = 255; // Upward speed when jumping off wall
    private suppressLeftInputUntilRelease = false;
    private suppressRightInputUntilRelease = false;
    // Track when each direction can start honoring input again after a wall jump.
    private leftInputResumeTime = 0;
    private rightInputResumeTime = 0;
    private wasWallSlidingLastFrame = false;
    private wasOnGroundLastFrame = false;
    // Track last wall slide direction plus a small hold window to smooth animation flicker.
    private lastWallSlideAnimationDirection: "left" | "right" | null = null;
    private wallSlideAnimationHoldUntil = 0;
    protected attackConfig: AttackConfig = {
        width: 13,
        height: 7,
        reach: 1,
        verticalOffset: -6,
        startDelay: 120,
        duration: 220,
        cooldown: 520,
        damage: 1,
        knockback: {
            horizontal: 4,
            vertical: 10,
            duration: 160,
        },
    };
    private movingAttackConfig: AttackConfig = {
        width: 11,
        height: 9,
        reach: 2,
        verticalOffset: -8,
        startDelay: 80,
        duration: 150,
        cooldown: 450,
        damage: 1,
        knockback: {
            horizontal: 3,
            vertical: 12,
            duration: 160,
        },
    };
    private movingAttackSprite: Phaser.GameObjects.Sprite;
    private static readonly movingAttackSpriteYOffset = 0;
    private static readonly movingAttackSpeedThreshold = 10;
    private static readonly wallSlideAnimationHoldDurationMs = 125;
    private static readonly wallJumpDirectionalResumeDelayMs = 500; // Delay before honoring input back toward the wall
    private wallSlideEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
    private nextWallSlideParticleAt = 0;
    private static readonly wallSlideParticleTextureKey = "wall-slide-particle";
    private static readonly wallSlideParticleIntervalMs = 80;
    private static readonly wallSlideParticleBaseSpeedX = { min: 10, max: 50 };
    private static readonly wallSlideParticleBaseSpeedY = { min: -20, max: 20 };
    private static readonly groundParticleSpeedX = { min: -40, max: 40 };
    private static readonly jumpParticleSpeedY = { min: -120, max: -70 };
    private static readonly landingParticleSpeedY = { min: -90, max: -40 };

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
        super(scene, x, y, texture);

        this.movingAttackSprite = scene.add.sprite(x, y, texture);
        this.movingAttackSprite.setOrigin(this.originX, this.originY);
        this.movingAttackSprite.setScale(this.scaleX, this.scaleY);
        this.movingAttackSprite.setVisible(false).setActive(false);

        const wallSlideParticleTextureKey = Shuey.initWallSlideParticleTexture(scene);
        this.wallSlideEmitter = scene.add.particles(0, 0, wallSlideParticleTextureKey, {
            lifespan: { min: 200, max: 900 },
            speedX: { ...Shuey.wallSlideParticleBaseSpeedX },
            speedY: { ...Shuey.wallSlideParticleBaseSpeedY },
            gravityY: 400,
            alpha: { start: 1, end: 0 },
            scale: { start: 1, end: 0 },
            quantity: 1,
            tint: 0x000000,
            emitting: false,
        });
        this.wallSlideEmitter.setDepth(this.depth - 1);

        this.playerBody.setSize(5, 13); // Set the player body size
        this.wasOnGroundLastFrame = this.playerBody.onFloor();
    }

    public override update(
        moveLeft: boolean,
        moveRight: boolean,
        jump: boolean,
        attack: boolean,
    ): void {
        const now = this.scene.time.now;
        const wasOnGround = this.wasOnGroundLastFrame;
        let leftHeld = moveLeft;
        let rightHeld = moveRight;
        const landedFromWallSlide = this.wasWallSlidingLastFrame && this.playerBody.onFloor();
        if (landedFromWallSlide) {
            if (leftHeld) {
                this.suppressLeftInputUntilRelease = true;
            }
            if (rightHeld) {
                this.suppressRightInputUntilRelease = true;
            }
        }

        if (this.suppressLeftInputUntilRelease) {
            // Landing from a wall slide still requires releasing input once.
            if (moveLeft) {
                leftHeld = false;
            } else {
                this.suppressLeftInputUntilRelease = false;
            }
        }
        if (this.suppressRightInputUntilRelease) {
            if (moveRight) {
                rightHeld = false;
            } else {
                this.suppressRightInputUntilRelease = false;
            }
        }

        // Short-circuit any held direction until its resume time elapses; releasing clears it instantly.
        if (leftHeld) {
            if (now < this.leftInputResumeTime) {
                leftHeld = false;
            }
        } else if (this.leftInputResumeTime !== 0) {
            this.leftInputResumeTime = 0;
        }

        if (rightHeld) {
            if (now < this.rightInputResumeTime) {
                rightHeld = false;
            }
        } else if (this.rightInputResumeTime !== 0) {
            this.rightInputResumeTime = 0;
        }

        super.update(leftHeld, rightHeld, jump, attack);

        const onGroundNow = this.playerBody.onFloor();
        if (onGroundNow && !wasOnGround && this.playerBody.velocity.y >= 0) {
            this.emitLandingParticles();
        }

        // Wall jump: if wall sliding and jump is pressed, launch away from wall
        const wallSlideDirection = this.getWallSlideDirection();
        if (jump && wallSlideDirection) {
            const awaySign = wallSlideDirection === "left" ? 1 : -1; // +1 means jump right, -1 left
            // Apply outward horizontal and upward velocities
            this.playerBody.setVelocityX(awaySign * this.wallJumpHorizontalSpeed);
            this.playerBody.setVelocityY(-this.wallJumpUpwardSpeed);
            // Face away from the wall
            this.lastDirection = awaySign > 0 ? "right" : "left";
            // Suppress input toward the wall briefly so you can't instantly re-stick after jumping.
            const resumeAt = this.scene.time.now + Shuey.wallJumpDirectionalResumeDelayMs;
            if (wallSlideDirection === "left") {
                this.leftInputResumeTime = resumeAt;
            } else {
                this.rightInputResumeTime = resumeAt;
            }
            this.suppressLeftInputUntilRelease = false;
            this.suppressRightInputUntilRelease = false;
            // Refresh animation to reflect jump state
            this.refreshPlayerAnimation();
        }

        this.wasWallSlidingLastFrame = this.getWallSlideDirection() !== null;
        this.wasOnGroundLastFrame = onGroundNow;
    }

    protected override canStartAttack(): boolean {
        if (!super.canStartAttack()) {
            return false;
        }
        const key = this.anims.currentAnim?.key ?? "";
        // Disallow starting an attack while the wall-slide animation is active
        if (
            key === "shuey-wall-slide-left" ||
            key === "shuey-wall-slide-right" ||
            key.includes("wall-slide")
        ) {
            return false;
        }
        return true;
    }

    protected override resolveAttackContext(): AttackContext {
        const movingHorizontally =
            Math.abs(this.playerBody.velocity.x) > Shuey.movingAttackSpeedThreshold;
        return { isMovingAttack: movingHorizontally };
    }

    protected override resolveAttackConfig(context: AttackContext): AttackConfig {
        return context.isMovingAttack ? this.movingAttackConfig : this.attackConfig;
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

    protected playDeathAnimation(): void {
        this.play("shuey-death", true);
    }

    protected override refreshPlayerAnimation(): void {
        const body = this.playerBody;
        let wallSlideDirection = this.getWallSlideDirection();
        const isAirborne = !body.onFloor();
        const now = this.scene.time.now;

        // Handle wall slide animation with hold duration to smooth flicker
        if (body.onFloor() || body.velocity.y <= 0) {
            this.lastWallSlideAnimationDirection = null;
            this.wallSlideAnimationHoldUntil = 0;
        } else if (wallSlideDirection) {
            this.lastWallSlideAnimationDirection = wallSlideDirection;
            this.wallSlideAnimationHoldUntil = now + Shuey.wallSlideAnimationHoldDurationMs;
        } else if (this.lastWallSlideAnimationDirection && now < this.wallSlideAnimationHoldUntil) {
            // Keep playing the wall slide animation briefly when contact flickers or detaches for a frame.
            wallSlideDirection = this.lastWallSlideAnimationDirection;
        } else {
            this.lastWallSlideAnimationDirection = null;
        }

        // Play wall slide animation if applicable
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

        // Handle rising/falling animations
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
        this.emitWallSlideParticles();
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

        if (this.isTouchingStackedWall("left")) {
            return "left";
        }
        if (this.isTouchingStackedWall("right")) {
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

    private emitWallSlideParticles(): void {
        const direction = this.getWallSlideDirection();

        // Reset particle emission timer if not wall sliding
        if (!direction) {
            return;
        }

        // Return early if it's not time to emit the next particle yet.
        const now = this.scene.time.now;
        if (now < this.nextWallSlideParticleAt) {
            return;
        }
        this.nextWallSlideParticleAt = now + Shuey.wallSlideParticleIntervalMs;

        // Emit just outside the wall-facing side so dust pops off the wall face.
        const body = this.playerBody;
        const emitX = direction === "left" ? body.left + 2 : body.right - 2;
        const minY = Math.floor(body.top + 1);
        const maxY = Math.floor(body.center.y - 2);
        const emitY = maxY >= minY ? Phaser.Math.Between(minY, maxY) : body.center.y;

        // Push particles away from the wall (mirror directions).
        const awayFromWall = direction === "left" ? 1 : -1;

        const baseMin = Math.abs(Shuey.wallSlideParticleBaseSpeedX.min);
        const baseMax = Math.abs(Shuey.wallSlideParticleBaseSpeedX.max);
        const minSpeedX = baseMin * awayFromWall;
        const maxSpeedX = baseMax * awayFromWall;
        const tint = this.getWallTileTint(direction) ?? 0x000000;
        this.wallSlideEmitter.updateConfig({
            speedX: {
                min: Math.min(minSpeedX, maxSpeedX),
                max: Math.max(minSpeedX, maxSpeedX),
            },
            speedY: { ...Shuey.wallSlideParticleBaseSpeedY },
            tint,
        });
        this.wallSlideEmitter.explode(3, emitX, emitY);
    }

    private emitJumpParticles(): void {
        this.emitGroundParticles(4, Shuey.jumpParticleSpeedY);
    }

    private emitLandingParticles(): void {
        this.emitGroundParticles(6, Shuey.landingParticleSpeedY);
    }

    private emitGroundParticles(particleCount: number, speedY: { min: number; max: number }): void {
        const body = this.playerBody;
        const emitX = Phaser.Math.Between(Math.floor(body.left), Math.floor(body.right));
        const emitY = Math.floor(body.bottom - 1);
        const tint = this.getGroundTileTint() ?? 0x000000;

        this.wallSlideEmitter.updateConfig({
            speedX: { ...Shuey.groundParticleSpeedX },
            speedY: { ...speedY },
            tint,
        });
        this.wallSlideEmitter.explode(particleCount, emitX, emitY);
    }

    private getWallTileTint(direction: "left" | "right"): number | null {
        const context = this.getTilemapCollisionContext();
        if (!context) {
            return null;
        }
        const tile = this.getSideTileFacing(direction, context);
        return tile ? this.getTileTint(tile, context) : null;
    }

    private getGroundTileTint(): number | null {
        const context = this.getTilemapCollisionContext();
        if (!context) {
            return null;
        }

        const body = this.playerBody;
        const sampleX = Math.floor(body.center.x);
        const sampleY = Math.floor(body.bottom + 1);
        const camera = this.scene.cameras?.main;
        const tile = context.map.getTileAtWorldXY(sampleX, sampleY, false, camera, context.layer);
        return tile ? this.getTileTint(tile, context) : null;
    }

    private getTileTint(
        tile: Phaser.Tilemaps.Tile,
        context: { map: Phaser.Tilemaps.Tilemap; layer: Phaser.Tilemaps.TilemapLayer },
    ): number | null {
        const tileset = (tile as any).tileset ?? context.map.tilesets?.[0];
        if (!tileset) {
            return null;
        }

        const texCoords = tileset.getTileTextureCoordinates(tile.index);
        const coordX = (texCoords as { x?: number })?.x ?? null;
        const coordY = (texCoords as { y?: number })?.y ?? null;
        if (coordX === null || coordY === null) {
            return null;
        }

        const sampleX = Math.floor(coordX + tileset.tileWidth / 2);
        const sampleY = Math.floor(coordY + tileset.tileHeight / 2);
        const textureKey = (tileset.image?.key as string | undefined) ?? tileset.name;
        const pixel = textureKey
            ? this.scene.textures.getPixel(sampleX, sampleY, textureKey)
            : null;
        if (!pixel) {
            return null;
        }
        return pixel.color ?? Phaser.Display.Color.GetColor(pixel.red, pixel.green, pixel.blue);
    }

    private static initWallSlideParticleTexture(scene: Phaser.Scene): string {
        const key = Shuey.wallSlideParticleTextureKey;
        if (!scene.textures.exists(key)) {
            const graphics = scene.make.graphics({ x: 0, y: 0 });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillRect(0, 0, 1, 1);
            graphics.generateTexture(key, 1, 1);
            graphics.destroy();
        }
        return key;
    }

    private cropSprite(): void {
        // Crop to show only the lower body of the sprite
        this.setCrop(0, 21, 1000, 20); // (x, y, w, h)
    }

    protected override onAttackStarted(): void {
        super.onAttackStarted();

        const { isMovingAttack } = this.getActiveAttackContext();
        const direction = this.lastDirection;

        this.resetMovingAttackSprite();

        if (isMovingAttack) {
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
        if (this.movingAttackSprite.scene) {
            this.movingAttackSprite.destroy();
        }
        super.destroy(fromScene);
    }

    protected override jump(): void {
        super.jump();
        this.emitJumpParticles();
    }
}

export default Player;
export { Rovert, Shuey };
