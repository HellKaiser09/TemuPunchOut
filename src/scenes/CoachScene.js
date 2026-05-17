// src/scenes/CoachScene.js
// Escena del Coach: Flujo secuencial (Diálogo primero -> Lista de opciones a la izquierda)

import { BUFF_CATALOG } from '../systems/BuffSystem.js';

export default class CoachScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CoachScene' });
    }

    init(roundData) {
        this.roundData = roundData;
        this.opcionesBotones = []; // Almacén para limpiar interactividad después
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        // 1.FONDO Y PERSONAJE (Ya alineados por tus diseñadores)
        // Colocamos el fondo del ring y al Coach a la derecha de la pantalla
        this.add.image(W / 2, H / 2, 'bg_menu_tutorial').setDisplaySize(W, H);
        
        // Cortina oscura sutil para que el texto de la izquierda sea ultra legible
        this.add.rectangle(0, 0, W, H, 0x000000, 0.35).setOrigin(0);

        this.add.image(W * 0.57, H * 0.50, 'coach_eleccion').setOrigin(0.4).setScale(1.22);


        // Contenedor principal para la lista de respuestas interactivas
        this.contenedorOpciones = this.add.container(0, 0).setAlpha(0);

        // 2. 🚀 ARRANCAR EL FLUJO: Primera Fase (El Diálogo)
        this._iniciarDialogoCoach(W, H);
    }

    /**
     * FASE 1: Despliega el bocadillo o texto introductorio del Dr. Proyectado
     */
    _iniciarDialogoCoach(W, H) {
        // Caja de texto negra clásica abajo para la narrativa
        this.bubbleBg = this.add.rectangle(W / 2, H - 100, W - 100, 100, 0x0a0a14, 0.95)
            .setStrokeStyle(2, 0x0f3460);
        
        // Indicador de "Clic para continuar"
        this.clickAlert = this.add.text(W - 120, H - 65, '[ CLIC ]', { font: '12px monospace', fill: '#ffd700' });

        const round = this.roundData?.round ?? 1;
        this.dialogoText = this.add.text(90, H - 120, 
            `Dr. Proyectado: "Terminó el Round ${round}. Tu mente está cansada, Paciente. Escucha con atención tus opciones antes de volver al ring..."`, 
            {
                fontFamily: 'sans-serif',
                fontSize: '18px',
                color: '#ffffff',
                fontStyle: 'italic',
                wordWrap: { width: W - 220 },
                lineSpacing: 6
            }
        );

        // Hacemos que toda la pantalla escuche el clic para avanzar a las opciones
        this.input.once('pointerdown', () => {
            // Animación de salida del cuadro de diálogo
            this.tweens.add({
                targets: [this.bubbleBg, this.dialogoText, this.clickAlert],
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    // Destruimos el cuadro de texto viejo para liberar memoria
                    this.bubbleBg.destroy();
                    this.dialogoText.destroy();
                    this.clickAlert.destroy();
                    
                    // Activamos la Fase 2
                    this._desplegarListaOpciones(W, H);
                }
            });
        });
    }

