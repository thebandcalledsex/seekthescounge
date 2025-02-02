import Phaser from "phaser";
import Game from "./scenes/game";

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 390,
    height: 180,
    scene: [Game],
};

new Phaser.Game(config);
