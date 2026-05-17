export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
    
        // Audio
        this.load.audio('bgm_intro',    'src/assets/sounds/intro.mp3');
        this.load.audio('bgm_pelea',    'src/assets/sounds/hamburguesa batalla remasterizado..mp3');
        this.load.audio('sfx_menu',     'src/assets/sounds/boton de menu.mp3');
        this.load.audio('sfx_especial', 'src/assets/sounds/ataque especial hamburguesa.mp3');

        this.load.audio('sfx_golpe_hamburguesa_1', 'src/assets/sounds/golpe 1 hamburguesa.mp3');
        this.load.audio('sfx_golpe_hamburguesa_2', 'src/assets/sounds/golpe 2 hamburguesa.mp3');
        this.load.audio('sfx_golpe_hamburguesa_3', 'src/assets/sounds/golpe 3 hamburguesa.mp3');

        this.load.audio('sfx_golpe_paciente_1', 'src/assets/sounds/golpe 1 paciente.mp3');
        this.load.audio('sfx_golpe_paciente_2', 'src/assets/sounds/golpe 2 paciente.mp3');
        this.load.audio('sfx_golpe_paciente_3', 'src/assets/sounds/golpe 3 paciente.mp3');
        this.load.audio('sfx_inicio_pelea',     'src/assets/sounds/inicio de pelea.mp3');

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

                // Ataque arriba nemesis
        this.load.image('hamburguesa_arriba_1', 'src/assets/sprites/arriba1.png');
        this.load.image('hamburguesa_arriba_2', 'src/assets/sprites/arriba2.png');
        this.load.image('hamburguesa_arriba_3', 'src/assets/sprites/arriba3.png');

        // Ataque especial
        this.load.image('hamburguesa_especial_1', 'src/assets/sprites/especial1.png');
        this.load.image('hamburguesa_especial_2', 'src/assets/sprites/especial2.png');
        this.load.image('hamburguesa_especial_3', 'src/assets/sprites/especial3.png');
        this.load.image('hamburguesa_especial_4', 'src/assets/sprites/especial4.png');

        // Idle nemesis
        this.load.image('hamburguesa_idle_1', 'src/assets/sprites/iddlenemesis1.png');
        this.load.image('hamburguesa_idle_2', 'src/assets/sprites/iddlenemesis2.png');
        this.load.image('hamburguesa_idle_3', 'src/assets/sprites/iddlenemesis3.png');

        // Recibir golpe paciente
        this.load.image('paciente_recibir_1', 'src/assets/sprites/recibirgolpe1.png');
        this.load.image('paciente_recibir_2', 'src/assets/sprites/recibirgolpe2.png');

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