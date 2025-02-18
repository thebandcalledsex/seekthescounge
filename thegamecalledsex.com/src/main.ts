import Phaser from "phaser";
import Game from "./scenes/game";
import PlayerSelect from "./scenes/player-select";
import { GAME_WIDTH, GAME_HEIGHT } from "./constants";

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    scene: [PlayerSelect, Game],
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
    pixelArt: true, // Enable pixel-perfect rendering
};

new Phaser.Game(config);
