import Phaser from "phaser";
import Game from "./scenes/game";
import { GAME_WIDTH, GAME_HEIGHT } from "./constants";

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
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
