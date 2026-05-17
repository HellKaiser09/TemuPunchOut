// src/scenes/TutorialScene.js
// Pantalla de tutorial en dos columnas con el estilo minimalista de los créditos
const FONT_TITULO = '"Bowlby One SC", sans-serif';
const FONT_DATOS = 'monospace';
const FONT_DESC = 'sans-serif';
export class TutorialScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TutorialScene' });
    }

/* ---------------------------------------------
¿Qué hace?
Configura y dibuja toda la interfaz del tutorial. Pinta el fondo oscuro, el título gigante, calcula las posiciones de las dos columnas de texto y dibuja el botón interactivo para volver al menú principal, todo con una animación de entrada fluida.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- La opacidad del fondo (`0.9`).
- La separación entre columnas (`columnGap = 140`) y el ancho de cada una (`columnWidth = 400`).
- Las alturas de los renglones (`Y_ROW_1 = 490`, etc.).
- La posición del título (`290`) y del botón de volver (`H - 160`).

¿Qué controla?
La visualización principal de la pantalla de ayuda y el ruteo de regreso al `MenuScene`.

Importancia
MEDIA. Es esencial para que el jugador entienda las mecánicas, pero no afecta la lógica interna del combate.
------------------------------------------- */
    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        // 1. Fondo oscuro de aislamiento
        if (this.textures.exists('bg_menu_tutorial')) {
            const fondo = this.add.image(W / 2, H / 2, 'bg_menu_tutorial');
            fondo.setDisplaySize(W, H);
            fondo.setAlpha(0.9); 
        } else {
            this.add.rectangle(W / 2, H / 2, W, H, 0x0d0d1a);
        }

        // Contenedor para la animación de entrada
        const contenedor = this.add.container(0, 0);

        // 2. Título principal centrado
        const titulo = this.add.text(W / 2.01, 290, '¿CÓMO JUGAR?', {
            fontFamily: FONT_TITULO,
            fontSize: '100px',
            color: '#ffffff',
            letterSpacing: 4
        }).setOrigin(0.5);

        // ── CONTENEDORES DE INFORMACIÓN ──
        const columnWidth = 400;
        const columnGap = 140;
        const totalColumnsWidth = (columnWidth * 2) + columnGap;
        const columnsStartX = (W - totalColumnsWidth) / 2;

        const colIzquierdaX = columnsStartX;
        const colDerechaX = columnsStartX + columnWidth + columnGap;

        const Y_START_HEADERS = 400; 
        const Y_ROW_1         = 490;
        const Y_ROW_2         = 650; 
        const Y_ROW_3         = 795;

        // 🛡️ SECCIÓN A: DEFENSA Y MOVIMIENTO (Columna Izquierda)
        this._drawSectionHeader(contenedor, colIzquierdaX, Y_START_HEADERS, 'MOVIMIENTO Y DEFENSA');
        
        const controlesIzquierda = [
            { teclas: '◀ / ▶', accion: 'ESQUIVAR LATERAL', desc: 'Evita ganchos moviéndote al lado opuesto.' },
            { teclas: '▼ (ABAJO)', accion: 'AGACHADO (DUCK)', desc: 'Pasa por debajo de golpes altos u obstáculos.' },
            { teclas: '▲ (ARRIBA)', accion: 'GUARDIA FIRME', desc: 'Mitiga el impacto directo (Chip Damage).' }
        ];

        // Se dibujan automáticamente con la matemática de separación (+150px por fila)
        controlesIzquierda.forEach((ctrl, i) => {
            const yOffset = Y_START_HEADERS + 90 + (i * 150);
            this._drawControlRow(contenedor, colIzquierdaX, yOffset, ctrl.teclas, ctrl.accion, ctrl.desc);
        });

        // 🥊 SECCIÓN B: ATAQUES Y CONTROL (Columna Derecha)
        this._drawSectionHeader(contenedor, colDerechaX, Y_START_HEADERS, 'COMBATE Y CONSEJOS');
        const controlesDerecha =[
            {teclas: 'W / R', accion: 'GOLPE ALTO (IZQ / DER)', desc: 'Ataque rápido a la cabeza del Némesis.'},
            {teclas: 'Q/ E', accion: 'GOLPE BAJO (IZQ / DER)', desc: 'Gancho pesado al cuerpo del rival.'},
        ];

        controlesDerecha.forEach((ctrl, i) => {
            const yOffset = Y_START_HEADERS + 90 + (i * 150);
            this._drawControlRow(contenedor, colDerechaX, yOffset, ctrl.teclas, ctrl.accion, ctrl.desc);
        });
        
        // Súper Golpe resaltado en Cyan
        this._drawControlRow(contenedor, colDerechaX, Y_ROW_3, 'TECLA: ESPACIO', '¡SÚPER GOLPE CRÍTICO!', 'Requiere 100% de energía. Daño masivo de 50 HP.', '#00ffff');

        // 4. Botón de Retorno inferior
        const btnVolver = this.add.text(W / 2, H - 160, '← VOLVER AL MENÚ', {
            fontFamily: FONT_TITULO,
            fontSize: '38px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        contenedor.add([titulo, btnVolver]);

        // Lógica de salida
        btnVolver.on('pointerdown', () => {
            this.cameras.main.fade(250, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('MenuScene');
            });
        });

        btnVolver.on('pointerover', () => btnVolver.setColor('#ffd700'));
        btnVolver.on('pointerout', () => btnVolver.setColor('#ffffff'));

        // Entrada animada
        contenedor.setAlpha(0).setY(25);
        this.tweens.add({
            targets: contenedor,
            alpha: 1,
            y: 0,
            duration: 250,
            ease: 'Cubic.Out'
        });
    }

