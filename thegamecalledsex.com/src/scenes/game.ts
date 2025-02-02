import Phaser from "phaser";
import Player from "../entities/player";

class Game extends Phaser.Scene {
    private player!: Player;
    private cursorKeys!: Phaser.Types.Input.Keyboard.CursorKeys; 

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
        this.add.text(100, 90, "Seek The Scounge", {
            fontSize: "16px",
            color: "#fff",
        });

        this.player = new Player(this, 100, 100); // Create player at (100,100)

        // Enable keyboard input for arrow keys
        this.cursorKeys = this.input.keyboard!.createCursorKeys(); // Create cursor keys input

    }

    update() {
        // Update game objects here every frame

        // Update the player with the current cursor key input
        this.player.update(this.cursorKeys);
    }
}

export default Game;
