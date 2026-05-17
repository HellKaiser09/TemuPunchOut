// src/scenes/CoachScene.js
import { BUFF_CATALOG } from '../systems/BuffSystem.js';

export class CoachScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CoachScene' });
    }

/* ---------------------------------------------
¿Qué hace?
Recibe la información del round actual y limpia la lista de botones.

¿Qué podemos cambiar (tamaños, espaciados, etc.)?
Nada gráfico, solo la estructura de datos que se recibe en `roundData`.

¿Qué controla?
La preparación lógica antes del renderizado.

Importancia
MEDIA. Prepara la escena para saber a qué round regresar.
------------------------------------------- */
    init(roundData) {
        this.roundData = roundData;
        this.opcionesBotones = []; 
    }

/* ---------------------------------------------
¿Qué hace?
Configura el fondo, dibuja al Coach, genera la textura optimizada en caché y llama a pintar la interfaz.

¿Qué podemos cambiar (tamaños, espaciados, etc.)?
- Escala del Coach (`setScale(1.22)`).
- Opacidad de la cortina negra (`0.35`).

¿Qué controla?
El punto de entrada del flujo visual de la escena.

Importancia
ALTA. Arranca todos los procesos visuales de la elección.
------------------------------------------- */
    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        // 1. Fondos y Personaje
        this.add.image(W / 2, H / 2, 'bg_menu_tutorial').setDisplaySize(W, H);
        this.add.rectangle(0, 0, W, H, 0x000000, 0.35).setOrigin(0);
        this.add.image(W * 0.53, H * 0.50, 'coach_eleccion').setOrigin(0.4).setScale(1.22);

        this.contenedorOpciones = this.add.container(0, 0).setAlpha(0);

        // 🔥 OPTIMIZACIÓN: Pre-calculamos la figura del botón una sola vez
        this._generarTexturaHover();

        // 2. Pintar Interfaz
        this._desplegarListaOpciones(W, H);
    }

/* ---------------------------------------------
¿Qué hace?
[NUEVO] Dibuja la forma diagonal del botón "en memoria" (sin mostrarla), le toma una "foto" y la guarda como una textura reutilizable llamada 'hover_textura'.

¿Qué podemos cambiar (tamaños, espaciados, etc.)?
- Las medidas geométricas del botón (720 de ancho, 95 de alto).
- Los colores (`0xf0ede6` para la caja, `0xd85a30` para la línea).

¿Qué controla?
La eficiencia de la memoria gráfica. En vez de calcular 4 formas complejas cada vez, Phaser solo estampará una imagen 4 veces.

Importancia
ALTA PARA RENDIMIENTO. Esto evita la caída de FPS al interactuar con menús.
------------------------------------------- */
    _generarTexturaHover() {
        const buttonH = 95;
        const buttonW = 720;
        
        // Usamos make.graphics para dibujarlo en la nada (no en la pantalla)
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        
        // Figura diagonal blanca
        gfx.fillStyle(0xf0ede6, 1);
        gfx.beginPath();
        gfx.moveTo(0, 0);               
        gfx.lineTo(670, 0);         
        gfx.lineTo(720, buttonH);         
        gfx.lineTo(0, buttonH);               
        gfx.closePath();
        gfx.fillPath();

        // Línea roja inferior
        gfx.lineStyle(6, 0xd85a30, 1);
        gfx.beginPath();
        gfx.moveTo(0, buttonH + 3);
        gfx.lineTo(720, buttonH + 3);
        gfx.strokePath();

        // Guardamos la figura como una textura reutilizable
        gfx.generateTexture('hover_textura', buttonW, buttonH + 6);
    }

