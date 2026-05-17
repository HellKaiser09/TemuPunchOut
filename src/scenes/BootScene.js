export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        this.load.image('bg_intro',          'src/assets/sprites/salaintro.png');
        this.load.image('paciente_asustado', 'src/assets/sprites/paciente_asustado.png');
        this.load.image('paciente_intro',    'src/assets/sprites/paciente.png');
        this.load.image('dr_intro',         'src/assets/sprites/Mesa_de_trabajo_6_1.png');
        
        this.load.image('bg_menu',             'src/assets/sprites/Frame_4.png');
        this.load.image('bg_menu_tutorial',    'src/assets/sprites/Frame_6.png');
        this.load.image('coach_character_menu','src/assets/sprites/Mesa_de_trabajo_6_1.png');
        this.load.image('coach_eleccion',      'src/assets/sprites/coach_eleccion.png');
        this.load.image('fondo_pelea',         'src/assets/sprites/Frame_8.png');

        this.load.image('hamburguesa_golpe_izq_1', 'src/assets/sprites/izquierda1.png');
        this.load.image('hamburguesa_golpe_izq_2', 'src/assets/sprites/izquierda2.png');
        this.load.image('hamburguesa_golpe_izq_3', 'src/assets/sprites/izquierda3.png');

        this.load.image('hamburguesa_golpe_der_1', 'src/assets/sprites/derecha1.png');
        this.load.image('hamburguesa_golpe_der_2', 'src/assets/sprites/derecha2.png');
        this.load.image('hamburguesa_golpe_der_3', 'src/assets/sprites/derecha3.png');

        this.load.image('paciente_iddle',      'src/assets/sprites/iddle.png');
        this.load.image('paciente_esquive_izq','src/assets/sprites/esquive izq.png');
        this.load.image('paciente_esquive_der','src/assets/sprites/esquive derecha.png');
        this.load.image('paciente_arriba_izq', 'src/assets/sprites/arriba izq.png');
        this.load.image('paciente_arriba_der', 'src/assets/sprites/arriba derecho.png');
        this.load.image('paciente_abajo_izq',  'src/assets/sprites/abajo izq.png');
        this.load.image('paciente_abajo_der',  'src/assets/sprites/abajo derecha.png');

        const loadingText = this.add.text(400, 250, 'Cargando...', {
            font: '24px Arial', fill: '#fff'
        }).setOrigin(0.5);

        this.load.on('progress', (v) => 
            loadingText.setText(`Cargando... ${Math.floor(v * 100)}%`)
        );
    }

    create() {
        this.scene.start('MenuScene');
    }
}