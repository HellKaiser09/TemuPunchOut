export class EndScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EndScene' });
    }

/* ---------------------------------------------
¿Qué hace?
Recibe la información enviada desde el combate para saber si el jugador ganó o perdió la pelea final.
------------------------------------------- */
    init(data) {
        this.victoria = data?.victoria ?? false; 
    }

/* ---------------------------------------------
¿Qué hace?
Configura el efecto de fundido de entrada (fade in) y delega el trabajo pesado de dibujar a las funciones correspondientes según el resultado. Luego, activa la escucha de los botones de salida.
------------------------------------------- */
    create() {
        const width = this.sys.game.config.width;
        const height = this.sys.game.config.height;

        this.cameras.main.fadeIn(1000, 0, 0, 0);

        if (!this.victoria) {
            this._pintarDerrota(width, height);
        } else {
            this._pintarVictoria(width, height);
        }

        // Manejo de salida unificado
        this._configurarSalida();
    }

/* ---------------------------------------------
¿Qué hace?
Dibuja exclusivamente los gráficos, colores y textos de la pantalla de "Game Over" (Derrota).
------------------------------------------- */
    _pintarDerrota(width, height) {
        this.add.rectangle(width / 2, height / 2, width, height, 0x140505);
        this.add.text(width / 2, height / 2 - 60, 'K. O.', { font: '80px Impact', fill: '#ff2222', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
        this.add.text(width / 2, height / 2 + 30, 'Tus inseguridades te han noqueado...', { font: '20px Arial', fill: '#aaaaaa', fontStyle: 'italic' }).setOrigin(0.5);
        this.add.text(width / 2, height / 2 + 130, 'Presiona [ESPACIO] o da CLICK para volver a intentarlo', { font: '16px monospace', fill: '#00ffff' }).setOrigin(0.5);
    }

/* ---------------------------------------------
¿Qué hace?
Dibuja exclusivamente los gráficos, colores y textos de la pantalla de éxito al terminar el juego.
------------------------------------------- */
    _pintarVictoria(width, height) {
        this.add.image(width / 2, height / 2, 'Fondo_victoria').setOrigin(0.5).setDisplaySize(width, height);
        const leftX = 40;
        this.add.text(leftX, height - 120, '✦ VICTORIA ✦', { font: '96px Impact', fill: '#ffdd00', stroke: '#000', strokeThickness: 6 }).setOrigin(0, 1);
        this.add.text(leftX, height - 40, 'Presiona [ESPACIO] o da CLICK para continuar', { font: '22px monospace', fill: '#00ff88' }).setOrigin(0, 1);
    }

/* ---------------------------------------------
¿Qué hace?
Escucha de forma segura las entradas del usuario y limpia el registro global sin colapsar el motor de Phaser.
------------------------------------------- */
    _configurarSalida() {
        this._exiting = false;
        
        const finish = () => {
            if (this._exiting) return;
            this._exiting = true;
            
            this.cameras.main.fade(800, 0, 0, 0);

            this.cameras.main.once('camerafadeoutcomplete', () => {
                // 🔥 REPARACIÓN CORRECTA: El método oficial de Phaser es .reset()
                // Esto limpia los datos de los buffs de forma segura sin romper el motor.
                this.registry.reset(); 

                // Redirección limpia al menú principal
                this.scene.start('MenuScene');
            });
        };

        this.input.keyboard.once('keydown-SPACE', finish);
        this.input.keyboard.once('keydown-ENTER', finish);
        this.input.once('pointerdown', finish);
    }
}