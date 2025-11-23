import Phaser from "phaser";
import { Rovert, Shuey } from "../entities/player";
import InputController from "../input/input-controller";
import UiScene from "./ui";
import * as constants from "../constants";
import DialogManager from "../ui/dialog";
import OnScreenInput from "../input/on-screen-input";
import TrainingDummy from "../entities/training-dummy";
import Enemy from "../entities/enemy";
import Pozzum from "../entities/pozzum";
import Chaser from "../entities/chaser";

const IMAGE_LAYER_BASE_DEPTH = -50;
const { ENTITY_ASSETS_PATH } = constants;

class Game extends Phaser.Scene {
    private player!: Rovert | Shuey;
    private selectedPlayer: string = "Rovert";
    private inputController!: InputController;
    private dialog!: DialogManager;
    private trainingDummies!: Phaser.Physics.Arcade.Group;
    private enemies!: Phaser.Physics.Arcade.Group;
    public map!: Phaser.Tilemaps.Tilemap;
    public groundLayer!: Phaser.Tilemaps.TilemapLayer;

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

        // load background layers
        this.load.image("close-hills", "../../assets/backgrounds/close-hills.png");
        this.load.image("far-hills", "../../assets/backgrounds/far-hills.png");
        this.load.image("mountains", "../../assets/backgrounds/mountains.png");
        this.load.image("sky", "../../assets/backgrounds/sky.png");

        this.load.atlas(
            "rovert-idle-right",
            `${ENTITY_ASSETS_PATH}/rovert/idle/rovert-idle-right.png`,
            `${ENTITY_ASSETS_PATH}/rovert/idle/rovert-idle-right.json`,
        );
        this.load.atlas(
            "rovert-idle-left",
            `${ENTITY_ASSETS_PATH}/rovert/idle/rovert-idle-left.png`,
            `${ENTITY_ASSETS_PATH}/rovert/idle/rovert-idle-left.json`,
        );
        this.load.atlas(
            "rovert-running-left",
            `${ENTITY_ASSETS_PATH}/rovert/running/rovert-running-left.png`,
            `${ENTITY_ASSETS_PATH}/rovert/running/rovert-running-left.json`,
        );
        this.load.atlas(
            "rovert-running-right",
            `${ENTITY_ASSETS_PATH}/rovert/running/rovert-running-right.png`,
            `${ENTITY_ASSETS_PATH}/rovert/running/rovert-running-right.json`,
        );
        this.load.atlas(
            "rovert-idle-attack-right",
            `${ENTITY_ASSETS_PATH}/rovert/attacking/rovert-idle-attack-right.png`,
            `${ENTITY_ASSETS_PATH}/rovert/attacking/rovert-idle-attack-right.json`,
        );

