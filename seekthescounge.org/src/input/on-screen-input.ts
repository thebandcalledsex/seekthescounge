import Phaser from "phaser";
import InputSource from "./input-source";
import { GAME_HEIGHT } from "../constants";

class OnScreenInput implements InputSource {
    private scene: Phaser.Scene;

    // track active pointers for each button
    private leftActivePointer: number | null = null;
    private rightActivePointer: number | null = null;
    private jumpActivePointer: number | null = null;
    private attackActivePointer: number | null = null;

    // current button state pressed/not pressed
    private leftPressed = false;
    private rightPressed = false;
    private jumpPressed = false;
    private attackPressed = false;

    // button dimensions, location, and transparency
    private buttonWidth: number = 32;
    private buttonTransparencyLevel: number = 0.85;

    // store buttons so we can re-layout
    private leftButton!: Phaser.GameObjects.Image;
    private rightButton!: Phaser.GameObjects.Image;
    private jumpButton!: Phaser.GameObjects.Image;
    private attackButton!: Phaser.GameObjects.Image;
    private controlsVisible = true;
    private toggleControlsKey?: Phaser.Input.Keyboard.Key;
    private physicsDebugKey?: Phaser.Input.Keyboard.Key;
    private onTogglePhysicsDebug?: () => void;
    private handleToggleControlsKeyDown = () => this.toggleControlsVisibility();
    private handlePhysicsDebugKeyDown = () => this.onTogglePhysicsDebug?.();

    private getPad(): number {
        return (1 / 64) * this.scene.scale.width;
    }

    static preload(scene: Phaser.Scene) {
        // Load button assets
        scene.load.image("left-button-pressed", "../../assets/ui/left-button-pressed.png");
        scene.load.image("left-button-idle", "../../assets/ui/left-button-idle.png");
        scene.load.image("right-button-pressed", "../../assets/ui/right-button-pressed.png");
        scene.load.image("right-button-idle", "../../assets/ui/right-button-idle.png");
        scene.load.image("jump-button-pressed", "../../assets/ui/jump-button-pressed.png");
        scene.load.image("jump-button-idle", "../../assets/ui/jump-button-idle.png");
        scene.load.image("attack-button-pressed", "../../assets/ui/attack-button-pressed.png");
        scene.load.image("attack-button-idle", "../../assets/ui/attack-button-idle.png");
    }

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.scene.input.addPointer(3);
        this.createOnScreenButtons();
        this.registerKeyboardShortcuts();
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
    public isAttackPressed(): boolean {
        return this.attackPressed;
    }

    // Re-anchor buttons on current viewport size
    public layout() {
        const pad = this.getPad();
        const leftX = this.buttonWidth / 2 + pad;
        const y = this.scene.scale.height - this.buttonWidth / 2 - pad;
        const sep = pad;
        const rightX = leftX + this.buttonWidth + sep;

        const jumpX = this.scene.scale.width - this.buttonWidth / 2 - pad;

        this.leftButton.setSize(this.buttonWidth, this.buttonWidth).setPosition(leftX, y);
        this.rightButton.setSize(this.buttonWidth, this.buttonWidth).setPosition(rightX, y);
        this.jumpButton.setSize(this.buttonWidth, this.buttonWidth).setPosition(jumpX, y);
        this.attackButton
            .setSize(this.buttonWidth, this.buttonWidth)
            .setPosition(jumpX - this.buttonWidth - pad, y);
    }

    // Clear pressed button state
    public reset() {
        this.leftActivePointer =
            this.rightActivePointer =
            this.jumpActivePointer =
            this.attackActivePointer =
                null;
        this.leftPressed = this.rightPressed = this.jumpPressed = this.attackPressed = false;
        if (this.leftButton) this.leftButton.setTexture("left-button-idle");
        if (this.rightButton) this.rightButton.setTexture("right-button-idle");
        if (this.jumpButton) this.jumpButton.setTexture("jump-button-idle");
        if (this.attackButton) this.attackButton.setTexture("attack-button-idle");
    }

