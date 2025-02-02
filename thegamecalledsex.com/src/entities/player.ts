import Phaser from "phaser";

class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, "player"); // Use "player" as a placeholder texture key

        scene.add.existing(this); // Add player to the scene
        scene.physics.add.existing(this); // Enable physics

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true); // Prevent player from leaving screen
        //body.setBounce(0.2); // Add slight bounce

        // Temporary square shape until a sprite is added
        this.setDisplaySize(27, 27);
        this.setTint(0x00ff10); // Temporary green color
    }
}

export default Player;
