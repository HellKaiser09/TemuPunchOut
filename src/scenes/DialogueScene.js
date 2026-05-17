// src/scenes/DialogueScene.js
import { DialogueSystem } from '../systems/DialogueSystem.js';

const SPEAKER_CONFIG = {
    patient: {
        name: 'PACIENTE',
        portrait: 'retrato_paciente', // Cambia por el asset de retrato si tienes uno
        side: 'left',
        nameColor: '#ffd700',
        textColor: '#f0ede6',
        mono: false,
        italic: false
    },
    dr: {
        name: 'DR. PROYECTADO',
        portrait: 'coach_eleccion',   // Usa el sprite del coach que cargamos en BootScene
        side: 'right',
        nameColor: '#4a9eff',
        textColor: '#a0c8ff',
        mono: true,
        italic: false
    },
    nemesis: {
        name: 'NÉMESIS',
        portrait: 'retrato_nemesis',
        side: 'right',
        nameColor: '#ff2222',
        textColor: '#ffaaaa',
        mono: false,
        italic: false
    },
    system: {
        name: '◈ SISTEMA',
        portrait: null,               // El sistema no lleva retrato
        side: 'left',
        nameColor: '#4a9eff',
        textColor: '#a0c8ff',
        mono: true,
        italic: true
    },
    silent: { // Respaldo por si falla algo
        name: '',
        portrait: null,
        side: 'left',
        nameColor: '#ffffff',
        textColor: '#ffffff',
        mono: false,
        italic: false
    }
};

export class DialogueScene extends Phaser.Scene {
/* ---------------------------------------------
¿Qué hace?
Registra la escena de novela visual en el motor Phaser asignándole la etiqueta única 'DialogueScene'.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
El nombre de la clave de la escena (`key`).

¿Qué controla?
La inicialización básica del objeto escena.

Importancia
BAJA. Requisito estructural obligatorio de Phaser.
------------------------------------------- */
    constructor() {
        super({ key: 'DialogueScene' });
    }

/* ---------------------------------------------
¿Qué hace?
Recibe el paquete de datos del diálogo. Si no recibe nada, inicializa arreglos vacíos o valores por defecto seguros para evitar que el juego truene. Configura las variables base del efecto máquina de escribir.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
La escena de destino por defecto (`'CombatScene'`) en caso de que los datos vengan corruptos.

¿Qué controla?
El estado lógico inicial y la limpieza de punteros de texto (`charIndex`, `pageIndex`, etc.) antes de pintar gráficos.

Importancia
ALTA. Es el receptor de la memoria narrativa del juego.
------------------------------------------- */
    init(data) {
        this.lines         = data.lines          || [];
        this.nextScene     = data.nextScene      || 'CombatScene';
        this.nextData      = data.nextData       || {};
        this.onFinishEvent = data.onFinishEvent  || null;
        this.typing        = false;
        this.fullText      = '';
        this.charIndex     = 0;
        this.typTimer      = null;
        this.paginationCache = {}; 
    }

/* ---------------------------------------------
¿Qué hace?
Dibuja el fondo, el marco rectangular de los diálogos, prepara el objeto de imagen para los retratos de los personajes, configura las fuentes tipográficas del narrador y el cuerpo del texto, inicializa el puntero de avance parpadeante y arranca el motor externo `DialogueSystem`.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- El alto de la caja de diálogo (`boxH = 220`) y su grosor de borde (`1.5`).
- El tamaño de las fuentes (`40px` para el emisor, `44px` para el texto de la historia).
- El escalado base del portrait de los personajes (`setScale(0.45)`).
- La velocidad de parpadeo del indicador de avance (`duration: 500`).

¿Qué controla?
La maquetación visual (Layout) estática de la interfaz de la novela visual y los escuchadores (listeners) globales de teclado/mouse.

Importancia
CRÍTICA. Dibuja el escenario interactivo donde el jugador leerá la historia.
------------------------------------------- */
    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        // 1. FONDO
        this.add.image(W / 2, H / 2, 'fondo_pelea').setDisplaySize(W, H);

