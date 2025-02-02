import Phaser from "phaser";

class Game extends Phaser.Scene {
    constructor() {
        super({ key: "Game" });
    }

    preload() {}

    create() {
        // Add text at the center of the screen
        this.add.text(100, 90, "Hello, Phaser!", {
            fontSize: "16px",
            color: "#fff",
          });
    }

    update() {}
}

export default Game;
