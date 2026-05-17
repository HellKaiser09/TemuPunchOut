export class EndScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EndScene' });
    }

/* ---------------------------------------------
¿Qué hace?
Recibe la información enviada desde el combate para saber si el jugador ganó o perdió la pelea final.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
El valor por defecto (`false`). Si por alguna razón la escena carga sin datos, asumirá que es una derrota.

¿Qué controla?
La variable principal de decisión (`this.victoria`) que dictará qué gráficos pintar y a dónde enviar al jugador al salir.

Importancia
ALTA. Es el puente de datos entre el ring y la pantalla de resultados.
------------------------------------------- */
    init(data) {
        this.victoria = data?.victoria ?? false; 
    }

/* ---------------------------------------------
¿Qué hace?
Configura el efecto de fundido de entrada (fade in) y delega el trabajo pesado de dibujar a las funciones correspondientes según el resultado. Luego, activa la escucha de los botones de salida.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
El tiempo que tarda la pantalla en aparecer desde el color negro (`1000` milisegundos = 1 segundo).

¿Qué controla?
El orden en que se ejecutan las acciones visuales y lógicas de la escena.

Importancia
ALTA. Es el organizador principal de la pantalla final.
------------------------------------------- */
    create() {
        const width = this.sys.game.config.width;
        const height = this.sys.game.config.height;

        this.cameras.main.fadeIn(1000, 0, 0, 0);

        // 🔥 REFACTORIZACIÓN 1: Delegamos el dibujo a funciones separadas para mayor claridad
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

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- El color de fondo: `0x140505` (un rojo casi negro).
- Los textos ('K. O.', 'Tus inseguridades...').
- Las posiciones (ej. `height / 2 - 60` para subir o bajar el texto).
- Las fuentes ('80px Impact', '20px Arial').

¿Qué controla?
El impacto psicológico visual cuando el jugador pierde.

Importancia
MEDIA. Es netamente estética y narrativa.
------------------------------------------- */
    _pintarDerrota(width, height) {
        this.add.rectangle(width / 2, height / 2, width, height, 0x140505);
        this.add.text(width / 2, height / 2 - 60, 'K. O.', { font: '80px Impact', fill: '#ff2222', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
        this.add.text(width / 2, height / 2 + 30, 'Tus inseguridades te han noqueado...', { font: '20px Arial', fill: '#aaaaaa', fontStyle: 'italic' }).setOrigin(0.5);
        this.add.text(width / 2, height / 2 + 130, 'Presiona [ESPACIO] para volver a intentarlo', { font: '16px monospace', fill: '#00ffff' }).setOrigin(0.5);
    }

/* ---------------------------------------------
¿Qué hace?
Dibuja exclusivamente los gráficos, colores y textos de la pantalla de éxito al terminar el juego.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- El color de fondo: `0x001a4d` (un azul rey profundo).
- Los textos inspiracionales ('✦ VICTORIA ✦', 'Has avanzado...').
- Las posiciones verticales (`height / 2 + 50`).

¿Qué controla?
La recompensa visual final del jugador.

Importancia
MEDIA. Al igual que la derrota, es la conclusión estética de la experiencia.
------------------------------------------- */
    _pintarVictoria(width, height) {
        this.add.rectangle(width / 2, height / 2, width, height, 0x001a4d);
        this.add.text(width / 2, height / 2 - 80, '✦ VICTORIA ✦', { font: '80px Impact', fill: '#ffdd00', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
        this.add.text(width / 2, height / 2 - 10, '¡Has conquistado tus demonios internos!', { font: '20px Arial', fill: '#00ffff', fontStyle: 'italic' }).setOrigin(0.5);
        this.add.text(width / 2, height / 2 + 50, '🏆 Has avanzado en tu camino de sanación 🏆', { font: '18px Arial', fill: '#ffaa00' }).setOrigin(0.5);
        this.add.text(width / 2, height / 2 + 140, 'Presiona [ESPACIO] para continuar', { font: '16px monospace', fill: '#00ff88' }).setOrigin(0.5);
    }

/* ---------------------------------------------
¿Qué hace?
Prepara el sistema para escuchar cualquier tecla (Espacio, Enter o clic), hace un fundido a negro y redirecciona al jugador a la escena correcta dependiendo de si ganó o perdió. Limpia la memoria al perder.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- La velocidad del fundido a negro (`800` ms).
- Las escenas de destino (`MenuScene` o `BootScene`).
- Los botones que acepta para avanzar (ahora acepta casi cualquiera).

¿Qué controla?
La limpieza de la memoria (el registro de buffs) y el ciclo de reinicio del juego.

Importancia
CRÍTICA. Si esto falla, el jugador se queda atrapado en la pantalla de Game Over para siempre.
------------------------------------------- */
    _configurarSalida() {
        this._exiting = false;
        
        const finish = () => {
            if (this._exiting) return;
            this._exiting = true;
            
            this.cameras.main.fade(800, 0, 0, 0);

            this.cameras.main.once('camerafadeoutcomplete', () => {
                if (!this.victoria) {
                    // Limpieza profunda antes de reiniciar
                    this.registry.destroy(); 
                    
                    // Reiniciamos mandando al menú
                    this.scene.start('MenuScene', { 
                    });
                } else {
                    // Si ganó, lo mandamos al inicio
                    this.scene.start('BootScene');
                }
            });
        };

        this.input.keyboard.once('keydown-SPACE', finish);
        this.input.keyboard.once('keydown-ENTER', finish);
        this.input.keyboard.once('keydown', (e) => { if (e.key && e.key.length === 1) finish(); });
        this.input.once('pointerdown', finish);
    }
}