    private createOnScreenButtons() {
        const pad = this.getPad();
        // Define button dimensions and positions relative to screen size
        const w = this.scene.scale.width;
        const h = this.scene.scale.height;
        // const buttonWidth = (1 / 10) * w;

        //const pad = (1 / 64) * w;
        const leftButtonX = this.buttonWidth / 2 + pad;
        const leftButtonY = h - this.buttonWidth / 2 - pad;
        const separation = pad;
        const rightButtonX = leftButtonX + this.buttonWidth + separation;
        const jumpButtonX = w - this.buttonWidth / 2 - pad;
        const attackButtonX = jumpButtonX - this.buttonWidth - pad;

        // Left Button
        this.leftButton = this.scene.add
            .image(leftButtonX, leftButtonY, "left-button-idle")
            .setDepth(9999)
            .setScrollFactor(0)
            .setAlpha(this.buttonTransparencyLevel)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
                if (this.leftActivePointer === null) {
                    this.leftActivePointer = pointer.id;
                    this.leftPressed = true;
                    this.leftButton.setTexture("left-button-pressed");
                }
            });

        // Right Button
        this.rightButton = this.scene.add
            .image(rightButtonX, leftButtonY, "right-button-idle")
            .setDepth(9999)
            .setScrollFactor(0)
            .setAlpha(this.buttonTransparencyLevel)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
                if (this.rightActivePointer === null) {
                    this.rightActivePointer = pointer.id;
                    this.rightPressed = true;
                    this.rightButton.setTexture("right-button-pressed");
                }
            });

        // Jump Button
        this.jumpButton = this.scene.add
            .image(jumpButtonX, leftButtonY, "jump-button-idle")
            .setDepth(9999)
            .setScrollFactor(0)
            .setAlpha(this.buttonTransparencyLevel)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
                if (this.jumpActivePointer === null) {
                    this.jumpActivePointer = pointer.id;
                    this.jumpPressed = true;
                    this.jumpButton.setTexture("jump-button-pressed");
                }
            });

        // Attack Button
        this.attackButton = this.scene.add
            .image(attackButtonX, leftButtonY, "attack-button-idle")
            .setDepth(9999)
            .setScrollFactor(0)
            .setAlpha(this.buttonTransparencyLevel)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
                if (this.attackActivePointer === null) {
                    this.attackActivePointer = pointer.id;
                    this.attackPressed = true;
                    this.attackButton.setTexture("attack-button-pressed");
                }
            });

        // Allow us to switch between the left right buttons wihout lifting a finger off
        this.scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
            if (this.leftActivePointer === pointer.id) {
                if (this.rightButton.getBounds().contains(pointer.x, pointer.y)) {
                    // Release left button
                    this.leftActivePointer = null;
                    this.leftPressed = false;
                    this.leftButton.setTexture("left-button-idle");

                    // Switch to right button
                    this.rightActivePointer = pointer.id;
                    this.rightPressed = true;
                    this.rightButton.setTexture("right-button-pressed");
                }
            } else if (this.rightActivePointer === pointer.id) {
                if (this.leftButton.getBounds().contains(pointer.x, pointer.y)) {
                    // Release right button
                    this.rightActivePointer = null;
                    this.rightPressed = false;
                    this.rightButton.setTexture("right-button-idle");

                    // Switch to left button
                    this.leftActivePointer = pointer.id;
                    this.leftPressed = true;
                    this.leftButton.setTexture("left-button-pressed");
                }
            }
        });

        // global pointerup
        this.scene.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
            if (this.leftActivePointer === pointer.id) {
                this.leftActivePointer = null;
                this.leftPressed = false;
                this.leftButton.setTexture("left-button-idle");
            } else if (this.rightActivePointer === pointer.id) {
                this.rightActivePointer = null;
                this.rightPressed = false;
                this.rightButton.setTexture("right-button-idle");
            } else if (this.jumpActivePointer === pointer.id) {
                this.jumpActivePointer = null;
                this.jumpPressed = false;
                this.jumpButton.setTexture("jump-button-idle");
            } else if (this.attackActivePointer === pointer.id) {
                this.attackActivePointer = null;
                this.attackPressed = false;
                this.attackButton.setTexture("attack-button-idle");
            }
        });

        // initial anchor
        this.layout();
        this.updateControlsVisibility();
    }

    public setControlsVisible(visible: boolean) {
        if (this.controlsVisible === visible) {
            return;
        }
        if (!visible) {
            this.reset();
        }
        this.controlsVisible = visible;
        this.updateControlsVisibility();
    }

    public toggleControlsVisibility() {
        this.setControlsVisible(!this.controlsVisible);
    }

    public areControlsVisible() {
        return this.controlsVisible;
    }

    private updateControlsVisibility() {
        const buttons = [this.leftButton, this.rightButton, this.jumpButton, this.attackButton];
        for (const button of buttons) {
            if (!button) {
                continue;
            }
            if (this.controlsVisible) {
                button.setVisible(true).setAlpha(this.buttonTransparencyLevel);
                if (!button.input?.enabled) {
                    button.setInteractive({ useHandCursor: true });
                }
            } else {
                button.setVisible(false);
                if (button.input?.enabled) {
                    button.disableInteractive();
                }
            }
        }
    }

    public setPhysicsDebugToggle(handler: () => void) {
        this.onTogglePhysicsDebug = handler;
    }

    private registerKeyboardShortcuts() {
        const keyboard = this.scene.input.keyboard;
        if (!keyboard) {
            return;
        }

        this.toggleControlsKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);
        this.toggleControlsKey.on("down", this.handleToggleControlsKeyDown);

        this.physicsDebugKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
        this.physicsDebugKey.on("down", this.handlePhysicsDebugKeyDown);

        this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            if (this.toggleControlsKey) {
                this.toggleControlsKey.off("down", this.handleToggleControlsKeyDown);
                this.toggleControlsKey.destroy();
                this.toggleControlsKey = undefined;
            }

            if (this.physicsDebugKey) {
                this.physicsDebugKey.off("down", this.handlePhysicsDebugKeyDown);
                this.physicsDebugKey.destroy();
                this.physicsDebugKey = undefined;
            }
        });
    }
}

export default OnScreenInput;
