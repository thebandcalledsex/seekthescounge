import Phaser from "phaser";
import InputSource from "./input-source";

class OnScreenInput implements InputSource {
    private scene: Phaser.Scene;
    private leftPressed: boolean = false;
    private rightPressed: boolean = false;
    private jumpPressed: boolean = false;
    private pointerDown: boolean = false;

    private leftButton!: Phaser.GameObjects.Rectangle;
    private rightButton!: Phaser.GameObjects.Rectangle;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        // Create on-screen buttons
        this.createOnScreenButtons();

        // Add a global listener for pointerup to reset button states
        this.scene.input.on('pointerup', () => {
            // Global pointerup handler to reset buttons when 
            // the pointer is released outside of a button's area.
            this.pointerDown = false;
        });
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
        // General button properties
        const buttonWidth = 40;
        const buttonColor = 0x0000ff;
        const buttonAlpha = 0.5; // Transparency of the button

        // Define the position of the left button
        const leftButtonX = 25;
        const leftButtonY = 150;

        // Create the left button
        const leftButton = new Phaser.GameObjects.Rectangle(
            this.scene,
            leftButtonX,
            leftButtonY,
            buttonWidth,
            buttonWidth,
            buttonColor,
            buttonAlpha,
        )
            .setInteractive()
            .on("pointerdown", () => {
                this.pointerDown = true;
                this.leftPressed = true;
            })
            .on("pointerup", () => {
                this.pointerDown = false;
                this.leftPressed = false;
            })
            .on("pointerout", () => {
                this.leftPressed = false;
            });
        this.scene.add.existing(leftButton);

        // Define the position of the right button
        const rightButtonX = leftButtonX + buttonWidth + 10;
        const rightButtonY = 150;

        // Create the right button
        const rightButton = new Phaser.GameObjects.Rectangle(
            this.scene,
            rightButtonX,
            rightButtonY,
            buttonWidth,
            buttonWidth,
            buttonColor,
            buttonAlpha,
        )
            .setInteractive()
            .on("pointerdown", () => {
                this.pointerDown = true;
                this.rightPressed = true;
            })
            .on("pointerup", () => {
                this.pointerDown = false;
                this.rightPressed = false;
            })
            .on("pointerout", () => {
                this.rightPressed = false;
            });
        this.scene.add.existing(rightButton);

        // Special case: Handling dragging between the left and right buttons
        this.scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
            if (this.pointerDown) {
                // If pointer is over the left button, trigger left press
                if (leftButton.getBounds().contains(pointer.x, pointer.y)) {
                    this.leftPressed = true;
                    this.rightPressed = false; // Ensure right button is released when switching to left button
                }
                // If pointer is over the right button, trigger right press
                else if (rightButton.getBounds().contains(pointer.x, pointer.y)) {
                    this.rightPressed = true;
                    this.leftPressed = false; // Ensure left button is released when switching to right button
                }
            }
        });

        // Define the position of the jump button
        const jumpButtonX = 300;
        const jumpButtonY = 150;

        // Create the jump button
        const jumpButton = new Phaser.GameObjects.Rectangle(
            this.scene,
            jumpButtonX,
            jumpButtonY,
            buttonWidth,
            buttonWidth,
            buttonColor,
            buttonAlpha,
        )
            .setInteractive()
            .on("pointerdown", () => (this.jumpPressed = true))
            .on("pointerup", () => (this.jumpPressed = false));
        this.scene.add.existing(jumpButton);
    }
}

export default OnScreenInput;
