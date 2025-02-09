import Phaser from "phaser";
import Player from "../entities/player";
import Obstacle from "../entities/obstacle";
import InputController from "../input/input-controller";
import { GAME_VERSION } from "../constants";

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
        
        this.load.atlas("player", "../../assets/rovert/idle.png", "../../assets/rovert/idle.json");
    }

    public create() {
        // Create game objects here
        console.log("Creating game objects...");

        this.player = new Player(this, 100, 100); // Create player at (100,100)
        
        // Add some id text to the screen for development
        this.add.text(10, 10, GAME_VERSION, { font: "16px Courier" });

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
