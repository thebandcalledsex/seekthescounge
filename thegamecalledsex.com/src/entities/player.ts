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
        this.playerBody.setSize(16, 32); // Set the player body size

        this.playerBody.setCollideWorldBounds(true);

        // Scale the player sprite
        this.setScale(1);
    }

    public update(moveLeft: boolean, moveRight: boolean, jump: boolean) {
        // Reset horizontal velocity each frame
        this.playerBody.setVelocityX(0);

        // Horizontal movement (Left and Right)
        if (moveLeft) {
            this.playerBody.setVelocityX(-this.speed); // Move left

            if (this.lastDirection === "right") {
                this.handleDirectionChange("left");
            }
            this.lastDirection = "left";
        }
        if (moveRight) {
            this.playerBody.setVelocityX(this.speed); // Move right

            if (this.lastDirection === "left") {
                this.handleDirectionChange("right");
            }
            this.lastDirection = "right";
        }

        // Jumping is fun
        if (jump && this.playerBody.onFloor()) {
            this.playerBody.setVelocityY(-this.jumpSpeed);
        }

        // Handle idle animation
        if (this.playerBody.velocity.x === 0 && this.playerBody.velocity.y === 0) {
            this.playIdleAnimation(this.lastDirection);
        }
    }

    protected abstract playIdleAnimation(direction: "left" | "right"): void;

    protected abstract handleDirectionChange(direction: "left" | "right"): void;
}

class Rovert extends Player {
    protected speed: number = 150; // Horizontal speed for movement
    protected jumpSpeed: number = 200; // Vertical speed for

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
        super(scene, x, y, texture);
        // Create the idle-right animation
        scene.anims.create({
            key: "rovert-idle-right",
            frames: scene.anims.generateFrameNames("rovert-idle-right", {
                prefix: "ROVERT TGCS #IDLE INSIDE ",
                start: 0,
                end: 7,
                suffix: ".aseprite",
            }),
            frameRate: 10,
            repeat: -1,
        });

        // Create the idle-left animation
        scene.anims.create({
            key: "rovert-idle-left",
            frames: scene.anims.generateFrameNames("rovert-idle-left", {
                prefix: "ROVERT TGCS #IDLE INSIDE LEFT ",
                start: 0,
                end: 7,
                suffix: ".aseprite",
            }),
            frameRate: 10,
            repeat: -1,
        });

        // Default to right idle animation
        this.play("idle-right");
    }

    protected playIdleAnimation(direction: "left" | "right"): void {
        const newAnimation = direction === "left" ? "rovert-idle-left" : "rovert-idle-right";

        // Play the animation if there is no animation playing of if the current animation is different than the new one.
        if (
            !this.anims.isPlaying ||
            !this.anims.currentAnim ||
            this.anims.currentAnim.key !== newAnimation
        ) {
            this.play(newAnimation);
        }
    }

    // We may not need this once we have running/walking animations, this was just to aid in the transition before
    // hitting the idle animation before we have the running animations.
    protected handleDirectionChange(direction: "left" | "right"): void {
        // console.log("direction change: ", direction);

        // Stop the current animation
        this.anims.stop();

        if (direction === "left") {
            this.setTexture("rovert-idle-left");
            this.setFrame("ROVERT TGCS #IDLE INSIDE LEFT 0.aseprite");
        } else {
            this.setTexture("rovert-idle-right");
            this.setFrame("ROVERT TGCS #IDLE INSIDE 0.aseprite");
        }
    }
}

class Shuey extends Player {
    protected speed: number = 200; // Horizontal speed for movement
    protected jumpSpeed: number = 300; // Vertical speed for

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
        super(scene, x, y, texture);

        // Create the idle-right animation
        scene.anims.create({
            key: "shuey-idle-right",
            frames: scene.anims.generateFrameNames("shuey-idle-right", {
                prefix: "SHUEY TGCS #IDLE INSIDE ",
                start: 0,
                end: 7,
                suffix: ".aseprite",
            }),
            frameRate: 10,
            repeat: -1,
        });

        // Create the idle-left animation
        scene.anims.create({
            key: "shuey-idle-left",
            frames: scene.anims.generateFrameNames("shuey-idle-left", {
                prefix: "SHUEY TGCS #IDLE INSIDE LEFt ",
                start: 0,
                end: 7,
                suffix: ".aseprite",
            }),
            frameRate: 10,
            repeat: -1,
        });

        // Default to right idle animation
        this.play("shuey-idle-right");
    }

    protected playIdleAnimation(direction: "left" | "right"): void {
        const newAnimation = direction === "left" ? "shuey-idle-left" : "shuey-idle-right";

        // Play the animation if there is no animation playing of if the current animation is different than the new one.
        if (
            !this.anims.isPlaying ||
            !this.anims.currentAnim ||
            this.anims.currentAnim.key !== newAnimation
        ) {
            this.play(newAnimation);
        }
    }

    // We may not need this once we have running/walking animations, this was just to aid in the transition before
    // hitting the idle animation before we have the running animations.
    protected handleDirectionChange(direction: "left" | "right"): void {
        // console.log("direction change: ", direction);

        // Stop the current animation
        this.anims.stop();

        if (direction === "left") {
            this.setTexture("shuey-idle-left");
            this.setFrame("SHUEY TGCS #IDLE INSIDE LEFt 0.aseprite");
        } else {
            this.setTexture("shuey-idle-right");
            this.setFrame("SHUEY TGCS #IDLE INSIDE 0.aseprite");
        }
    }
}

export default Player;
export { Rovert, Shuey };