/**
     * FASE 2: Muestra el listado de habilidades alineado a la izquierda con el hover avanzado
     */
    _desplegarListaOpciones(W, H) {
        // TÍTULO DE SECCIÓN (Espacio reservado si deciden agregar un encabezado)
        const tituloSeccion = this.add.text(110, 100, '', {
            fontFamily: 'monospace',
            fontSize: '60px',
            fontStyle: 'bold',
            color: '#7ed7ff',
            letterSpacing: 2
        });
        tituloSeccion.setText('ELECCIÓN DE APOYO');
        this.contenedorOpciones.add(tituloSeccion);

        // IDs del catálogo de habilidades de Jesús
        const buffIds = Object.keys(BUFF_CATALOG); // ['autoestima', 'limites', 'vulnerabilidad', 'perdonarte']

        const panelX = W - 440;
        const panelY = 130;
        const panelW = 360;
        const panelH = 380;
        const infoBg = this.add.rectangle(panelX, panelY, panelW, panelH, 0x081019, 0.95)
            .setOrigin(0)
            .setStrokeStyle(2, 0x4f8bd8);
        const infoTitle = this.add.text(panelX + 30, panelY + 30, 'PASA EL CURSOR', {
            fontFamily: 'monospace',
            fontSize: '26px',
            fontStyle: 'bold',
            color: '#9ad7ff',
            wordWrap: { width: panelW - 60 }
        }).setOrigin(0, 0);
        const infoSub = this.add.text(panelX + 30, panelY + 76, 'para ver la descripción', {
            fontFamily: 'sans-serif',
            fontSize: '18px',
            color: '#cfd8ff',
            wordWrap: { width: panelW - 60 }
        }).setOrigin(0, 0);
        this.descriptionTitle = this.add.text(panelX + 30, panelY + 130, '', {
            fontFamily: 'sans-serif',
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#ffffff',
            wordWrap: { width: panelW - 60 }
        }).setOrigin(0, 0);
        this.descriptionText = this.add.text(panelX + 30, panelY + 180, 'Selecciona una opción para ver de qué sirve.', {
            fontFamily: 'sans-serif',
            fontSize: '22px',
            color: '#dfe7ff',
            wordWrap: { width: panelW - 60 },
            lineSpacing: 8
        }).setOrigin(0, 0);
        this.contenedorOpciones.add([infoBg, infoTitle, infoSub, this.descriptionTitle, this.descriptionText]);

        buffIds.forEach((id, i) => {
            const buff = BUFF_CATALOG[id];
            const x = 110; 
            const yBase = 360 + (i * 150); // Mantenemos tu distribución vertical original

            // 🔥 DIMENSIONES EXPANDIDAS: Calculadas para albergar la tipografía de 60px
            const buttonW = 680; 
            const buttonH = 95;  

            // 🎨 1. EL HOVER DEL MENÚ (Banda blanca slanteada + línea roja inferior)
            const hoverGfx = this.add.graphics();
            hoverGfx.setVisible(false); // Oculto por defecto

            // Dibujar el bloque de fondo blanco diagonal
            hoverGfx.fillStyle(0xf0ede6, 1);
            hoverGfx.beginPath();
            hoverGfx.moveTo(x, yBase - buttonH / 2);               // Esquina Top-Left
            hoverGfx.lineTo(x + 670, yBase - buttonH / 2);         // Esquina Top-Right (Suficientemente larga para palabras como VULNERABILIDAD)
            hoverGfx.lineTo(x + 720, yBase + buttonH / 2);         // Esquina Bottom-Right (Corte diagonal)
            hoverGfx.lineTo(x, yBase + buttonH / 2);               // Esquina Bottom-Left
            hoverGfx.closePath();
            hoverGfx.fillPath();

            // Dibujar la franja roja inferior carmesí
            hoverGfx.lineStyle(6, 0xd85a30, 1);
            hoverGfx.beginPath();
            hoverGfx.moveTo(x, yBase + buttonH / 2 + 3);
            hoverGfx.lineTo(x + 720, yBase + buttonH / 2 + 3);
            hoverGfx.strokePath();

            // 📝 2. TEXTO PRINCIPAL (Configurado con setOrigin(0, 0.5) para alineación perfecta en la banda)
            // Agregamos un colchón de +40 en X para que la primera letra no toque el borde del recuadro
            const botonTexto = this.add.text(x + 40, yBase, buff.name.toUpperCase(), {
                fontFamily: '"Bowlby One SC", sans-serif',
                fontSize: '60px', 
                color: '#ffffff'
            }).setOrigin(0, 0.5);

            // Añadimos las capas visuales en orden correcto al contenedor principal
            this.contenedorOpciones.add([hoverGfx, botonTexto]);

            // 🕹️ 4. ZONA INTERACTIVA INVISIBLE
            // Creamos un rectángulo transparente que abarque todo el bloque para capturar el mouse de forma fluida
            const zona = this.add.rectangle(x + buttonW / 2, yBase, buttonW, buttonH, 0xffffff, 0)
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });
            
            this.contenedorOpciones.add(zona);
            
            // Guardamos la zona interactiva en el arreglo para que el método de bloqueo al dar click funcione al 100%
            this.opcionesBotones.push(zona);

            // ── MANEJO DE EVENTOS DINÁMICOS ──
            zona.on('pointerover', () => {
                hoverGfx.setVisible(true); // Encendemos el fondo de la banda
                botonTexto.setColor('#16213e'); // Cambia a azul marino oscuro plano para contrastar con el blanco
                this.descriptionTitle.setText(`${buff.name.toUpperCase()}`);
                this.descriptionText.setText(buff.desc);
            });

            zona.on('pointerout', () => {
                hoverGfx.setVisible(false); // Apagamos el fondo de la banda
                botonTexto.setColor('#ffffff');  // Regresa a blanco puro
                this.descriptionTitle.setText('');
                this.descriptionText.setText('Selecciona una opción para ver de qué sirve.');
            });

            // Al dar click en cualquier parte de la caja del botón, procesa la mejora y regresa al ring
            zona.on('pointerdown', () => this._procesarEleccionFinal(id));
        });

        // Animación de entrada suave tipo Novela Visual
        this.tweens.add({
            targets: this.contenedorOpciones,
            alpha: 1,
            duration: 300
        });
    }

    /**
     * FASE 3: Guarda la elección, apaga los inputs y regresa de golpe al CombatScene
     */
    _procesarEleccionFinal(buffId) {
        // Desactivamos clics inmediatamente para evitar doble selección (Double-click bug)
        this.opcionesBotones.forEach(btn => btn.disableInteractive());

        // Fundido de salida y desconexión de la escena
        this.tweens.add({
            targets: this.cameras.main,
            alpha: 0,
            duration: 250,
            onComplete: () => {
                // Sincronización maestro-esclavo con el código de Jesús
                this.registry.set('pendingBuff', buffId);
                this.scene.get('CombatScene').events.emit('coach-buff-chosen', buffId);
                
                // Matamos el overlay para reanudar el ring
                this.scene.stop('CoachScene');
            }
        });
    }
}