        // ── Caja de diálogo MODIFICADA ──
        const boxH = 220;
        const boxY = H - boxH / 2 - 10;

        // 🔥 DEFINIR NUEVO ANCHO Y POSICIÓN
        const boxW = W - 350;
        const boxX = 40;

        // Guardamos el ancho en 'this' para usarlo después en los textos
        this.currentBoxW = boxW;
        this.currentBoxX = boxX;

        // Cambiamos el primer parámetro a 'boxX' y agregamos .setOrigin(0, 0.5)
        this.add.rectangle(boxX, boxY, boxW, boxH, 0x0d0d1a, 0.97)
            .setOrigin(0, 0.5)
            .setStrokeStyle(1.5, 0xffd700);

        // ── Retrato ──
        this.portraitImg = this.add.image(80, boxY, '__DEFAULT')
            .setVisible(false)
            .setScale(0.45);

        // ── Textos ──
        this.speakerText = this.add.text(80, H - 220, '', {
            fontFamily: '"Bowlby One SC", sans-serif',
            fontSize: '28px', color: '#ffd700',
        });

        const bodyWidth  = W - 180;
        this.bodyHeight  = boxH - 70;

        this.bodyText = this.add.text(80, H - 188, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '32px', color: '#f0ede6',
            wordWrap: { width: W - 180 },
            lineSpacing: 6
        });

        // Texto invisible usado solo para medir altura de página
        this.measureText = this.add.text(0, 0, '', {
            fontSize: '44px', fontFamily: 'sans-serif',
            wordWrap: { width: bodyWidth },
            lineSpacing: 6,
        }).setVisible(false);

        // ── Indicador de avance REPOSICIONADO ──
        this.prompt = this.add.text(boxX + boxW - 30, boxY + boxH / 2 - 10, '▶', {
            fontSize: '40px', color: '#ffd700', fontFamily: 'monospace',
        }).setOrigin(1, 1);

        this.tweens.add({
            targets: this.prompt, alpha: 0,
            duration: 500, yoyo: true, repeat: -1,
        });

        this.dialogSystem = new DialogueSystem(this);
        this.dialogSystem.load(this.lines, () => this._finish());

        this._showCurrent();

        this.input.keyboard.on('keydown', this._onAdvance, this);
        this.input.on('pointerdown', this._onAdvance, this);
    }

