import Phaser from "phaser";
import InputSource from "./input-source";

class OnScreenInput implements InputSource {
    private scene: Phaser.Scene;

    private leftActivePointer: number | null = null;
    private rightActivePointer: number | null = null;
    private jumpActivePointer: number | null = null;

    private leftPressed = false;
    private rightPressed = false;
    private jumpPressed = false;

    // store buttons so we can re-layout
    private leftButton!: Phaser.GameObjects.Rectangle;
    private rightButton!: Phaser.GameObjects.Rectangle;
    private jumpButton!: Phaser.GameObjects.Rectangle;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
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

    /** Re-anchor buttons on current viewport size */
    public layout() {
        const w = this.scene.scale.width;
        const h = this.scene.scale.height;

        const buttonWidth = (1 / 10) * w;
        const pad = (1 / 64) * w;

        const leftX = buttonWidth / 2 + pad;
        const y = h - buttonWidth / 2 - pad;
        const sep = pad;
        const rightX = leftX + buttonWidth + sep;

        const jumpX = w - buttonWidth / 2 - pad;

        this.leftButton.setSize(buttonWidth, buttonWidth).setPosition(leftX, y);
        this.rightButton.setSize(buttonWidth, buttonWidth).setPosition(rightX, y);
        this.jumpButton.setSize(buttonWidth, buttonWidth).setPosition(jumpX, y);
    }

    /** Clear press state (used on sleep/wake) */
    public reset() {
        this.leftActivePointer = this.rightActivePointer = this.jumpActivePointer = null;
        this.leftPressed = this.rightPressed = this.jumpPressed = false;
        if (this.leftButton) this.leftButton.setFillStyle(0x0000ff, 0.5);
        if (this.rightButton) this.rightButton.setFillStyle(0x0000ff, 0.5);
        if (this.jumpButton) this.jumpButton.setFillStyle(0x0000ff, 0.5);
    }

    private createOnScreenButtons() {

        // Define button dimensions and positions relative to screen size
        const w = this.scene.scale.width;
        const h = this.scene.scale.height;
        const buttonWidth = (1 / 10) * w;
        const buttonColor = 0x0000ff;
        const buttonAlpha = 0.5;

        const pad = (1 / 64) * w;
        const leftButtonX = buttonWidth / 2 + pad;
        const leftButtonY = h - buttonWidth / 2 - pad;
        const separation = pad;
        const rightButtonX = leftButtonX + buttonWidth + separation;
        const jumpButtonX = w - buttonWidth / 2 - pad;

        // Left Button
        this.leftButton = this.scene.add
            .rectangle(leftButtonX, leftButtonY, buttonWidth, buttonWidth, buttonColor, buttonAlpha)
            .setDepth(9999)
            .setScrollFactor(0)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
                if (this.leftActivePointer === null) {
                    this.leftActivePointer = pointer.id;
                    this.leftPressed = true;
                    this.leftButton.setFillStyle(0xff0000, 0.7);
                }
            });

        // Right Button
        this.rightButton = this.scene.add
            .rectangle(rightButtonX, leftButtonY, buttonWidth, buttonWidth, buttonColor, buttonAlpha)
            .setDepth(9999)
            .setScrollFactor(0)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
                if (this.rightActivePointer === null) {
                    this.rightActivePointer = pointer.id;
                    this.rightPressed = true;
                    this.rightButton.setFillStyle(0xff0000, 0.7);
                }
            });

        // Jump Button
        this.jumpButton = this.scene.add
            .rectangle(jumpButtonX, leftButtonY, buttonWidth, buttonWidth, buttonColor, buttonAlpha)
            .setDepth(9999)
            .setScrollFactor(0)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
                if (this.jumpActivePointer === null) {
                    this.jumpActivePointer = pointer.id;
                    this.jumpPressed = true;
                    this.jumpButton.setFillStyle(0xff0000, 0.7);
                }
            });

        // pointermove: swap left/right if dragging across
        this.scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
            if (this.leftActivePointer === pointer.id) {
                if (this.rightButton.getBounds().contains(pointer.x, pointer.y)) {
                    // Release left button
                    this.leftActivePointer = null;
                    this.leftPressed = false;
                    this.leftButton.setFillStyle(0x0000ff, 0.5);
                    
                    // Switch to right button
                    this.rightActivePointer = pointer.id;
                    this.rightPressed = true;
                    this.rightButton.setFillStyle(0xff0000, 0.7);
                }
            } else if (this.rightActivePointer === pointer.id) {
                if (this.leftButton.getBounds().contains(pointer.x, pointer.y)) {
                    // Release right button
                    this.rightActivePointer = null;
                    this.rightPressed = false;
                    this.rightButton.setFillStyle(0x0000ff, 0.5);
                    
                    // Switch to left button
                    this.leftActivePointer = pointer.id;
                    this.leftPressed = true;
                    this.leftButton.setFillStyle(0xff0000, 0.7);
                }
            }
        });

        // global pointerup
        this.scene.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
            if (this.leftActivePointer === pointer.id) {
                this.leftActivePointer = null;
                this.leftPressed = false;
                this.leftButton.setFillStyle(0x0000ff, 0.5);
            } else if (this.rightActivePointer === pointer.id) {
                this.rightActivePointer = null;
                this.rightPressed = false;
                this.rightButton.setFillStyle(0x0000ff, 0.5);
            } else if (this.jumpActivePointer === pointer.id) {
                this.jumpActivePointer = null;
                this.jumpPressed = false;
                this.jumpButton.setFillStyle(0x0000ff, 0.5);
            }
        });

        // initial anchor
        this.layout();
    }
}

export default OnScreenInput;
