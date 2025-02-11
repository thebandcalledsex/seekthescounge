import Phaser from "phaser";

abstract class Player extends Phaser.Physics.Arcade.Sprite {
    protected speed: number = 200; // Horizontal speed for movement
    protected jumpSpeed: number = 200; // Vertical speed for jumping
    private playerBody: Phaser.Physics.Arcade.Body; // Declare a separate playerBody property

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
        super(scene, x, y, texture); // Use "player" as a placeholder texture key

        scene.add.existing(this); // Add player to the scene
        scene.physics.world.enable(this); // Enable dynamic physics body (Phaser.Physics.Arcade.Body)
        this.setOrigin(0.5, 0.5); // Center the player sprite

        this.playerBody = this.body as Phaser.Physics.Arcade.Body;
        this.playerBody.setCollideWorldBounds(true);

        //body.setBounce(0.2); // Add slight bounce

        // Scale the player sprite
        this.setScale(2);
    }

    public update(moveLeft: boolean, moveRight: boolean, jump: boolean) {
        // Reset horizontal velocity each frame
        this.playerBody.setVelocityX(0);

        // Horizontal movement (Left and Right)
        if (moveLeft) {
            this.playerBody.setVelocityX(-this.speed); // Move left
            this.handleIdleAnimation("left");
        }
        if (moveRight) {
            this.playerBody.setVelocityX(this.speed); // Move right
            this.handleIdleAnimation("right");
        }

        // Jump
        if (jump && this.playerBody.onFloor()) {
            this.playerBody.setVelocityY(-this.jumpSpeed);
        }
    }

    protected abstract handleIdleAnimation(direction: "left" | "right"): void;
}

class Rovert extends Player {
    protected speed: number = 150; // Horizontal speed for movement
    protected jumpSpeed: number = 300; // Vertical speed for

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
        super(scene, x, y, texture);

        // Create the animation
        scene.anims.create({
            key: "idle",
            frames: scene.anims.generateFrameNames("rovert-idle", {
                prefix: "ROVERT TGCS #idle ",
                start: 0,
                end: 15,
                suffix: ".aseprite",
            }),
            frameRate: 10,
            repeat: -1,
        });

        // Play the animation
        this.play("idle");
    }

    protected handleIdleAnimation(direction: "left" | "right"): void {
        this.play("idle");
    }
}

class Shuey extends Player {
    protected speed: number = 300; // Horizontal speed for movement
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

    protected handleIdleAnimation(direction: "left" | "right"): void {
        if (direction === "left") {
            this.play("shuey-idle-left");
        } else {
            this.play("shuey-idle-right");
        }
    }
}

export default Player;
export { Rovert, Shuey };