/* ---------------------------------------------
¿Qué hace?
Lee la línea actual del guion, consulta la base de datos externa de personajes (`SPEAKER_CONFIG`), posiciona el retrato dinámicamente a la izquierda o derecha de la pantalla según quién hable, tiñe el nombre del emisor con su color temático y envía el texto al formateador de páginas.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- La posición en X de los retratos (`70` píxeles desde los bordes).
- El espaciado del margen del bloque de texto cuando hay retrato o cuando es un pensamiento silencioso (`textX = 110` o `30`).

¿Qué controla?
La reconfiguración estética y de posicionamiento de la interfaz para cada renglón de diálogo nuevo.

Importancia
ALTA. Evita que todos los personajes se vean iguales; les da identidad visual y espacial en la pantalla.
------------------------------------------- */
    _showCurrent() {
        const line = this.dialogSystem.current();
        if (!line) return;

        const cfg = SPEAKER_CONFIG[line.speaker] || SPEAKER_CONFIG.silent;
        const W = this.scale.width;
        const H = this.scale.height;

        // Recalculamos el centro de la caja para posicionar elementos de forma segura
        const boxH = 220;
        const boxY = H - boxH / 2 - 10;
        const boxW = W - 350;
        const boxX = 40;

        // 1. GESTIÓN DE RETRATOS Y EXPRESIONES DINÁMICAS
        if (cfg.portrait && this.textures.exists(cfg.portrait) && line.speaker !== 'system') {
            this.portraitImg.setTexture(cfg.portrait).setVisible(true);
            
            // Si la línea de diálogo incluye una expresión (número de frame), lo aplicamos
            if (line.expresion !== undefined) {
                this.portraitImg.setFrame(line.expresion);
            } else {
                this.portraitImg.setFrame(0); // Cara por defecto si no se especifica
            }

            // Corregimos el anclaje: ponemos el origen abajo (0.5, 1) para que no se corten los pies
            this.portraitImg.setOrigin(0.6, 0.89);
            this.portraitImg.setY(H - 15); // Alineado perfectamente al ras inferior
            
            // Si habla el doctor a la derecha, lo metemos más al centro del encuadre
            this.portraitImg.setX(cfg.side === 'right' ? W - 180 : 180);
            this.portraitImg.setScale(cfg.side === 'right' ? 0.55 : 0.45); // Escala personalizada por lado
        } else {
            // Regresa estricta: Si habla el sistema o no hay foto, se oculta por completo
            this.portraitImg.setVisible(false);
        }

        // 2. 📝 CORRECCIÓN DE COORDENADAS Y DISTRIBUCIÓN DE TEXTO
        this.speakerText
            .setText(cfg.name)
            .setColor(cfg.nameColor)
            .setFontFamily(cfg.mono ? 'monospace' : 'sans-serif');

        // Separación vertical de seguridad (Evita el bug de encimado de image_0d1625.png)
        this.speakerText.setY(boxY - 75); // Nombre arriba
        this.bodyText.setY(boxY - 15);    // Mensaje abajo (60px de colchón limpio)

        // 3. 🗺️ MARGENES DINÁMICOS (Word-Wrap adaptado a la caja chica)
        // Usamos las variables que guardamos en el create()
        let textX = this.currentBoxX + 40;
        let maxTextWidth = this.currentBoxW - 80;

        // Si el personaje está a la izquierda (como el paciente), empujamos el texto un poco más
        if (cfg.portrait && line.speaker !== 'system' && cfg.side === 'left') {
            textX = this.currentBoxX + 260;
            maxTextWidth = this.currentBoxW - 300;
        }

        // Aplicamos los nuevos límites en caliente a los componentes de Phaser
        this.speakerText.setX(textX);
        this.bodyText.setX(textX);
        
        this.bodyText.setStyle({ wordWrap: { width: maxTextWidth } });
        this.measureText.setStyle({ wordWrap: { width: maxTextWidth } });

        // 4. PAGINACIÓN Y RENDER
        this.fullText       = line.text;
        this.pages          = this._paginateText(this.fullText);
        this.pageIndex      = 0;
        this._currentConfig = cfg;
        this._showPage(cfg);
    }

/* ---------------------------------------------
¿Qué hace?
Toma la página de texto actual que le corresponde mostrar y ejecuta un reloj (Timer) de Phaser para simular el efecto clásico de máquina de escribir, agregando un carácter cada 25 milisegundos.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
La velocidad de aparición de las letras alterando el `delay: 25` (un número menor hará que el texto aparezca más rápido).

¿Qué controla?
La animación de despliegue del texto y el bloqueo del estado de tipeo (`this.typing = true`).

Importancia
ALTA. Es la base de la estética de una Novela Visual.
------------------------------------------- */
    _showPage(cfg) {
        const pageText = this.pages[this.pageIndex] || '';

        this.charIndex = 0;
        this.typing    = true;
        this.bodyText.setText('').setColor(cfg.textColor)
            .setFontStyle(cfg.italic ? 'italic' : 'normal');

        if (this.typTimer) this.typTimer.remove();
        this.typTimer = this.time.addEvent({
            delay: 25,
            repeat: pageText.length - 1,
            callback: () => {
                this.charIndex++;
                this.bodyText.setText(pageText.substring(0, this.charIndex));
                if (this.charIndex >= pageText.length) this.typing = false;
            },
        });
    }

