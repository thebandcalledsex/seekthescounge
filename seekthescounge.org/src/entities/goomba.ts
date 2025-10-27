import Phaser from "phaser";
import Enemy, { EnemyConfig } from "./enemy";

const GOOMBA_CONFIG: EnemyConfig = {
    speed: 40,
    damage: 1,
    damageCooldown: 1000,
};

class Goomba extends Enemy {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, "goomba", GOOMBA_CONFIG);
    }
}

export default Goomba;
