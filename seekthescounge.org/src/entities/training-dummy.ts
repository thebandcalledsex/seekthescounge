import Phaser from "phaser";

class TrainingDummy extends Phaser.GameObjects.Rectangle {
    private dummyBody: Phaser.Physics.Arcade.Body;
    private hitsTaken = 0;
    private readonly spawnX: number;
    private readonly spawnY: number;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 18, 28, 0x9c4b00);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.spawnX = x;
        this.spawnY = y;

        this.dummyBody = this.body as Phaser.Physics.Arcade.Body;
        this.dummyBody.setAllowGravity(true);
        this.dummyBody.setImmovable(false);
        this.dummyBody.setSize(this.width, this.height);
        this.dummyBody.setCollideWorldBounds(true);
        this.dummyBody.setVelocity(0, 0);
        this.dummyBody.pushable = false;
        this.dummyBody.setDragX(800);
    }

    public takeDamage(amount: number, _source: Phaser.GameObjects.GameObject) {
        this.hitsTaken += amount;
        this.flash();

        if (this.hitsTaken >= 5) {
            this.resetDummy();
        }
    }

    private flash() {
        this.setFillStyle(0xffc154);
        this.scene.time.delayedCall(80, () => {
            this.setFillStyle(0x9c4b00);
        });
    }

    private resetDummy() {
        this.hitsTaken = 0;
        this.setFillStyle(0x9c4b00);
        this.dummyBody.reset(this.spawnX, this.spawnY);
        this.dummyBody.setVelocity(0, 0);
    }
}

export default TrainingDummy;
