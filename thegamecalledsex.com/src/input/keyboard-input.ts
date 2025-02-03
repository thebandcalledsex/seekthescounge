import Phaser from "phaser";
import InputSource from "./input-source";

class KeyboardInput implements InputSource {
    private cursorKeys!: Phaser.Types.Input.Keyboard.CursorKeys;

    constructor(scene: Phaser.Scene) {
        // Setup keyboard keys
        this.cursorKeys = scene.input.keyboard!.createCursorKeys();
    }

    public isLeftPressed(): boolean {
        return this.cursorKeys.left.isDown;
    }

    public isRightPressed(): boolean {
        return this.cursorKeys.right.isDown;
    }

    public isJumpPressed(): boolean {
        return this.cursorKeys.space!.isDown;
    }
}

export default KeyboardInput;