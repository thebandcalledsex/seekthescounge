import Phaser from "phaser";

abstract class Player extends Phaser.Physics.Arcade.Sprite {
    protected speed: number = 200; // Horizontal speed for movement
    protected jumpSpeed: number = 200; // Vertical speed for jumping
    private playerBody: Phaser.Physics.Arcade.Body; // Declare a separate playerBody property
    private lastDirection: "left" | "right" = "right"; // Default to facing right

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
        super(scene, x, y, texture); // Use "player" as a placeholder texture key

        scene.add.existing(this); // Add player to the scene
        scene.physics.world.enable(this); // Enable dynamic physics body (Phaser.Physics.Arcade.Body)
        this.setOrigin(0.5, 1); // Center the player sprite

        this.playerBody = this.body as Phaser.Physics.Arcade.Body;
        this.playerBody.setSize(16, 16); // Set the player body size

        this.playerBody.setCollideWorldBounds(true);

        // Scale the player sprite
        this.setScale(1);
    }

    public update(moveLeft: boolean, moveRight: boolean, jump: boolean, attack: boolean): void {
        // Reset horizontal velocity each frame
        this.playerBody.setVelocityX(0);

        // Horizontal movement (Left and Right)
        if (moveLeft) {
            this.playerBody.setVelocityX(-this.speed); // Move left

            this.lastDirection = "left";
        }
        if (moveRight) {
            this.playerBody.setVelocityX(this.speed); // Move right

            this.lastDirection = "right";
        }

        // Jumping is fun
        if (jump && this.playerBody.onFloor()) {
            this.jump();
        }

        // Attacking is cool too if you're into that sort of thing.
        if (attack) {
            this.attack();
        }

        // Choose animation based on movement state
        if (this.playerBody.velocity.x === 0 && this.playerBody.onFloor()) {
            // Idle animation
            this.playIdleAnimation(this.lastDirection);
        } else if (this.playerBody.velocity.x !== 0) {
            // Running animation
            this.playRunAnimation(this.lastDirection);
        }
    }

    protected abstract playIdleAnimation(direction: "left" | "right"): void;

    protected abstract playRunAnimation(direction: "left" | "right"): void;

    protected abstract attack(): void;

    protected jump() {
        this.playerBody.setVelocityY(-this.jumpSpeed);
    }
}

class Rovert extends Player {
    protected speed: number = 150; // Horizontal speed for movement
    protected jumpSpeed: number = 200; // Vertical speed for

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

    protected attack(): void {
        // Placeholder for Rovert's attack logic
        console.log("Rovert attacks!");
    }
}

class Shuey extends Player {
    protected speed: number = 90; // Horizontal speed for movement
    protected jumpSpeed: number = 215; // Vertical speed for

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

    protected attack(): void {
        // Placeholder for Shuey's attack logic
        console.log("Shuey attacks!");
    }
}

export default Player;
export { Rovert, Shuey };
