export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        console.log('BootScene: Precargando assets...');
        
        // Texto temporal
        let loadingText = this.add.text(400, 300, 'Cargando Assets...', { font: '24px Arial', fill: '#fff' });
        loadingText.setOrigin(0.5);

        // Aquí irá la carga de imágenes/audio, ej:
        // this.load.image('player', 'src/assets/sprites/player.png');
    }

    create() {
        console.log('BootScene: ¡Carga completa!');
        
        // Al terminar de cargar, mandamos automáticamente a la escena de combate (o de diálogo)
        this.scene.start('CombatScene');
    }
}