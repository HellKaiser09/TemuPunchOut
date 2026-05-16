export class DialogueScene extends Phaser.Scene {
    constructor() {
        super({ key: 'DialogueScene' });
    }

    create() {
        console.log('DialogueScene: Inicializada');

        this.add.text(400, 150, 'Fase de Diálogo (Coach)', { font: '32px Impact', fill: '#44ff44' }).setOrigin(0.5);
        this.add.text(400, 450, 'Presiona [C] para volver al Combate o [E] para terminar', { font: '18px Arial', fill: '#bbb' }).setOrigin(0.5);

        // Flujo de prueba usando el teclado
        this.input.keyboard.on('keydown-C', () => {
            this.scene.start('CombatScene');
        });

        this.input.keyboard.on('keydown-E', () => {
            this.scene.start('EndScene');
        });
    }
}