/* ---------------------------------------------
¿Qué hace?
Dibuja el título secundario de una columna ("MOVIMIENTO Y DEFENSA") y le coloca una línea divisoria debajo para darle estilo. Lo añade al contenedor principal para que se anime junto con el resto.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- El tamaño y espaciado de fuente (`24px`, `letterSpacing: 2`).
- El color de la línea divisoria (`0x0f3460`) y su grosor (`2`).
- El espacio entre el texto y la línea (`y + 35`).

¿Qué controla?
La separación visual y el orden jerárquico de la información en pantalla.

Importancia
BAJA. Es un elemento puramente estético y de maquetación (Layout).
------------------------------------------- */
    _drawSectionHeader(contenedor, x, y, title) {
        const headerTxt = this.add.text(x, y, title, {
            fontFamily: FONT_DATOS, fontSize: '24px', fontStyle: 'bold', color: '#7ed7ff', letterSpacing: 2 
        });
        
        const linea = this.add.rectangle(x, y + 35, 400, 2, 0x0f3460).setOrigin(0);
        contenedor.add([headerTxt, linea]);
    }

/* ---------------------------------------------
¿Qué hace?
Genera un bloque de texto de tres renglones: 1) Las teclas requeridas, 2) El nombre de la acción (en grande), y 3) La descripción detallada. Lo agrega al contenedor principal.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- El margen vertical entre textos (`y + 28`, `y + 76`).
- El tamaño de las fuentes (`18px`, `36px`, `16px`).
- El ancho máximo antes de que el texto de descripción salte a la siguiente línea (`wordWrap: { width: 400 }`).
- El color por defecto del título de acción (`#ffffff`).

¿Qué controla?
El formato estándar en el que se le enseñan los controles al jugador.

Importancia
MEDIA. Agiliza muchísimo el código principal al evitar repetir bloques de texto enormes.
------------------------------------------- */
    _drawControlRow(contenedor, x, y, teclas, accion, desc, colorAccion = '#ffffff') {
        const teclasTxt = this.add.text(x, y, teclas, {
            fontFamily: FONT_DATOS, fontSize: '18px', fontWeight: 'bold', color: '#8a8a9a', letterSpacing: 2
        });

        const accionTxt = this.add.text(x, y + 28, accion, {
            fontFamily: FONT_TITULO, fontSize: '36px', color: colorAccion,
        });

        const descTxt = this.add.text(x, y + 76, desc, {
            fontFamily: FONT_DESC, fontSize: '16px', color: '#71717a', wordWrap: { width: 400 }, letterSpacing: 1
        });

        contenedor.add([teclasTxt, accionTxt, descTxt]);
    }
}