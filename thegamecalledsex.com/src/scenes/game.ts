import Phaser from "phaser";
import { Rovert } from "../entities/player";
import { Shuey } from "../entities/player";
import Obstacle from "../entities/obstacle";
import InputController from "../input/input-controller";
import { GAME_VERSION } from "../constants";

class Game extends Phaser.Scene {
    private rovert!: Rovert;
    private shuey!: Shuey;
    private obstacle!: Obstacle;
    private inputController!: InputController;

    constructor() {
        super({ key: "Game" });
    }

    public preload() {
        // Load assets here
        console.log("Preloading assets....");

        this.load.atlas(
            "rovert-idle",
            "../../assets/rovert/idle.png",
            "../../assets/rovert/idle.json",
        );

        this.load.atlas(
            "shuey-idle",
            "../../assets/shuey/idle.png",
            "../../assets/shuey/idle.json",
        );
    }

    public create() {
        // Create game objects here
        console.log("Creating game objects...");

        this.rovert = new Rovert(this, 100, 100, "rovert-idle"); // Create rovert at (100,100)

        this.shuey = new Shuey(this, 200, 100, "shuey-idle"); // Create shuey at (200,100)

        // Add some id text to the screen for development
        this.add.text(10, 10, GAME_VERSION, { font: "16px Courier" });

        //this.obstacle = new Obstacle(this, 200, 100);
        //this.physics.add.collider(this.player, this.obstacle); // Add collision between player and obstacle

        // Instantiate the input controller
        this.inputController = new InputController(this);
    }

    public update() {
        // Update game objects here every frame

        // Check for input for rovert
        this.rovert.update(
            this.inputController.isLeftPressed(),
            this.inputController.isRightPressed(),
            this.inputController.isJumpPressed(),
        );

        // Check for input for shuey
        this.shuey.update(
            this.inputController.isLeftPressed(),
            this.inputController.isRightPressed(),
            this.inputController.isJumpPressed(),
        );
    }
}

export default Game;