/* ---------------------------------------------
¿Qué hace?
[REFACTORIZADO] Crea el título y el panel de información lateral. Ahora, en lugar de dibujar los botones aquí, delega esa tarea a una función más pequeña con un bucle `forEach`.

¿Qué podemos cambiar (tamaños, espaciados, etc.)?
- Las posiciones del panel derecho (`panelX`, `panelY`, `panelW`, `panelH`).

¿Qué controla?
El maquetado global de la interfaz de opciones.

Importancia
ALTA. Es la base del menú del Coach.
------------------------------------------- */
    _desplegarListaOpciones(W, H) {
        // Título
        const tituloSeccion = this.add.text(110, 100, 'ELECCIÓN DE APOYO', {
            fontFamily: 'monospace', fontSize: '60px', fontStyle: 'bold', color: '#7ed7ff', letterSpacing: 2
        });
        this.contenedorOpciones.add(tituloSeccion);

        // Panel de descripción (Derecha)
        const panelX = W - 440;
        const panelY = 130;
        const panelW = 360;
        const panelH = 380;
        
        const infoBg = this.add.rectangle(panelX, panelY, panelW, panelH, 0x081019, 0.95).setOrigin(0).setStrokeStyle(2, 0x4f8bd8);
        const infoTitle = this.add.text(panelX + 30, panelY + 30, 'PASA EL CURSOR', {
            fontFamily: 'monospace', fontSize: '26px', fontStyle: 'bold', color: '#9ad7ff', wordWrap: { width: panelW - 60 }
        }).setOrigin(0, 0);
        const infoSub = this.add.text(panelX + 30, panelY + 76, 'para ver la descripción', {
            fontFamily: 'sans-serif', fontSize: '18px', color: '#cfd8ff', wordWrap: { width: panelW - 60 }
        }).setOrigin(0, 0);
        
        this.descriptionTitle = this.add.text(panelX + 30, panelY + 130, '', {
            fontFamily: 'sans-serif', fontSize: '28px', fontStyle: 'bold', color: '#ffffff', wordWrap: { width: panelW - 60 }
        }).setOrigin(0, 0);
        this.descriptionText = this.add.text(panelX + 30, panelY + 180, 'Selecciona una opción para ver de qué sirve.', {
            fontFamily: 'sans-serif', fontSize: '22px', color: '#dfe7ff', wordWrap: { width: panelW - 60 }, lineSpacing: 8
        }).setOrigin(0, 0);
        
        this.contenedorOpciones.add([infoBg, infoTitle, infoSub, this.descriptionTitle, this.descriptionText]);

        // Delegamos la creación individual de botones
        const buffIds = Object.keys(BUFF_CATALOG);
        buffIds.forEach((id, i) => {
            const yBase = 360 + (i * 150); 
            this._crearBotonMejora(id, BUFF_CATALOG[id], 110, yBase);
        });

        this.tweens.add({ targets: this.contenedorOpciones, alpha: 1, duration: 300 });
    }

/* ---------------------------------------------
¿Qué hace?
[NUEVA] Crea un botón individual interactivo usando la textura optimizada y le asigna sus eventos de ratón (hover/click).

¿Qué podemos cambiar (tamaños, espaciados, etc.)?
- El ancho de la zona interactiva (`buttonW = 680`).
- La posición interna del texto (`x + 40`).

¿Qué controla?
La interactividad y comportamiento de cada opción de mejora.

Importancia
ALTA. Cumple el Principio de Responsabilidad Única y mantiene el código modular.
------------------------------------------- */
    _crearBotonMejora(id, buff, x, yBase) {
        const buttonW = 680;
        const buttonH = 95;

        // 🔥 OPTIMIZACIÓN APLICADA: Ahora solo usamos una "imagen" en lugar de trazar gráficos
        const hoverBg = this.add.image(x, yBase, 'hover_textura')
            .setOrigin(0, 0.5)
            .setVisible(false);

        const botonTexto = this.add.text(x + 40, yBase, buff.name.toUpperCase(), {
            fontFamily: '"Bowlby One SC", sans-serif', fontSize: '60px', color: '#ffffff'
        }).setOrigin(0, 0.5);

        this.contenedorOpciones.add([hoverBg, botonTexto]);

        // Zona interactiva invisible
        const zona = this.add.rectangle(x + buttonW / 2, yBase, buttonW, buttonH, 0xffffff, 0)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        
        this.contenedorOpciones.add(zona);
        this.opcionesBotones.push(zona);

        // Lógica de interacción
        zona.on('pointerover', () => {
            hoverBg.setVisible(true); 
            botonTexto.setColor('#16213e'); 
            this.descriptionTitle.setText(`${buff.name.toUpperCase()}`);
            this.descriptionText.setText(buff.desc);
        });

        zona.on('pointerout', () => {
            hoverBg.setVisible(false); 
            botonTexto.setColor('#ffffff');  
            this.descriptionTitle.setText('');
            this.descriptionText.setText('Selecciona una opción para ver de qué sirve.');
        });

        zona.on('pointerdown', () => this._procesarEleccionFinal(id));
    }

/* ---------------------------------------------
¿Qué hace?
Desactiva los clics (para evitar bugs de doble selección), aplica la mejora en el registro y realiza el enrutamiento correcto hacia el combate.

¿Qué podemos cambiar (tamaños, espaciados, etc.)?
El tiempo de la transición (`duration: 250`).

¿Qué controla?
La finalización segura de la escena y la comunicación con `CombatScene`.

Importancia
CRÍTICA. Es la puerta de regreso a los golpes.
------------------------------------------- */
    _procesarEleccionFinal(buffId) {
        this.opcionesBotones.forEach(btn => btn.disableInteractive());

        this.tweens.add({
            targets: this.cameras.main,
            alpha: 0,
            duration: 250,
            onComplete: () => {
                this.registry.set('pendingBuff', buffId);
                // 🔥 ENRUTAMIENTO CORREGIDO: Usamos scene.start en vez de eventos
                this.scene.start('CombatScene', this.roundData); 
            }
        });
    }
}