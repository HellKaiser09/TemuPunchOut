export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }


    //
  //  preload() {
        // Fondo del menú
        // this.load.image('bg_menu', 'src/assets/bg_menu.png');

preload() {
    this.load.image('bg_menu', "src/assets/sprites/Frame_4.png");
    this.load.image('bg_menu_tutorial', "src/assets/sprites/Frame_6.png")

        const loadingText = this.add.text(400, 250, 'Cargando...', {
            font: '24px Arial', fill: '#fff'
        }).setOrigin(0.5);

        this.load.on('progress', (v) => loadingText.setText(`Cargando... ${Math.floor(v * 100)}%`));

}

create() {
    this.scene.start('MenuScene');
} }
