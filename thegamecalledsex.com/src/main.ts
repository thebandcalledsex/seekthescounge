import Phaser from "phaser";
import Game from "./scenes/game";

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 390,
    height: 180,
    scene: [Game],
    physics: {
        default: "arcade",
        arcade: {
            gravity: { x: 0, y: 801 },
            debug: true, // Show physics bodies
        },
    },
    scale: {
        mode: Phaser.Scale.FIT, // Scale the game to fit the screen
        autoCenter: Phaser.Scale.CENTER_BOTH, // Center the game horizontally and vertically
    },
};

new Phaser.Game(config);
