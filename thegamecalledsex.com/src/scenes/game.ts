import Phaser from "phaser";
import { Rovert } from "../entities/player";
import { Shuey } from "../entities/player";
import Obstacle from "../entities/obstacle";
import InputController from "../input/input-controller";
import { GAME_HEIGHT, GAME_VERSION, GAME_WIDTH } from "../constants";

class Game extends Phaser.Scene {
    private player!: Rovert | Shuey;
    private selectedPlayer: string = "Rovert";
    private inputController!: InputController;

    constructor() {
        super({ key: "Game" });
    }

    // Receive the selected player from the player selection scene
    init(data: { selectedPlayer: string }) {
        this.selectedPlayer = data.selectedPlayer || "Rovert";
    }

    public preload() {
        // Load assets here
        console.log("Preloading assets....");

        this.load.atlas(
            "rovert-idle-left",
            "../../assets/rovert/idle-left.png",
            "../../assets/rovert/idle-left.json",
        );

        this.load.atlas(
            "shuey-idle-left",
            "../../assets/shuey/idle-left.png",
            "../../assets/shuey/idle-left.json",
        );
    }

    public create() {
        // Create game objects here
        console.log("Creating game objects...");

        // Add some id text to the screen for development
        this.add.text(10, 10, GAME_VERSION, { font: "16px Courier" });

        // Establish the player based on the input from the player selection scene
        if (this.selectedPlayer === "Rovert") {
            this.player = new Rovert(this, 100, 100, "rovert-idle-right"); // Create rovert at (100,100)
        } else {
            this.player = new Shuey(this, 100, 100, "shuey-idle-right"); // Create shuey at (100,100)
        }

        // Set the world bounds
        this.cameras.main.setBounds(0, 0, GAME_WIDTH * 3, GAME_HEIGHT); // Adjust world bounds
        this.physics.world.setBounds(0, 0, GAME_WIDTH * 3, GAME_HEIGHT);

        // Create a camera to follow the player
        this.cameras.main.startFollow(this.player, true, 0.05, 0.05);

        // Instantiate the input controller
        this.inputController = new InputController(this);

        // Add a fullscreen button
        this.scale.fullscreenTarget = document.getElementById("game-container")!;
        const fullscreenButton = this.add
            .text(10, 40, "enter fullscreen", {
                font: "16px Courier",
                backgroundColor: "#000",
                color: "#FFF",
                padding: { left: 5, right: 5, top: 5, bottom: 5 },
            })
            .setInteractive()
            .on("pointerdown", () => {
                // flash the button to indicate it was pressed
                fullscreenButton.setAlpha(0.5);
                setTimeout(() => {
                    fullscreenButton.setAlpha(1);
                }, 100);

                console.log("Fullscreen button tapped");

                if (this.scale.isFullscreen) {
                    this.scale.stopFullscreen();
                    fullscreenButton.setText("enter fullscreen");
                } else {
                    this.scale.startFullscreen();
                    fullscreenButton.setText("exit fullscreen");
                }
            });
    }

    public update() {
        // Update game objects here every frame

        // Check for input for the player
        this.player.update(
            this.inputController.isLeftPressed(),
            this.inputController.isRightPressed(),
            this.inputController.isJumpPressed(),
        );
    }
}

export default Game;
