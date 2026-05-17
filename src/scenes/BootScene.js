export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }


preload() {
    this.load.image('bg_menu', "src/assets/sprites/Frame_4.png");
    this.load.image('bg_menu_tutorial', "src/assets/sprites/Frame_6.png")
    this.load.image('coach_character_menu', "src/assets/sprites/Mesa_de_trabajo_6_1.png")
    this.load.image('coach_eleccion', "src/assets/sprites/coach_eleccion.png")
    this.load.image('fondo_pelea', "src/assets/sprites/Frame_8.png")
    this.load.spritesheet('hamburguesa_golpe_izq', 'src/assets/sprites/spritesheet (2).png', {
    frameWidth: 850, // 🔥 El ancho exacto de un cuadro para 3 frames
    frameHeight: 851  // 🔥 El alto exacto de tu archivo
});

        const loadingText = this.add.text(400, 250, 'Cargando...', {
            font: '24px Arial', fill: '#fff'
        }).setOrigin(0.5);

        this.load.on('progress', (v) => loadingText.setText(`Cargando... ${Math.floor(v * 100)}%`));

}

create() {
    this.scene.start('MenuScene');
} }
