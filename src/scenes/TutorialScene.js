// src/scenes/TutorialScene.js
// Pantalla de tutorial en dos columnas con el estilo minimalista de los créditos

export class TutorialScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TutorialScene' });
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        // 1. Fondo oscuro de aislamiento (Idéntico al menú y créditos)
        if (this.textures.exists('bg_menu_tutorial')) {
        // Añadimos la imagen centrada y la escalamos para que cubra todo el lienzo
        const fondo = this.add.image(W / 2, H / 2, 'bg_menu_tutorial');
        fondo.setDisplaySize(W, H);
        fondo.setAlpha(0.9); 

    } else {
        // Respaldo elegante: Si por alguna razón no se cargó la imagen, usamos un color sólido
        this.add.rectangle(W / 2, H / 2, W, H, 0x0d0d1a);
    }

        // Contenedor para la animación de entrada de todo el bloque
        const contenedor = this.add.container(0, 0);

        // 2. Título principal centrado (Mismo estilo que CRÉDITOS)
        const titulo = this.add.text(W / 2.01, 290, '¿CÓMO JUGAR?', {
            fontFamily: '"Bowlby One SC", sans-serif',
            fontSize: '100px',
            color: '#ffffff',
            letterSpacing: 4
        }).setOrigin(0.5);

        // ── CONTENEDORES DE INFORMACIÓN (COLUMNA IZQUIERDA Y DERECHA) ──
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
        
        this._drawControlRow(contenedor, colIzquierdaX, Y_ROW_1, 'TECLAS: ◀ / ▶', 'ESQUIVAR LATERAL', 'Evita ganchos moviéndote al lado opuesto.');
        this._drawControlRow(contenedor, colIzquierdaX, Y_ROW_2, 'TECLA: ▼ (ABAJO)', 'AGACHADO (DUCK)', 'Pasa por debajo de golpes altos u obstáculos.');
        this._drawControlRow(contenedor, colIzquierdaX, Y_ROW_3, 'TECLA: ▲ (ARRIBA)', 'GUARDIA FIRME', 'Mitiga el impacto directo (Chip Damage).');

        // 🥊 SECCIÓN B: ATAQUES Y CONTROL (Columna Derecha)
        this._drawSectionHeader(contenedor, colDerechaX, Y_START_HEADERS, 'COMBATE Y CONSEJOS');

        this._drawControlRow(contenedor, colDerechaX, Y_ROW_1, 'TECLAS: W / R', 'GOLPE ALTO (IZQ / DER)', 'Ataque rápido a la cabeza del Némesis.');
        this._drawControlRow(contenedor, colDerechaX, Y_ROW_2, 'TECLAS: Q / E', 'GOLPE BAJO (IZQ / DER)', 'Gancho pesado al cuerpo del rival.');
        
        // El Súper Golpe resaltado en Cyan como en el ring
        this._drawControlRow(contenedor, colDerechaX, Y_ROW_3, 'TECLA: ESPACIO', '¡SÚPER GOLPE CRÍTICO!', 'Requiere 100% de energía. Daño masivo de 50 HP.', '#00ffff');

        // 4. Botón de Retorno inferior centrado
        const btnVolver = this.add.text(W / 2, H - 160, '← VOLVER AL MENÚ', {
            fontFamily: '"Bowlby One SC", Impact, sans-serif',
            fontSize: '38px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        contenedor.add([titulo, btnVolver]);

        // Lógica de salida hacia el menú principal
        btnVolver.on('pointerdown', () => {
            this.cameras.main.fade(250, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('MenuScene');
            });
        });

        btnVolver.on('pointerover', () => btnVolver.setColor('#ffd700'));
        btnVolver.on('pointerout', () => btnVolver.setColor('#ffffff'));

        // Entrada animada elegante (Fade + Slide ascendente muy suave)
        contenedor.setAlpha(0).setY(25);
        this.tweens.add({
            targets: contenedor,
            alpha: 1,
            y: 0,
            duration: 250,
            ease: 'Cubic.Out'
        });
    }

    // ── MÉTODOS AUXILIARES DE MAQUETACIÓN ESTILO CRÉDITOS ──

    /** Dibuja el encabezado minimalista de cada columna */
    _drawSectionHeader(contenedor, x, y, title) {
        const headerTxt = this.add.text(x, y, title, {
            fontFamily: 'monospace',
            fontSize: '24px',          // 💥 Subió a 24px (Corrección de '18xpx')
            fontStyle: 'bold',
            color: '#7ed7ff',
            letterSpacing: 2           // Más separación entre letras para estilo premium
        });
        
        // 🔥 MÁS ESPACIO: Bajamos la línea a 'y + 35' para que no corte el texto grande
        // Aumentamos el ancho de la línea a 400 para cubrir el nuevo tamaño
        const linea = this.add.rectangle(x, y + 35, 400, 2, 0x0f3460).setOrigin(0);
        
        contenedor.add([headerTxt, linea]);
    }

    /** Recrea la fila con la jerarquía visual vertical de los créditos */
    _drawControlRow(contenedor, x, y, teclas, accion, desc, colorAccion = '#ffffff') {
        // Renglón 1: Las teclas (Estilo "Cargo" de los créditos)
        const teclasTxt = this.add.text(x, y, teclas, {
            fontFamily: 'monospace',
            fontSize: '18px',          // 💥 Subió de 16px a 18px
            fontWeight: 'bold',
            color: '#8a8a9a',
            letterSpacing: 2
        });

        // Renglón 2: La acción (Estilo "Nombre" grande con Bowlby)
        const accionTxt = this.add.text(x, y + 28, accion, {
            fontFamily: '"Bowlby One SC", sans-serif',
            fontSize: '36px',          // 💥 Subió de 28px a 36px (¡Ahora es enorme!)
            color: colorAccion,
        });

        // Renglón 3: La descripción breve abajo en sans-serif discreto
        const descTxt = this.add.text(x, y + 76, desc, {
            fontFamily: 'sans-serif',
            fontSize: '16px',          // 💥 Subió de 15px a 16px
            color: '#71717a',
            wordWrap: { width: 400 },   // Ampliado a 400 para que entren más palabras por línea con la nueva fuente
            letterSpacing: 1
        });

        contenedor.add([teclasTxt, accionTxt, descTxt]);
    }
}