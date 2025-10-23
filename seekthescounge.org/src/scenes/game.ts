import Phaser from "phaser";
import { Rovert, Shuey } from "../entities/player";
import InputController from "../input/input-controller";
import UiScene from "./ui";
import * as constants from "../constants";
import DialogManager from "../ui/dialog";
import OnScreenInput from "../input/on-screen-input";
import TrainingDummy from "../entities/training-dummy";

class Game extends Phaser.Scene {
    private player!: Rovert | Shuey;
    private selectedPlayer: string = "Rovert";
    private inputController!: InputController;
    private dialog!: DialogManager;
    private trainingDummies!: Phaser.Physics.Arcade.Group;

    private hasTouchedGround = false;

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
            "rovert-idle-right",
            "../../assets/rovert/idle/rovert-idle-right.png",
            "../../assets/rovert/idle/rovert-idle-right.json",
        );
        this.load.atlas(
            "rovert-idle-left",
            "../../assets/rovert/idle/rovert-idle-left.png",
            "../../assets/rovert/idle/rovert-idle-left.json",
        );
        this.load.atlas(
            "rovert-running-left",
            "../../assets/rovert/running/rovert-running-left.png",
            "../../assets/rovert/running/rovert-running-left.json",
        );
        this.load.atlas(
            "rovert-running-right",
            "../../assets/rovert/running/rovert-running-right.png",
            "../../assets/rovert/running/rovert-running-right.json",
        );

        this.load.atlas(
            "shuey-idle-right",
            "../../assets/shuey/idle/shuey-idle-right.png",
            "../../assets/shuey/idle/shuey-idle-right.json",
        );
        this.load.atlas(
            "shuey-idle-left",
            "../../assets/shuey/idle/shuey-idle-left.png?v=2",
            "../../assets/shuey/idle/shuey-idle-left.json?v=2",
        );
        this.load.atlas(
            "shuey-running-left",
            "../../assets/shuey/running/shuey-running-left.png",
            "../../assets/shuey/running/shuey-running-left.json",
        );
        this.load.atlas(
            "shuey-running-right",
            "../../assets/shuey/running/shuey-running-right.png",
            "../../assets/shuey/running/shuey-running-right.json",
        );

        // Load the tilemap for level 1 and its tileset
        this.load.tilemapTiledJSON("level1", "../../assets/maps/level1.json");
        this.load.image("desert-tiles", "../../assets/tilesets/desert.png");

        // Load on-screen input button assets
        OnScreenInput.preload(this);
    }

    public create() {
        // Create game objects here
        console.log("Creating game objects...");

        // Create the ground
        const map = this.make.tilemap({ key: "level1" });
        const tileset = map.addTilesetImage("desert-tiles", "desert-tiles");
        if (!tileset) {
            throw new Error("Tileset 'desert-tiles' not found");
        }
        const groundLayer = map.createLayer("Ground", tileset, 0, 0);
        if (groundLayer) {
            groundLayer.setCollisionByProperty({ collides: true });
        } else {
            throw new Error("Ground layer not found");
        }

        console.log("shuey-idle-left", this.textures.get("shuey-idle-left").getFrameNames());
        [
            "shuey-idle-left",
            "shuey-idle-right",
            "shuey-running-left",
            "shuey-running-right",
        ].forEach((k) => {
            if (this.anims.exists(k)) this.anims.remove(k);
        });

        // Register player animations
        if (!this.anims.exists("shuey-idle-right")) {
            this.anims.create({
                key: "shuey-idle-right",
                frames: this.anims.generateFrameNames("shuey-idle-right", {
                    prefix: "shuey-animated #idle right ",
                    start: 0,
                    end: 7,
                    suffix: ".aseprite",
                }),
                frameRate: 8,
                repeat: -1, // Loop the animation
            });
        }
        if (!this.anims.exists("shuey-idle-left")) {
            this.anims.create({
                key: "shuey-idle-left",
                frames: this.anims.generateFrameNames("shuey-idle-left", {
                    prefix: "shuey-animated #idle left ",
                    start: 0,
                    end: 7,
                    suffix: ".aseprite",
                }),
                frameRate: 8,
                repeat: -1, // Loop the animation
            });
        }
        if (!this.anims.exists("shuey-running-right")) {
            this.anims.create({
                key: "shuey-running-right",
                frames: this.anims.generateFrameNames("shuey-running-right", {
                    prefix: "shuey-animated #runner right ",
                    start: 0,
                    end: 7,
                    suffix: ".aseprite",
                }),
                frameRate: 8,
                repeat: -1, // Loop the animation
            });
        }
        if (!this.anims.exists("shuey-running-left")) {
            this.anims.create({
                key: "shuey-running-left",
                frames: this.anims.generateFrameNames("shuey-running-left", {
                    prefix: "shuey-animated #runner left ",
                    start: 0,
                    end: 7,
                    suffix: ".aseprite",
                }),
                frameRate: 8,
                repeat: -1, // Loop the animation
            });
        }

        if (!this.anims.exists("rovert-idle-right")) {
            this.anims.create({
                key: "rovert-idle-right",
                frames: this.anims.generateFrameNames("rovert-idle-right", {
                    prefix: "ROVERT-ANIMATED-STS #idle right no cape ",
                    start: 0,
                    end: 7,
                    suffix: ".aseprite",
                }),
                frameRate: 8,
                repeat: -1, // Loop the animation
            });
        }

        if (!this.anims.exists("rovert-idle-left")) {
            this.anims.create({
                key: "rovert-idle-left",
                frames: this.anims.generateFrameNames("rovert-idle-left", {
                    prefix: "ROVERT-ANIMATED-STS #idle left no cape ",
                    start: 0,
                    end: 7,
                    suffix: ".aseprite",
                }),
                frameRate: 8,
                repeat: -1, // Loop the animation
            });
        }

        if (!this.anims.exists("rovert-running-right")) {
            this.anims.create({
                key: "rovert-running-right",
                frames: this.anims.generateFrameNames("rovert-running-right", {
                    prefix: "ROVERT-ANIMATED-STS #runner right ",
                    start: 0,
                    end: 7,
                    suffix: ".aseprite",
                }),
                frameRate: 8,
                repeat: -1, // Loop the animation
            });
        }

        if (!this.anims.exists("rovert-running-left")) {
            this.anims.create({
                key: "rovert-running-left",
                frames: this.anims.generateFrameNames("rovert-running-left", {
                    prefix: "ROVERT-ANIMATED-STS #runner left skinny ",
                    start: 0,
                    end: 7,
                    suffix: ".aseprite",
                }),
                frameRate: 8,
                repeat: -1, // Loop the animation
            });
        }

        // Establish the player based on the input from the player selection scene
        if (this.selectedPlayer === "Rovert") {
            this.player = new Rovert(this, 100, 100, "rovert-idle-right"); // Create rovert at (100,100)
        } else {
            this.player = new Shuey(this, 100, 100, "shuey-idle-right"); // Create shuey at (100,100)
            this.player.play("shuey-idle-right");
        }

        // Create some training dummies
        this.trainingDummies = this.physics.add.group();
        const dummy = new TrainingDummy(this, this.player.x + 80, this.player.y - 16);
        this.trainingDummies.add(dummy);

        // Set the world bounds
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels); // Adjust world bounds
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        // Create a camera to follow the player
        this.cameras.main.startFollow(
            this.player,
            true,
            constants.CAMERA_FOLLOW_LERP_X,
            constants.CAMERA_FOLLOW_LERP_Y,
            constants.CAMERA_FOLLOW_OFFSET_X,
            constants.CAMERA_FOLLOW_OFFSET_Y,
        );
        //this.cameras.main.setZoom(2); // Zoom in the camera

        // Add collision between entities and ground
        this.physics.add.collider(this.player, groundLayer);
        this.physics.add.collider(this.trainingDummies, groundLayer);

        // Add collision between player and training dummies
        this.physics.add.collider(this.player, this.trainingDummies);

        // Set training dummies as attack targets
        this.player.setAttackTargets(this.trainingDummies);

        // Setup input handling
        this.inputController = new InputController(this);
        if (!this.scene.isActive("ui")) {
            this.scene.launch("ui"); // Start the UI scene
        }

        const ui = this.scene.get("ui") as UiScene;
        if (ui?.uiInput) {
            this.inputController.addInputSource(ui.uiInput);
            this.scene.bringToTop("ui"); // Ensure UI is overlayed on top
        } else {
            // ensure hookup after UiScene.create runs
            ui.events.once(Phaser.Scenes.Events.CREATE, () => {
                this.inputController.addInputSource((ui as UiScene).uiInput);
                this.scene.bringToTop("ui");
            });
        }

        // Create a dialog box
        this.dialog = new DialogManager(this, {
            speed: 1,
            rows: 2,
            useBitmapFontKey: "pixel",
            theme: { fill: 0x0f0f1a, borderOuter: 0xffffff, borderInner: undefined }, // single border
        });
    }

    public update() {
        // Update game objects here every frame

        // Check for input for the player
        this.player.update(
            this.inputController.isLeftPressed(),
            this.inputController.isRightPressed(),
            this.inputController.isJumpPressed(),
            this.inputController.isAttackPressed(),
        );

        // Check if the player has touched the ground
        if (this.player.body && this.player.body.blocked.down && !this.hasTouchedGround) {
            this.hasTouchedGround = true;

            // Trigger dialog when the player touches the ground for the first time
            // this.dialog.say({
            //     text: "Welcome kind traveler! \t\t\t Are you lost, my friend?",
            // });
        }
    }
}

export default Game;
