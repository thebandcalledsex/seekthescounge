import Phaser from "phaser";
import Player from "../entities/player";
import Obstacle from "../entities/obstacle";
import InputController from "../input/input-controller";

class Game extends Phaser.Scene {
    private player!: Player;
    private obstacle!: Obstacle;
    private inputController!: InputController;

    constructor() {
        super({ key: "Game" });
    }

    public preload() {
        // Load assets here
        console.log("Preloading assets....");
        // Example: Load a player sprite
        // Example: Load a background image
    }

    public create() {
        // Create game objects here
        console.log("Creating game objects...");

        // Add text at the center of the screen
        this.add.text(100, 90, "Seek The Scounge", {
            fontSize: "16px",
            color: "#fff",
        });

        this.player = new Player(this, 100, 100); // Create player at (100,100)

        //this.obstacle = new Obstacle(this, 200, 100);
        //this.physics.add.collider(this.player, this.obstacle); // Add collision between player and obstacle

        // Instantiate the input controller
        this.inputController = new InputController(this);
    }

    public update() {
        // Update game objects here every frame

        // Check for player input
        this.player.update(
            this.inputController.isLeftPressed(),
            this.inputController.isRightPressed(),
            this.inputController.isJumpPressed(),
        );
    }
}

export default Game;
