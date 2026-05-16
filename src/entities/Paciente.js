export class Paciente extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y) {
        super(scene, x, y, 120, 180, 0x224488);
        scene.add.existing(this); // Lo mete a la pantalla

        this.scene = scene;
        this.hp = 150;
        this.maxHp = 150;
        this.superMeter = 0;
        this.baseY = y;
        this.state = "NEUTRAL";
        this.lastDodgeDirection = "NINGUNA";

        // Configuración de sus propios controles
        this.keys = scene.input.keyboard.addKeys({
            left: Phaser.Input.Keyboard.KeyCodes.LEFT,
            right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            up: Phaser.Input.Keyboard.KeyCodes.UP,
            down: Phaser.Input.Keyboard.KeyCodes.DOWN,
            punchLH: Phaser.Input.Keyboard.KeyCodes.A,
            punchRH: Phaser.Input.Keyboard.KeyCodes.S,
            punchLL: Phaser.Input.Keyboard.KeyCodes.Z,
            punchRL: Phaser.Input.Keyboard.KeyCodes.X,
            superKey: Phaser.Input.Keyboard.KeyCodes.SPACE
        });
    }

    update() {
        if (this.state === "NEUTRAL") {
            if (this.keys.left.isDown) this.executeDodge("IZQUIERDA");
            else if (this.keys.right.isDown) this.executeDodge("DERECHA");
            else if (this.keys.down.isDown) this.executeDuck();
            else if (this.keys.up.isDown) this.executeGuard();
            else if (Phaser.Input.Keyboard.JustDown(this.keys.punchLH)) this.executePunch('ALTO_IZQ', -30, this.baseY - 40);
            else if (Phaser.Input.Keyboard.JustDown(this.keys.punchRH)) this.executePunch('ALTO_DER', 30, this.baseY - 40);
            else if (Phaser.Input.Keyboard.JustDown(this.keys.punchLL)) this.executePunch('BAJO_IZQ', -20, this.baseY - 10);
            else if (Phaser.Input.Keyboard.JustDown(this.keys.punchRL)) this.executePunch('BAJO_DER', 20, this.baseY - 10);
            else if (Phaser.Input.Keyboard.JustDown(this.keys.superKey) && this.superMeter >= 100) this.executeSuperAttack();
        }
    }

    executeDodge(direction) {
        this.state = direction === "IZQUIERDA" ? "ESQUIVE_IZQ" : "ESQUIVE_DER";
        this.lastDodgeDirection = direction;
        this.scene.infoText.setText(`Estado: ESQUIVE ${direction}`);

        const offset = direction === "IZQUIERDA" ? -60 : 60;
        this.scene.tweens.add({
            targets: this,
            x: (this.scene.sys.game.config.width / 2) + offset,
            duration: 120,
            yoyo: true,
            hold: 80,
            onComplete: () => {
                this.state = "NEUTRAL";
                this.scene.infoText.setText("Estado: NEUTRAL");
            }
        });
    }

    executeDuck() {
        this.state = 'AGACHADO';
        this.scene.infoText.setText('Estado: AGACHADO (Duck)');
        this.scene.tweens.add({
            targets: this,
            y: this.baseY + 50,
            scaleY: 0.6,
            duration: 100,
            yoyo: true,
            hold: 100,
            onComplete: () => {
                this.y = this.baseY;
                this.setScale(1, 1);
                this.state = 'NEUTRAL';
                this.scene.infoText.setText('Estado: NEUTRAL');
            }
        });
    }

    executeGuard() {
        this.state = 'BLOQUEANDO';
        this.scene.infoText.setText('Estado: GUARDIA');
        this.setScale(0.8, 1);
        this.scene.input.keyboard.once('keyup-UP', () => {
            this.setScale(1, 1);
            this.state = 'NEUTRAL';
            this.scene.infoText.setText('Estado: NEUTRAL');
        });
    }

    executePunch(tipo, offsetX, targetY) {
        if (this.scene.tweens.isTweening(this) || this.scene.nemesis.hp <= 0 || this.state === 'RECOVERY') return;

        this.state = 'ATACANDO';
        
        // Llamamos al réferi (la escena) para ver si el Némesis bloqueó o recibe daño
        this.scene.procesarGolpeJugador(tipo);

        this.scene.tweens.add({
            targets: this,
            x: (this.scene.sys.game.config.width / 2) + offsetX,
            y: targetY,
            duration: 70,
            yoyo: true,
            onComplete: () => {
                this.x = this.scene.sys.game.config.width / 2;
                this.y = this.baseY;

                if (this.scene.nemesis.hp <= 0) return;

                this.state = 'RECOVERY';
                this.scene.infoText.setText('Recuperando guardia...');
                this.scene.time.delayedCall(150, () => {
                    this.state = 'NEUTRAL';
                    this.scene.infoText.setText('Estado: NEUTRAL');
                });
            }
        });
    }

    executeSuperAttack() {
        this.state = 'ATACANDO';
        this.superMeter = 0;
        this.scene.superBar.setSize(0, 10);
        this.scene.procesarSuperJugador();
    }
}