import Phaser from "phaser";
import Player from "../entities/player";

class Game extends Phaser.Scene {
    private player!: Player;

    constructor() {
        super({ key: "Game" });
    }

    preload() {
        // Load assets here
        console.log("Preloading assets....");
        // Example: Load a player sprite
        // Example: Load a background image
    }

    create() {
        // Create game objects here
        console.log("Creating game objects...");

        // Add text at the center of the screen
        this.add.text(100, 90, "Hello, Phaser!", {
            fontSize: "16px",
            color: "#fff",
        });

        this.player = new Player(this, 100, 100); // Create player at (100,100)
    }

    update() {
        // Update game objects here every frame
    }
}

export default Game;
