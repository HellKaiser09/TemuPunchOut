export class Nemesis extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y) {
        super(scene, x, y, 200, 250, 0x882222);
        scene.add.existing(this);

        this.scene = scene;
        this.hp = 100;
        this.state = "IDLE";
        this.attackDirection = "NINGUNA";

        // Temporizador interno de ataques
        this.attackTimer = scene.time.addEvent({
            delay: 4500,
            callback: this.startAttack,
            callbackScope: this,
            loop: true
        });
    }

    startAttack() {
        if (this.state !== 'IDLE' || this.hp <= 0) return;

        this.state = 'ATACANDO';
        this.attackDirection = Math.random() > 0.5 ? 'IZQUIERDA' : 'DERECHA';
        this.attackType = Math.random() > 0.5 ? 'ALTO' : 'BAJO';

        this.setFillStyle(0xeeee22); // Amarillo de advertencia
        this.scene.alertText.setText(`¡ALERTA! Golpe ${this.attackType} por la ${this.attackDirection}`);

        this.scene.countdownText.setVisible(true);
        let timeRemaining = 1500;

        this.countdownEvent = this.scene.time.addEvent({
            delay: 100,
            repeat: 14,
            callback: () => {
                timeRemaining -= 100;
                const seconds = (timeRemaining / 1000).toFixed(1);
                this.scene.countdownText.setText(`⏱ ${seconds}s`);
                
                if (timeRemaining <= 300) this.scene.countdownText.setFill('#ff0000');
                else if (timeRemaining <= 600) this.scene.countdownText.setFill('#ffaa00');
                else this.scene.countdownText.setFill('#00ff00');
            }
        });

        this.scene.time.delayedCall(1500, () => {
            this.scene.countdownText.setVisible(false);
            this.scene.procesarGolpeNemesis();
        });
    }
}