/* ---------------------------------------------
¿Qué hace?
Es un algoritmo inteligente de envoltura (Word-wrap). Agarra un texto largo, lo divide en palabras y va simulando renglones en una caja invisible (`measureText`). Si detecta que la altura del bloque supera el límite físico de la caja blanca (`bodyHeight`), corta el texto ahí, crea una "página" nueva y sigue procesando el resto.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
Nada visual, es un algoritmo matemático puro de strings.

¿Qué controla?
La segmentación segura de textos colosales para que jamás se desborden de la pantalla.

Importancia
ALTA. Previene errores tipográficos feos donde las letras se salen del recuadro de UI.
------------------------------------------- */
    // ── PAGINACIÓN OPTIMIZADA CON CACHÉ ──────────────────────────────────────
    _paginateText(text) {
        // 🚀 SI EL TEXTO YA SE CALCULÓ ANTES, LO DEVOLVEMOS DE INMEDIATO (0ms de CPU)
        if (this.paginationCache[text]) {
            return this.paginationCache[text];
        }

        const pages = [];
        const words = text.split(' ');
        let pageText = '';

        const fits = (value) => {
            this.measureText.setText(value);
            return this.measureText.height <= this.bodyHeight;
        };

        for (let i = 0; i < words.length; i++) {
            const word      = words[i];
            const candidate = pageText ? `${pageText} ${word}` : word;

            if (fits(candidate)) {
                pageText = candidate;
                continue;
            }

            if (pageText) {
                pages.push(pageText);
                pageText = word;
                continue;
            }

            let partial = '';
            for (const char of word) {
                if (!fits(partial + char)) break;
                partial += char;
            }

            if (partial) {
                pages.push(partial);
                words[i] = word.slice(partial.length); 
                pageText  = '';
                i--;                                   
            } else {
                pages.push(word);
                pageText = '';
            }
        }

        if (pageText) pages.push(pageText);

        const finalPages = pages.length ? pages : [text];
        this.paginationCache[text] = finalPages; 

        return finalPages;
    }
/* ---------------------------------------------
¿Qué hace?
Controla el clic o pulsación del usuario. Si la máquina de escribir está activa, detiene la animación y planta todo el texto de golpe en pantalla. Si el texto ya se terminó de escribir, evalúa si quedan páginas pendientes por leer en el mismo bloque; si no quedan, le ordena a `dialogSystem` avanzar al siguiente emisor.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
Reglas puras de interacción táctil o de teclado.

¿Qué controla?
El ritmo y la velocidad con la que el jugador consume la narrativa del juego.

Importancia
CRÍTICA. Es el gatillo interactivo principal de la escena.
------------------------------------------- */
    _onAdvance() {
        if (this.typing) {
            if (this.typTimer) this.typTimer.remove();
            this.bodyText.setText(this.pages[this.pageIndex] || this.fullText);
            this.typing = false;
            return;
        }

        if (this.pageIndex < this.pages.length - 1) {
            this.pageIndex++;
            this._showPage(this._currentConfig);
            return;
        }

        this.dialogSystem.advance();
        if (!this.dialogSystem.isFinished()) {
            this._showCurrent();
        }
    }

/* ---------------------------------------------
¿Qué hace?
Finaliza la escena. Ejecuta un fundido visual de salida a negro, avisa mediante un evento global al ring de boxeo (`CombatScene`) que la plática terminó y apaga por completo este módulo de diálogos.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
La velocidad del desvanecimiento de salida (`duration: 300` ms).

¿Qué controla?
El cierre modular de la cinemática narrativa y el regreso al combate activo.

Importancia
CRÍTICA. Es la compuerta de escape que devuelve el control al loop principal del juego.
------------------------------------------- */
_finish() {
        // 🚨 SOLUCIÓN AL BUG 1: Desconectamos los escuchadores globales de inmediato
        // Si no hacemos esto, los clics se acumularán round tras round
        this.input.keyboard.off('keydown', this._onAdvance, this);
        this.input.off('pointerdown', this._onAdvance, this);

        this.tweens.add({
            targets: this.cameras.main, alpha: 0, duration: 300,
            onComplete: () => {
                if (this.onFinishEvent) {
                    const combatScene = this.scene.get('CombatScene');
                    if (combatScene) combatScene.events.emit(this.onFinishEvent);
                }
                this.scene.stop('DialogueScene');
            },
        });
    }
}