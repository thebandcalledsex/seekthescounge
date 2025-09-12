import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../constants";

class PlayerSelect extends Phaser.Scene {
    constructor() {
        super({ key: "PlayerSelect" });
    }

    preload() {
        // Load assets

        // Load rovert idle assets
        this.load.atlas(
            "rovert-idle",
            "../../assets/large-rovert/idle.png",
            "../../assets/large-rovert/idle.json",
        );

        // Load rovert idle-right assets
        this.load.atlas(
            "rovert-idle-right",
            "../../assets/large-rovert/idle-right.png",
            "../../assets/large-rovert/idle-right.json",
        );

        // Load shuey idle-right assets
        this.load.atlas(
            "large-shuey-idle-right",
            "../../assets/large-shuey/idle-right.png",
            "../../assets/large-shuey/idle-right.json",
        );
    }

    public create() {
        // Create a title in the center of the screen
        this.add
            .text(GAME_WIDTH / 2, (GAME_HEIGHT * 1) / 8, "choose your player", {
                font: "16px Courier",
                color: "#ffffff",
            })
            .setOrigin(0.5);

        // Define rovert animation
        this.anims.create({
            key: "rovert-idle",
            frames: this.anims.generateFrameNames("rovert-idle", {
                prefix: "ROVERT TGCS #idle ",
                start: 0,
                end: 15,
                suffix: ".aseprite",
            }),
            frameRate: 10,
            repeat: -1,
        });

        // Define shuey animation
        this.anims.create({
            key: "shuey-idle",
            frames: this.anims.generateFrameNames("large-shuey-idle-right", {
                prefix: "SHUEY TGCS #IDLE INSIDE ",
                start: 0,
                end: 7,
                suffix: ".aseprite",
            }),
            frameRate: 10,
            repeat: -1,
        });

        // Create player sprites and play idle animations
        const playerScale = 2;
        const rovert = this.add.sprite(GAME_WIDTH / 3, GAME_HEIGHT / 2, "rovert-idle-right");
        rovert.setScale(playerScale);
        rovert.play("rovert-idle").setInteractive();

        const shuey = this.add.sprite((2 * GAME_WIDTH) / 3, GAME_HEIGHT / 2, "shuey-idle-right");
        shuey.setScale(playerScale);
        shuey.play("shuey-idle").setInteractive();

        rovert.on("pointerdown", () => this.selectPlayer("Rovert"));
        shuey.on("pointerdown", () => this.selectPlayer("Shuey"));

        // Highlight selection on hover
        rovert.on("pointerover", () => rovert.setScale(playerScale * 1.2));
        rovert.on("pointerout", () => rovert.setScale(playerScale));

        shuey.on("pointerover", () => shuey.setScale(playerScale * 1.2));
        shuey.on("pointerout", () => shuey.setScale(playerScale));
    }

    private selectPlayer(player: string) {
        this.scene.start("Game", { selectedPlayer: player });
    }
}

export default PlayerSelect;
