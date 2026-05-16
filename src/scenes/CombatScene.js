export class CombatScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CombatScene' });
    }

    create() {
        console.log('CombatScene: Inicializada');
        
        // Texto de prueba en el centro
        this.add.text(400, 150, 'Fase de Combate (Punch-Out)', { font: '32px Impact', fill: '#ff4444' }).setOrigin(0.5);
        this.add.text(400, 450, 'Presiona [D] para ir a la Fase de Diálogo', { font: '18px Arial', fill: '#bbb' }).setOrigin(0.5);

        // Tecla de prueba para interactuar entre escenas durante el desarrollo
        this.input.keyboard.on('keydown-D', () => {
            this.scene.start('DialogueScene');
        });
    }

    update() {
        // Aquí irá el bucle de detección de golpes/esquives
    }
}