        this.load.atlas(
            "shuey-idle-right",
            `${ENTITY_ASSETS_PATH}/shuey/idle/shuey-idle-right.png`,
            `${ENTITY_ASSETS_PATH}/shuey/idle/shuey-idle-right.json`,
        );
        this.load.atlas(
            "shuey-idle-left",
            `${ENTITY_ASSETS_PATH}/shuey/idle/shuey-idle-left.png?v=2`,
            `${ENTITY_ASSETS_PATH}/shuey/idle/shuey-idle-left.json?v=2`,
        );
        this.load.atlas(
            "shuey-running-left",
            `${ENTITY_ASSETS_PATH}/shuey/running/shuey-running-left.png`,
            `${ENTITY_ASSETS_PATH}/shuey/running/shuey-running-left.json`,
        );
        this.load.atlas(
            "shuey-running-right",
            `${ENTITY_ASSETS_PATH}/shuey/running/shuey-running-right.png`,
            `${ENTITY_ASSETS_PATH}/shuey/running/shuey-running-right.json`,
        );
        this.load.atlas(
            "shuey-idle-attack-right",
            `${ENTITY_ASSETS_PATH}/shuey/attacking/shuey-idle-attack-right.png`,
            `${ENTITY_ASSETS_PATH}/shuey/attacking/shuey-idle-attack-right.json`,
        );
        this.load.atlas(
            "shuey-idle-attack-left",
            `${ENTITY_ASSETS_PATH}/shuey/attacking/shuey-idle-attack-left.png`,
            `${ENTITY_ASSETS_PATH}/shuey/attacking/shuey-idle-attack-left.json`,
        );
        this.load.atlas(
            "shuey-moving-attack-right",
            `${ENTITY_ASSETS_PATH}/shuey/attacking/shuey-moving-attack-right.png`,
            `${ENTITY_ASSETS_PATH}/shuey/attacking/shuey-moving-attack-right.json`,
        );
        this.load.atlas(
            "shuey-moving-attack-left",
            `${ENTITY_ASSETS_PATH}/shuey/attacking/shuey-moving-attack-left.png`,
            `${ENTITY_ASSETS_PATH}/shuey/attacking/shuey-moving-attack-left.json`,
        );
        this.load.atlas(
            "shuey-jump-rise-right",
            `${ENTITY_ASSETS_PATH}/shuey/jumping/rise/shuey-jump-rise-right.png`,
            `${ENTITY_ASSETS_PATH}/shuey/jumping/rise/shuey-jump-rise-right.json`,
        );
        this.load.atlas(
            "shuey-jump-rise-left",
            `${ENTITY_ASSETS_PATH}/shuey/jumping/rise/shuey-jump-rise-left.png`,
            `${ENTITY_ASSETS_PATH}/shuey/jumping/rise/shuey-jump-rise-left.json`,
        );
        this.load.atlas(
            "shuey-jump-fall-right",
            `${ENTITY_ASSETS_PATH}/shuey/jumping/fall/shuey-jump-fall-right.png`,
            `${ENTITY_ASSETS_PATH}/shuey/jumping/fall/shuey-jump-fall-right.json`,
        );
        this.load.atlas(
            "shuey-jump-fall-left",
            `${ENTITY_ASSETS_PATH}/shuey/jumping/fall/shuey-jump-fall-left.png`,
            `${ENTITY_ASSETS_PATH}/shuey/jumping/fall/shuey-jump-fall-left.json`,
        );
        this.load.atlas(
            "shuey-wall-slide-left",
            `${ENTITY_ASSETS_PATH}/shuey/wall-slide/shuey-wall-slide-left.png`,
            `${ENTITY_ASSETS_PATH}/shuey/wall-slide/shuey-wall-slide-left.json`,
        );
        this.load.atlas(
            "shuey-wall-slide-right",
            `${ENTITY_ASSETS_PATH}/shuey/wall-slide/shuey-wall-slide-right.png`,
            `${ENTITY_ASSETS_PATH}/shuey/wall-slide/shuey-wall-slide-right.json`,
        );
        this.load.atlas(
            "shuey-death",
            `${ENTITY_ASSETS_PATH}/shuey/death/shuey-death.png`,
            `${ENTITY_ASSETS_PATH}/shuey/death/shuey-death.json`,
        );

        this.load.atlas(
            "pozzum-cruzing-left",
            `${ENTITY_ASSETS_PATH}/pozzum/pozzum-cruzing-left.png`,
            `${ENTITY_ASSETS_PATH}/pozzum/pozzum-cruzing-left.json`,
        );
        this.load.atlas(
            "pozzum-cruzing-right",
            `${ENTITY_ASSETS_PATH}/pozzum/pozzum-cruzing-right.png`,
            `${ENTITY_ASSETS_PATH}/pozzum/pozzum-cruzing-right.json`,
        );

        // Load the tilemap for level 1 and its tileset
        //this.load.tilemapTiledJSON("level1", "../../assets/maps/level1.json");
        this.load.image("desert-tiles", "../../assets/tilesets/desert.png");

        // Load the tilemap for 1-1
        this.load.tilemapTiledJSON("level1", "../../assets/maps/1-1.json");

        // Load level1's complete JSON data (for image layers)
        //this.load.json("level1-data", "../../assets/maps/level1.json");
        this.load.json("level1-data", "../../assets/maps/1-1.json");

