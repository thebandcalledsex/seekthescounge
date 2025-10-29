import Phaser from "phaser";
import { Rovert, Shuey } from "../entities/player";
import InputController from "../input/input-controller";
import UiScene from "./ui";
import * as constants from "../constants";
import DialogManager from "../ui/dialog";
import OnScreenInput from "../input/on-screen-input";
import TrainingDummy from "../entities/training-dummy";
import Goomba from "../entities/goomba";
import Enemy from "../entities/enemy";

class Game extends Phaser.Scene {
    private player!: Rovert | Shuey;
    private selectedPlayer: string = "Rovert";
    private inputController!: InputController;
    private dialog!: DialogManager;
    private trainingDummies!: Phaser.Physics.Arcade.Group;
    private enemies!: Phaser.Physics.Arcade.Group;

    // One-time action flags
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
            "rovert-idle-attack-right",
            "../../assets/rovert/attacking/rovert-idle-attack-right.png",
            "../../assets/rovert/attacking/rovert-idle-attack-right.json",
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
        this.load.atlas(
            "shuey-idle-attack-right",
            "../../assets/shuey/attacking/shuey-idle-attack-right.png",
            "../../assets/shuey/attacking/shuey-idle-attack-right.json",
        );
        this.load.atlas(
            "shuey-idle-attack-left",
            "../../assets/shuey/attacking/shuey-idle-attack-left.png",
            "../../assets/shuey/attacking/shuey-idle-attack-left.json",
        );
        this.load.atlas(
            "shuey-moving-attack-right",
            "../../assets/shuey/attacking/shuey-moving-attack-right.png",
            "../../assets/shuey/attacking/shuey-moving-attack-right.json",
        );
        this.load.atlas(
            "shuey-moving-attack-left",
            "../../assets/shuey/attacking/shuey-moving-attack-left.png",
            "../../assets/shuey/attacking/shuey-moving-attack-left.json",
        );
        this.load.atlas(
            "shuey-jump-rise-right",
            "../../assets/shuey/jumping/rise/shuey-jump-rise-right.png",
            "../../assets/shuey/jumping/rise/shuey-jump-rise-right.json",
        );
        this.load.atlas(
            "shuey-jump-rise-left",
            "../../assets/shuey/jumping/rise/shuey-jump-rise-left.png",
            "../../assets/shuey/jumping/rise/shuey-jump-rise-left.json",
        );
        this.load.atlas(
            "shuey-jump-fall-right",
            "../../assets/shuey/jumping/fall/shuey-jump-fall-right.png",
            "../../assets/shuey/jumping/fall/shuey-jump-fall-right.json",
        );
        this.load.atlas(
            "shuey-jump-fall-left",
            "../../assets/shuey/jumping/fall/shuey-jump-fall-left.png",
            "../../assets/shuey/jumping/fall/shuey-jump-fall-left.json",
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

        // Initialize the input controller and hook it up to the UI scene

        // Ensure UI scene is running
        if (!this.scene.isActive("ui")) {
            this.scene.launch("ui");
        }

        // Get reference to the live UI scene
        const uiScene = this.scene.get("ui") as UiScene;

        // Now bind input controller to that UI scene
        this.inputController = new InputController(uiScene);

        // Safeguard: in case multiple uiInputs get created (shouldn't happen), only attach once
        const attachedUiInputs = new Set<OnScreenInput>();
        const attachUiInput = (uiInput: OnScreenInput) => {
            if (!uiInput || attachedUiInputs.has(uiInput)) {
                return;
            }
            attachedUiInputs.add(uiInput);
            this.inputController.addInputSource(uiInput);
            this.scene.bringToTop("ui"); // Ensure UI is overlayed on top
        };

        // Once the UI is ready, attach it as an input source to the input controller
        uiScene.events.on("ui-ready", attachUiInput);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            uiScene.events.off("ui-ready", attachUiInput);
            attachedUiInputs.clear();
        });

        if (uiScene?.uiInput) {
            attachUiInput(uiScene.uiInput);
        }

        console.log("shuey-idle-left", this.textures.get("shuey-idle-left").getFrameNames());
        [
            "shuey-idle-left",
            "shuey-idle-right",
            "shuey-running-left",
            "shuey-running-right",
            "shuey-idle-attack-left",
            "shuey-idle-attack-right",
            "shuey-moving-attack-left",
            "shuey-moving-attack-right",
            "shuey-jump-rise-left",
            "shuey-jump-rise-right",
            "shuey-jump-fall-left",
            "shuey-jump-fall-right",
        ].forEach((k) => {
            if (this.anims.exists(k)) this.anims.remove(k);
        });

        // Register player animations
        if (!this.anims.exists("shuey-idle-right")) {
            this.anims.create({
                key: "shuey-idle-right",
                frames: this.anims.generateFrameNames("shuey-idle-right", {
                    prefix: "shuey-idle-right-",
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
                    prefix: "shuey-idle-left-",
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
                    prefix: "shuey-running-right-",
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
                    prefix: "shuey-running-left-",
                    start: 0,
                    end: 7,
                    suffix: ".aseprite",
                }),
                frameRate: 8,
                repeat: -1, // Loop the animation
            });
        }
        if (!this.anims.exists("shuey-idle-attack-right")) {
            this.anims.create({
                key: "shuey-idle-attack-right",
                frames: this.anims.generateFrameNames("shuey-idle-attack-right", {
                    prefix: "shuey-idle-attack-right-",
                    start: 0,
                    end: 4,
                    suffix: ".aseprite",
                }),
                frameRate: 12,
                repeat: 0, // Play once
            });
        }
        if (!this.anims.exists("shuey-idle-attack-left")) {
            this.anims.create({
                key: "shuey-idle-attack-left",
                frames: this.anims.generateFrameNames("shuey-idle-attack-left", {
                    prefix: "shuey-idle-attack-left-",
                    start: 0,
                    end: 4,
                    suffix: ".aseprite",
                }),
                frameRate: 12,
                repeat: 0,
            });
        }
        if (!this.anims.exists("shuey-moving-attack-right")) {
            this.anims.create({
                key: "shuey-moving-attack-right",
                frames: this.anims.generateFrameNames("shuey-moving-attack-right", {
                    prefix: "shuey-moving-attack-right-",
                    start: 0,
                    end: 4,
                    suffix: ".aseprite",
                }),
                frameRate: 12,
                repeat: 0,
            });
        }
        if (!this.anims.exists("shuey-moving-attack-left")) {
            this.anims.create({
                key: "shuey-moving-attack-left",
                frames: this.anims.generateFrameNames("shuey-moving-attack-left", {
                    prefix: "shuey-moving-attack-left-",
                    start: 0,
                    end: 4,
                    suffix: ".aseprite",
                }),
                frameRate: 12,
                repeat: 0,
            });
        }
        if (!this.anims.exists("shuey-jump-rise-right")) {
            this.anims.create({
                key: "shuey-jump-rise-right",
                frames: this.anims.generateFrameNames("shuey-jump-rise-right", {
                    prefix: "shuey-jump-rise-right-",
                    start: 0,
                    end: 3,
                    suffix: ".aseprite",
                }),
                frameRate: 10,
                repeat: 0,
            });
        }
        if (!this.anims.exists("shuey-jump-rise-left")) {
            this.anims.create({
                key: "shuey-jump-rise-left",
                frames: this.anims.generateFrameNames("shuey-jump-rise-left", {
                    prefix: "shuey-jump-rise-left-",
                    start: 0,
                    end: 3,
                    suffix: ".aseprite",
                }),
                frameRate: 10,
                repeat: 0,
            });
        }
        if (!this.anims.exists("shuey-jump-fall-right")) {
            this.anims.create({
                key: "shuey-jump-fall-right",
                frames: this.anims.generateFrameNames("shuey-jump-fall-right", {
                    prefix: "shuey-jump-fall-right-",
                    start: 0,
                    end: 3,
                    suffix: ".aseprite",
                }),
                frameRate: 10,
                repeat: -1,
            });
        }
        if (!this.anims.exists("shuey-jump-fall-left")) {
            this.anims.create({
                key: "shuey-jump-fall-left",
                frames: this.anims.generateFrameNames("shuey-jump-fall-left", {
                    prefix: "shuey-jump-fall-left-",
                    start: 0,
                    end: 3,
                    suffix: ".aseprite",
                }),
                frameRate: 10,
                repeat: -1,
            });
        }

        if (!this.anims.exists("rovert-idle-right")) {
            this.anims.create({
                key: "rovert-idle-right",
                frames: this.anims.generateFrameNames("rovert-idle-right", {
                    prefix: "rovert-idle-right-",
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
                    prefix: "rovert-idle-left-",
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
                    prefix: "rovert-running-right-",
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
                    prefix: "rovert-running-left-",
                    start: 0,
                    end: 7,
                    suffix: ".aseprite",
                }),
                frameRate: 8,
                repeat: -1, // Loop the animation
            });
        }
        if (!this.anims.exists("rovert-idle-attack-right")) {
            this.anims.create({
                key: "rovert-idle-attack-right",
                frames: this.anims.generateFrameNames("rovert-idle-attack-right", {
                    prefix: "rovert-idle-attack-right-",
                    start: 0,
                    end: 5,
                    suffix: ".aseprite",
                }),
                frameRate: 12,
                repeat: 0,
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
        const dummy = new TrainingDummy(this, this.player.x - 40, this.player.y - 16);
        this.trainingDummies.add(dummy);

        // Create some enemies
        this.enemies = this.physics.add.group();
        const goomba = new Goomba(this, this.player.x + 150, this.player.y - 16);
        this.enemies.add(goomba);

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
        this.physics.add.collider(this.enemies, groundLayer);

        // Add collision between player and training dummies
        this.physics.add.collider(this.player, this.trainingDummies);
        this.physics.add.collider(
            this.player,
            this.enemies,
            (_playerObj, enemyObj) => {
                const enemy = enemyObj as Enemy;
                enemy.tryDamage(this.player);
            },
            undefined,
            this,
        );
        this.physics.add.collider(this.enemies, this.trainingDummies);
        this.physics.add.collider(this.enemies, this.enemies);

        // No overlap handler needed; collision callback handles damage.

        // Set training dummies and enemies as attack targets (non-friendly entities)
        this.player.setAttackTargets([this.trainingDummies, this.enemies]);

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
