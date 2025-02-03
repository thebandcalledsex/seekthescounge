import Phaser from "phaser";

class Player extends Phaser.Physics.Arcade.Sprite {
    private speed: number = 200; // Horizontal speed for movement
    private jumpSpeed: number = 300; // Vertical speed for jumping
    private playerBody: Phaser.Physics.Arcade.Body; // Declare a separate playerBody property

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, "player"); // Use "player" as a placeholder texture key

        scene.add.existing(this); // Add player to the scene
        scene.physics.world.enable(this); // Enable dynamic physics body (Phaser.Physics.Arcade.Body)
        this.setOrigin(0.5, 0.5); // Center the player sprite

        this.playerBody = this.body as Phaser.Physics.Arcade.Body;
        this.playerBody.setCollideWorldBounds(true);

        //body.setBounce(0.2); // Add slight bounce

        // Temporary square shape until a sprite is added
        this.setDisplaySize(27, 27);
        this.setTint(0x00ff10); // Temporary green color
    }

    public update(moveLeft: boolean, moveRight: boolean, jump: boolean) {
        // Reset horizontal velocity each frame
        this.playerBody.setVelocityX(0);

        // Horizontal movement (Left and Right)
        if (moveLeft) {
            this.playerBody.setVelocityX(-this.speed); // Move left
        }
        if (moveRight) {
            this.playerBody.setVelocityX(this.speed); // Move right
        }

        // Jump
        if (jump && this.playerBody.onFloor()) {
            this.playerBody.setVelocityY(-this.jumpSpeed);
        }
    }
}

export default Player;