        // Load on-screen input button assets
        OnScreenInput.preload(this);
    }

    public create() {
        // Create game objects here
        console.log("Creating game objects...");

        const map = this.make.tilemap({ key: "level1" });
        this.map = map;
        // Create the ground layer
        const tileset = map.addTilesetImage("desert-tiles", "desert-tiles");
        if (!tileset) {
            throw new Error("Tileset 'desert-tiles' not found");
        }
        const groundLayer = map.createLayer("Ground", tileset, 0, 0);
        if (groundLayer) {
            groundLayer.setCollisionByProperty({ collides: true });
            groundLayer.setCollisionByProperty({ kills: true });
        } else {
            throw new Error("Ground layer not found");
        }
        this.groundLayer = groundLayer;
        this.data.set("map", map);
        this.data.set("groundLayer", groundLayer);

        // Render background image layers
        this.renderBackgroundImageLayers(map);

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
            "shuey-wall-slide-left",
            "shuey-wall-slide-right",
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
        if (!this.anims.exists("shuey-wall-slide-right")) {
            this.anims.create({
                key: "shuey-wall-slide-right",
                frames: this.anims.generateFrameNames("shuey-wall-slide-right", {
                    prefix: "shuey-wall-slide-right-",
                    start: 0,
                    end: 3,
                    suffix: ".aseprite",
                }),
                frameRate: 10,
                repeat: -1,
            });
        }
        if (!this.anims.exists("shuey-wall-slide-left")) {
            this.anims.create({
                key: "shuey-wall-slide-left",
                frames: this.anims.generateFrameNames("shuey-wall-slide-left", {
                    prefix: "shuey-wall-slide-left-",
                    start: 0,
                    end: 3,
                    suffix: ".aseprite",
                }),
                frameRate: 10,
                repeat: -1,
            });
        }
        if (!this.anims.exists("shuey-death")) {
            this.anims.create({
                key: "shuey-death",
                frames: this.anims.generateFrameNames("shuey-death", {
                    prefix: "shuey-death-",
                    start: 0,
                    end: 15,
                    suffix: ".aseprite",
                }),
                frameRate: 10,
                repeat: 0, // Play once
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

        // Register pozzum animations
        if (!this.anims.exists("pozzum-cruzing-right")) {
            this.anims.create({
                key: "pozzum-cruzing-right",
                frames: this.anims.generateFrameNames("pozzum-cruzing-right", {
                    prefix: "pozzum-cruzing-right-",
                    start: 0,
                    end: 7,
                    suffix: ".aseprite",
                }),
                frameRate: 10,
                repeat: -1,
            });
        }

        if (!this.anims.exists("pozzum-cruzing-left")) {
            this.anims.create({
                key: "pozzum-cruzing-left",
                frames: this.anims.generateFrameNames("pozzum-cruzing-left", {
                    prefix: "pozzum-cruzing-left-",
                    start: 0,
                    end: 7,
                    suffix: ".aseprite",
                }),
                frameRate: 10,
                repeat: -1,
            });
        }

        const spawnX = 10;
        const spawnY = 180;

        // Establish the player based on the input from the player selection scene
        if (this.selectedPlayer === "Rovert") {
            this.player = new Rovert(this, spawnX, spawnY, "rovert-idle-right"); // Create rovert at (100,100)
        } else {
            this.player = new Shuey(this, spawnX, spawnY, "shuey-idle-right"); // Create shuey at (100,100)
            this.player.play("shuey-idle-right");
        }

        // Create some training dummies
        this.trainingDummies = this.physics.add.group();
        //const dummy1 = new TrainingDummy(this, this.player.x - 40, this.player.y - 16);
        //const dummy2 = new TrainingDummy(this, this.player.x + 220, this.player.y - 16);
        //this.trainingDummies.add(dummy1);
        //this.trainingDummies.add(dummy2);

        // Create some enemies
        this.enemies = this.physics.add.group();
        const chaser = new Chaser(this, this.player.x + 140, this.player.y, this.player);
        const pozzum = new Pozzum(this, this.player.x + 250, this.player.y);
        const pozzum2 = new Pozzum(this, this.player.x - 100, this.player.y);
        const pozzum3 = new Pozzum(this, this.player.x - 250, this.player.y);
        this.enemies.add(chaser);
        this.enemies.add(pozzum);
        this.enemies.add(pozzum2);
        this.enemies.add(pozzum3);

        // Set the world bounds
        this.cameras.main.setBounds(
            0,
            0,
            map.widthInPixels,
            map.heightInPixels - constants.CAMERA_STOP_Y,
        );
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
        this.physics.add.collider(this.player, groundLayer, (_playerObj, tileObj) => {
            this.handlePlayerGroundCollision(tileObj as unknown as Phaser.Tilemaps.Tile);
        });
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

    private handlePlayerGroundCollision(tile: Phaser.Tilemaps.Tile) {
        if (!tile) {
            return;
        }
        const tileProps = tile.properties as Record<string, unknown> | undefined;
        if (tileProps?.kills === true) {
            this.killPlayerFromTile(tile);
        }
    }

    private killPlayerFromTile(tile: Phaser.Tilemaps.Tile) {
        if (!this.player?.active) {
            return;
        }
        const source = tile.tilemapLayer ?? this.groundLayer;
        this.player.takeDamage(1, source);
    }

    private renderBackgroundImageLayers(map: Phaser.Tilemaps.Tilemap) {
        const mapData = this.cache.json.get("level1-data");
        if (!mapData?.layers) {
            return;
        }

        let imageLayerIndex = 0;
        mapData.layers.forEach((layer: any) => {
            if (layer.type !== "imagelayer") {
                return;
            }
            this.renderImageLayer(map, layer, imageLayerIndex);
            imageLayerIndex += 1;
        });
    }

    private renderImageLayer(map: Phaser.Tilemaps.Tilemap, layer: any, depthIndex: number) {
        const textureKey = this.resolveImageLayerTextureKey(layer);
        if (!textureKey) {
            console.warn(`Missing texture for image layer '${layer?.name ?? "unknown"}'.`);
            return;
        }

        const texture = this.textures.get(textureKey);
        const sourceDimensions = texture.getSourceImage() as { width: number };
        const imageWidth = layer.imagewidth ?? sourceDimensions?.width ?? 0;
        if (!imageWidth) {
            console.warn(
                `Unable to determine width for image layer '${layer?.name ?? "unknown"}'.`,
            );
            return;
        }

        const offsetX = layer.offsetx ?? 0;
        const offsetY = layer.offsety ?? 0;
        const x = (layer.x ?? 0) + offsetX;
        const y = (layer.y ?? 0) + offsetY;
        const depth = this.getLayerDepth(layer, depthIndex);
        const shouldRepeatX = Boolean(layer.repeatx);
        const scrollFactorX = this.getLayerScrollFactor(layer, "x");
        const scrollFactorY = this.getLayerScrollFactor(layer, "y");

        const drawAt = (drawX: number) => {
            this.add
                .image(drawX, y, textureKey)
                .setOrigin(0, 0)
                .setDepth(depth)
                .setScrollFactor(scrollFactorX, scrollFactorY);
        };

        if (shouldRepeatX) {
            const coverageWidth = Math.max(map.widthInPixels, this.cameras.main.width);
            for (let drawX = x; drawX < x + coverageWidth + imageWidth; drawX += imageWidth) {
                drawAt(drawX);
            }
        } else {
            drawAt(x);
        }
    }

    private resolveImageLayerTextureKey(layer: any): string | null {
        if (!layer) {
            return null;
        }
        const normalizedPath = (layer.image ?? "").replace(/\\/g, "/");
        const fileName = normalizedPath.split("/").pop();
        const imageKey = fileName ? fileName.replace(/\.[^/.]+$/, "") : null;
        const candidates = [imageKey, layer.name, layer.name?.toLowerCase()].filter(
            (key): key is string => Boolean(key),
        );
        return candidates.find((key) => this.textures.exists(key)) ?? null;
    }

    private getLayerDepth(layer: any, depthIndex: number) {
        return this.getNumericLayerProperty(layer, "depth") ?? IMAGE_LAYER_BASE_DEPTH + depthIndex;
    }

    private getLayerScrollFactor(layer: any, axis: "x" | "y") {
        const parallaxValue = axis === "x" ? layer.parallaxx : layer.parallaxy;
        return typeof parallaxValue === "number" ? parallaxValue : 1;
    }

    private getNumericLayerProperty(layer: any, propertyName: string): number | undefined {
        const property = layer?.properties?.find?.((prop: any) => prop?.name === propertyName);
        if (property && typeof property.value === "number") {
            return property.value;
        }
        return undefined;
    }
}

export default Game;
