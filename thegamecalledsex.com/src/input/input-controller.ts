import InputSource from "./input-source";
import KeyboardInput from "./keyboard-input";
import OnScreenInput from "./on-screen-input";

class InputController {
    private inputSources: InputSource[] = [];

    constructor(scene: Phaser.Scene) {
        // Register input sources
        this.inputSources.push(new KeyboardInput(scene));
        this.inputSources.push(new OnScreenInput(scene));
    }

    // Check if any input source has the left movement pressed
    public isLeftPressed(): boolean {
        return this.inputSources.some((source) => source.isLeftPressed());
    }

    // Check if any input source has the right movement pressed
    public isRightPressed(): boolean {
        return this.inputSources.some((source) => source.isRightPressed());
    }

    // Check if any input source has jump pressed
    public isJumpPressed(): boolean {
        return this.inputSources.some((source) => source.isJumpPressed());
    }
}

export default InputController;
