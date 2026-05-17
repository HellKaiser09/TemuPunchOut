/* ---------------------------------------------
¿Qué hace?
Se encarga de precargar todos los recursos visuales (imágenes y spritesheets) en la memoria del navegador ANTES de que el juego realmente comience. Muestra un texto de progreso para que el jugador sepa que el juego no está trabado.

¿Qué podemos cambiar (tamaños, espaciados, etc.)?
- Las rutas de los archivos ('src/assets/sprites/...').
- Las claves (keys) con las que bautizamos a cada imagen (ej. 'bg_menu').
- Las dimensiones de corte (frameWidth y frameHeight) de los spritesheets.
- El diseño, color, fuente y posición del texto de "Cargando...".

¿Qué controla?
El flujo inicial del juego. Garantiza que cuando las demás escenas (Menu, Combat, Dialogue) pidan una imagen, esta ya esté descargada y lista para usarse de inmediato. Al terminar de descargar todo, dispara automáticamente el cambio al 'MenuScene'.

Importancia
CRÍTICA. Si te equivocas en una ruta o en el nombre de un archivo aquí, la pantalla se quedará en negro, mostrará un cuadro verde de error, o el juego crasheará por completo.
-------------------------------------------
*/
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

        const W = this.scale.width;
        const H = this.scale.height;

        const loadingText = this.add.text(W / 2, H / 2, 'Cargando...', {
            font: '32px Arial', fill: '#fff'
        }).setOrigin(0.5);

        this.load.on('progress', (v) => 
            loadingText.setText(`Cargando... ${Math.floor(v * 100)}%`)
        );
    }

    create() {
        // Registrar animaciones globales una sola vez al iniciar el juego
        this.anims.create({
            key: 'enemigo_batazo_izq',
            frames: [
                { key: 'hamburguesa_golpe_izq_1' },
                { key: 'hamburguesa_golpe_izq_2' },
                { key: 'hamburguesa_golpe_izq_3' },
            ],
            frameRate: 12,
            repeat: 0
        });

        this.anims.create({
            key: 'enemigo_batazo_der',
            frames: [
                { key: 'hamburguesa_golpe_der_1' },
                { key: 'hamburguesa_golpe_der_2' },
                { key: 'hamburguesa_golpe_der_3' },
            ],
            frameRate: 12,
            repeat: 0
        });

        this.scene.start('MenuScene');
    }
}