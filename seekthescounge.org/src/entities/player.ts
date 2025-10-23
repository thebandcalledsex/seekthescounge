import Phaser from "phaser";

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

    private playerBody: Phaser.Physics.Arcade.Body;
    private lastDirection: "left" | "right" = "right"; // Default to facing right
    private attackHitbox: Phaser.GameObjects.Zone;
    private attackHitboxBody: Phaser.Physics.Arcade.Body;
    private attackTargets?: Phaser.Types.Physics.Arcade.ArcadeColliderType;
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

        // Choose animation based on movement state
        const movedHorizontally = Math.abs(this.playerBody.deltaX()) > 1;
        const touchingHorizontally =
            this.playerBody.blocked.left ||
            this.playerBody.blocked.right ||
            this.playerBody.touching.left ||
            this.playerBody.touching.right;
        const onGround = this.playerBody.onFloor();

        if (movedHorizontally && !touchingHorizontally) {
            // Running animation
            this.playRunAnimation(this.lastDirection);
        } else if (onGround) {
            // Idle animation
            this.playIdleAnimation(this.lastDirection);
        }
    }

    public setAttackTargets(targets?: Phaser.Types.Physics.Arcade.ArcadeColliderType) {
        this.attackTargets = targets;
    }

    public isAttackInProgress(): boolean {
        return this.attackActive;
    }

    protected abstract playIdleAnimation(direction: "left" | "right"): void;

    protected abstract playRunAnimation(direction: "left" | "right"): void;

    protected onAttackStarted(): void {
        // Hook for subclasses to trigger attack-specific effects/animations.
    }

    protected onAttackEnded(): void {
        // Hook for subclasses to clean up after an attack finishes.
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

        this.scene.physics.overlap(
            this.attackHitbox,
            this.attackTargets,
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
}

class Rovert extends Player {
    protected speed: number = 150;
    protected jumpSpeed: number = 200;
    protected attackConfig: AttackConfig = {
        width: 22,
        height: 16,
        reach: 6,
        verticalOffset: -2,
        duration: 180,
        cooldown: 320,
        damage: 1,
        knockback: {
            horizontal: 36,
            vertical: 0,
            duration: 180,
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
            // Optional polish: if we’re switching L<->R while staying in "running",
            // keep the current frame index so the gait doesn’t “snap”.
            const switchingDirectionWhileRunning =
                this.anims.currentAnim?.key?.includes("running") ?? false;
            const frameIdx = switchingDirectionWhileRunning
                ? (this.anims.currentFrame?.index ?? 0)
                : 0;

            this.play(animationKey, true);
            if (switchingDirectionWhileRunning && this.anims.currentAnim?.frames[frameIdx]) {
                this.anims.setCurrentFrame(this.anims.currentAnim.frames[frameIdx]);
            }
        }
    }
}

class Shuey extends Player {
    protected speed: number = 90; // Horizontal speed for movement
    protected jumpSpeed: number = 215; // Vertical speed for jumping
    protected attackConfig: AttackConfig = {
        width: 18,
        height: 14,
        reach: 4,
        verticalOffset: -4,
        duration: 160,
        cooldown: 340,
        damage: 1,
        knockback: {
            horizontal: 3,
            vertical: 0,
            duration: 160,
        },
    };

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

        // Only switch animation if it’s different than the current one.
        if (this.anims.currentAnim?.key !== animationKey || !this.anims.isPlaying) {
            // Optional polish: if we’re switching L<->R while staying in "running",
            // keep the current frame index so the gait doesn’t “snap”.
            const switchingDirectionWhileRunning =
                this.anims.currentAnim?.key?.includes("running") ?? false;
            const frameIdx = switchingDirectionWhileRunning
                ? (this.anims.currentFrame?.index ?? 0)
                : 0;

            this.play(animationKey, true);
            if (switchingDirectionWhileRunning && this.anims.currentAnim?.frames[frameIdx]) {
                this.anims.setCurrentFrame(this.anims.currentAnim.frames[frameIdx]);
            }
        }
    }
}

export default Player;
export { Rovert, Shuey };
