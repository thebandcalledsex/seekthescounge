import Phaser from "phaser";

class Obstacle extends Phaser.Physics.Arcade.Image {

    private obstacleBody: Phaser.Physics.Arcade.Body;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'obstacle'); // Assuming 'obstacle' is an asset
        
        // Enable physics for the obstacle
        scene.add.existing(this);  // Add the obstacle to the scene
        scene.physics.world.enable(this);
        
        this.obstacleBody = this.body as Phaser.Physics.Arcade.Body;
        this.obstacleBody.setCollideWorldBounds(true);

        this.obstacleBody.setImmovable(true); // Make the obstacle immovable
    }
}

export default Obstacle;
