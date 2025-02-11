import Phaser from "phaser";
import InputSource from "./input-source";
import { GAME_WIDTH, GAME_HEIGHT } from "../constants";

class OnScreenInput implements InputSource {
    private scene: Phaser.Scene;
    private leftActivePointer: number | null = null; // Tracks active pointer ID for the left button
    private rightActivePointer: number | null = null; // Tracks active pointer ID for the right button
    private jumpActivePointer: number | null = null; // Tracks active pointer ID for the jump button
    private leftPressed: boolean = false; // Stores if the left button is currently pressed
    private rightPressed: boolean = false; // Stores if the right button is currently pressed
    private jumpPressed: boolean = false; // Stores if the jump button is currently pressed

    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        // Enable multi-pointer support (allowing up to 3 simultaneous touches)
        this.scene.input.addPointer(3);

        this.createOnScreenButtons();
    }

    public isLeftPressed(): boolean {
        return this.leftPressed;
    }

    public isRightPressed(): boolean {
        return this.rightPressed;
    }

    public isJumpPressed(): boolean {
        return this.jumpPressed;
    }

    private createOnScreenButtons() {
        const buttonWidth = (1 / 10) * GAME_WIDTH;
        const buttonColor = 0x0000ff;
        const buttonAlpha = 0.5;

        // Define the position of the left button
        const leftButtonX = buttonWidth / 2 + (1 / 64) * GAME_WIDTH;
        const leftButtonY = GAME_HEIGHT - buttonWidth / 2 - (1 / 64) * GAME_WIDTH;

        // Left Button
        const leftButton = new Phaser.GameObjects.Rectangle(
            this.scene,
            leftButtonX,
            leftButtonY,
            buttonWidth,
            buttonWidth,
            buttonColor,
            buttonAlpha,
        )
            .setInteractive({ useHandCursor: true })
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
                if (this.leftActivePointer === null) {
                    this.leftActivePointer = pointer.id;
                    this.leftPressed = true;
                    leftButton.setFillStyle(0xff0000, 0.7);
                }
            });
        this.scene.add.existing(leftButton);

        // Define the position of the right button
        const buttonSeparation = (1 / 64) * GAME_WIDTH;
        const rightButtonX = leftButtonX + buttonWidth + buttonSeparation;
        const rightButtonY = leftButtonY;

        // Right Button
        const rightButton = new Phaser.GameObjects.Rectangle(
            this.scene,
            rightButtonX,
            rightButtonY,
            buttonWidth,
            buttonWidth,
            buttonColor,
            buttonAlpha,
        )
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
                if (this.rightActivePointer === null) {
                    this.rightActivePointer = pointer.id;
                    this.rightPressed = true;
                    rightButton.setFillStyle(0xff0000, 0.7);
                }
            });
        this.scene.add.existing(rightButton);

        // Listen for pointermove events to switch between left and right buttons
        this.scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
            if (this.leftActivePointer === pointer.id) {
                if (rightButton.getBounds().contains(pointer.x, pointer.y)) {
                    // Release left button
                    this.leftActivePointer = null;
                    this.leftPressed = false;
                    leftButton.setFillStyle(0x0000ff, 0.5);

                    // Switch to right button
                    this.rightActivePointer = pointer.id;
                    this.rightPressed = true;
                    rightButton.setFillStyle(0xff0000, 0.7);
                }
            } else if (this.rightActivePointer === pointer.id) {
                if (leftButton.getBounds().contains(pointer.x, pointer.y)) {
                    // Release right button
                    this.rightActivePointer = null;
                    this.rightPressed = false;
                    rightButton.setFillStyle(0x0000ff, 0.5);

                    // Switch to left button
                    this.leftActivePointer = pointer.id;
                    this.leftPressed = true;
                    leftButton.setFillStyle(0xff0000, 0.7);
                }
            }
        });

        // Define the position of the jump button
        const jumpButtonX = GAME_WIDTH - buttonWidth / 2 - (1 / 64) * GAME_WIDTH;
        const jumpButtonY = leftButtonY;

        // Jump Button
        const jumpButton = new Phaser.GameObjects.Rectangle(
            this.scene,
            jumpButtonX,
            jumpButtonY,
            buttonWidth,
            buttonWidth,
            buttonColor,
            buttonAlpha,
        )
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
                if (this.jumpActivePointer === null) {
                    this.jumpActivePointer = pointer.id;
                    this.jumpPressed = true;
                    jumpButton.setFillStyle(0xff0000, 0.7);
                }
            });
        this.scene.add.existing(jumpButton);

        // Listen for pointerup globally to release the correct button if the finger moves off
        this.scene.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
            // log
            console.log("global pointerup");

            if (this.leftActivePointer === pointer.id) {
                this.leftActivePointer = null;
                this.leftPressed = false;
                leftButton.setFillStyle(0x0000ff, 0.5);
            } else if (this.rightActivePointer === pointer.id) {
                this.rightActivePointer = null;
                this.rightPressed = false;
                rightButton.setFillStyle(0x0000ff, 0.5);
            } else if (this.jumpActivePointer === pointer.id) {
                this.jumpActivePointer = null;
                this.jumpPressed = false;
                jumpButton.setFillStyle(0x0000ff, 0.5);
            }
        });
    }
}

export default OnScreenInput;
