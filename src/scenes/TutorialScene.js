// src/scenes/TutorialScene.js

const FONT_TITULO = '"Bowlby One SC", sans-serif';
const FONT_DATOS  = 'monospace';
const FONT_DESC   = 'sans-serif';

export class TutorialScene extends Phaser.Scene {
/* ---------------------------------------------
¿Qué hace?
Registra la escena en el núcleo del motor bajo la clave 'TutorialScene'.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
La clave de acceso en texto si decides renombrarla.

¿Qué controla?
La inicialización básica del objeto escena.

Importancia
BAJA. Requisito estructural de Phaser.
------------------------------------------- */
    constructor() {
        super({ key: 'TutorialScene' });
    }

/* ---------------------------------------------
¿Qué hace?
Dibuja el fondo, crea el contenedor cinematográfico negro y azul del SISTEMA, inicializa los textos parpadeantes de interactividad, define el guion introductorio del juego y activa los escuchadores para avanzar el texto.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- El tamaño de la caja del sistema (`W * 0.7`, `280` de alto).
- Los colores del recuadro (`0x0d0d1a` para el fondo, `0x4a9eff` para el borde azul).
- Las tipografías, tamaños (`28px`, `22px`) y el interlineado (`lineSpacing: 8`).
- La velocidad del parpadeo del prompt (`duration: 600`).

¿Qué controla?
La maquetación visual de la introducción de texto y el arranque del hilo narrativo.

Importancia
CRÍTICA. Es el constructor principal de la escena cinemática.
------------------------------------------- */
    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        // 1. Fondo de la pelea de respaldo
        if (this.textures.exists('fondo_pelea')) {
            this.add.image(W / 2, H / 2, 'fondo_pelea').setDisplaySize(W, H);
        } else {
            this.add.rectangle(W / 2, H / 2, W, H, 0x0d0d1a);
        }

        this.cameras.main.fadeIn(400);

        // ── CAJA DE DIÁLOGO SISTEMA CENTRALIZADA ──
        this.add.rectangle(W / 2, H / 2, W * 0.7, 280, 0x0d0d1a, 0.96)
            .setStrokeStyle(2, 0x4a9eff);

        // Etiqueta del emisor
        this.sysLabel = this.add.text(W / 2, H / 2 - 100, '◈ SISTEMA', {
            fontFamily: FONT_DATOS, fontSize: '22px', color: '#4a9eff', letterSpacing: 3,
        }).setOrigin(0.5);

        // Texto principal dinámico (Donde cae el tipeo)
        this.sysText = this.add.text(W / 2, H / 2 - 30, '', {
            fontFamily: FONT_DATOS, fontSize: '28px', color: '#a0c8ff', align: 'center',
            wordWrap: { width: W * 0.62 }, lineSpacing: 8,
        }).setOrigin(0.5, 0);

        // Indicador de acción parpadeante
        this.prompt = this.add.text(W / 2, H / 2 + 110, '[ PRESIONA CUALQUIER TECLA O DA CLICK ]', {
            fontFamily: FONT_DATOS, fontSize: '20px', color: '#4a9eff',
        }).setOrigin(0.5);

        this.tweens.add({
            targets: this.prompt, alpha: 0, duration: 600, yoyo: true, repeat: -1,
        });

        // ── ESTADO DE LAS LÍNEAS NARRATIVAS / CONTROLES ──
// ── ESTADO DE LAS LÍNEAS NARRATIVAS / CONTROLES ──
        this.lines = [
            { text: 'Estás dentro de tu propio miedo.' },
            { text: 'No te preocupes. Es solo un sueño.' },
            { text: '(Más o menos.)' },
            // Usamos \n para saltar de renglón y espaciados para tabular los botones
            { text: 'Moverse requiere usar tus reflejos básicos:\n[Q] Golpe bajo izq.   [W] Golpe alto izq.\n[E] Golpe bajo der.   [R] Golpe alto der.' },
            { text: 'Para proteger tu mente:\n[←] [→] Esquivar a los lados\n[↓]  Agacharse (mantén presionado)' },
            { text: 'Tu oponente representa algo que te ha estado quitando el sueño.' },
            { text: 'Aunque literalmente tiene forma de combo #3.' },
        ];
        
        this.index    = 0;
        this.typing   = false;
        this.fullText = '';
        this.charIdx  = 0;
        this.typTimer = null;

        // Arrancamos el primer renglón
        this._showLine(0);

        // Entrada de teclado y mouse unificada
        this.input.keyboard.on('keydown', this._onAdvance, this);
        this.input.on('pointerdown', this._onAdvance, this);
    }

/* ---------------------------------------------
¿Qué hace?
Borra el texto anterior y arranca un reloj interno (Timer) que imprime letra por letra del nuevo renglón cada 30 milisegundos para simular una terminal de computadora. Si se acaban las líneas, salta al combate.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
La velocidad del tipeo de las letras cambiando el `delay: 30` (más chico es más veloz).

¿Qué controla?
El avance del guion indexado y el estado lógico de escritura (`this.typing`).

Importancia
ALTA. Controla la animación automatizada del texto.
------------------------------------------- */
    _showLine(i) {
        if (i >= this.lines.length) {
            this._irACombate();
            return;
        }
        this.index    = i;
        this.fullText = this.lines[i].text;
        this.charIdx  = 0;
        this.typing   = true;
        this.sysText.setText('');

        if (this.typTimer) this.typTimer.remove();
        this.typTimer = this.time.addEvent({
            delay: 30,
            repeat: this.fullText.length - 1,
            callback: () => {
                this.charIdx++;
                this.sysText.setText(this.fullText.substring(0, this.charIdx));
                if (this.charIdx >= this.fullText.length) this.typing = false;
            },
        });
    }

/* ---------------------------------------------
¿Qué hace?
Gestiona el clic o la tecla del usuario. Si el texto se está escribiendo, detiene el efecto y planta el enunciado completo de inmediato. Si el texto ya terminó de escribirse, ordena avanzar a la siguiente línea.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
Nada estético, es pura regla lógica de interrupción.

¿Qué controla?
La fluidez de lectura del usuario impaciente.

Importancia
ALTA. Previene que el jugador tenga que esperar el tipeo si lee rápido.
------------------------------------------- */
    _onAdvance() {
        if (this.typing) {
            if (this.typTimer) this.typTimer.remove();
            this.sysText.setText(this.fullText);
            this.typing = false;
            return;
        }
        this._showLine(this.index + 1);
    }

/* ---------------------------------------------
¿Qué hace?
Limpia los escuchadores de teclado y mouse de la escena para que no se queden duplicados en memoria, ejecuta un fade out negro y arranca el ring de boxeo.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
La velocidad de salida de la pantalla (`500` ms).

¿Qué controla?
La transición segura y el desembarco en la escena de pelea.

Importancia
CRÍTICA. Es la válvula de escape que inicia el juego real.
------------------------------------------- */
    _irACombate() {
        this.input.keyboard.off('keydown', this._onAdvance, this);
        this.input.off('pointerdown', this._onAdvance, this);

        this.cameras.main.fade(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('CombatScene');
        });
    }
}