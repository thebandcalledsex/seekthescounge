abstract class InputSource {
    public abstract isLeftPressed(): boolean;
    public abstract isRightPressed(): boolean;
    public abstract isJumpPressed(): boolean;
    public abstract isAttackPressed(): boolean;
}

export default InputSource;
