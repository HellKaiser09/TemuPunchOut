export class EndScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EndScene' });
    }

    create() {
        console.log('EndScene: Inicializada');

        this.add.text(400, 250, 'FIN DEL JUEGO', { font: '48px Impact', fill: '#fff' }).setOrigin(0.5);
        this.add.text(400, 350, 'Presiona [R] para reiniciar el juego', { font: '20px Arial', fill: '#00ffff' }).setOrigin(0.5);

        this.input.keyboard.on('keydown-R', () => {
            this.scene.start('BootScene');
        });
    }
}