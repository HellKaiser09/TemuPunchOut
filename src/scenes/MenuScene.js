const FONT_TITULOS = '"Bowlby One SC", Impact, sans-serif';
export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

/* ---------------------------------------------
¿Qué hace?
Dibuja el fondo del menú principal y el personaje. Define un arreglo con las opciones (PLAY, CRÉDITOS, TUTORIAL) y ejecuta un bucle para dibujar los botones en la pantalla alineados a la izquierda.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- La posición del personaje (`W * 0.67, H * 0.54`).
- Las opciones del menú: Puedes agregar un botón nuevo solo añadiendo `{ label: 'NUEVO', action: () => {...} }` al arreglo.
- La posición vertical inicial de los botones (`570`) y su espaciado (`210`).

¿Qué controla?
El punto de partida del jugador y la redirección a las 3 ramas principales del juego (Pelea, Tutorial, Créditos).

Importancia
ALTA. Es la primera interacción real del usuario con tu sistema.
------------------------------------------- */
    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        // 🖼️ ANCLAJE DEL ARTE FINAL
        if (this.textures.exists('bg_menu')) {
            this.add.image(W / 2, H / 2, 'bg_menu').setDisplaySize(W, H);
            this.add.image(W * 0.67, H * 0.54, 'coach_character_menu').setOrigin(0.44);
        } else {
            this.add.rectangle(W / 2, H / 2, W, H, 0x111122); 
        }

        // 🕹️ CONFIGURACIÓN DE OPCIONES
        const opciones = [
            { 
                label: 'PLAY', 
                action: () => {
                    const introLines = [{ speaker: 'system', text: '◈ SESIÓN DE IMPACTO: Prepárate para el Round 1.' }];
                    this.scene.start('DialogueScene', { lines: introLines, nextScene: 'CombatScene' });
                } 
            },
            { label: 'CRÉDITOS', action: () => this._abrirCreditos() },
            { label: 'TUTORIAL', action: () => this.scene.start('TutorialScene') },
        ];

        // Renderizado secuencial de los botones
        opciones.forEach((op, i) => {
            this._menuItem(130, 570 + i * 210, op.label, op.action);
        });
    }

/* ---------------------------------------------
¿Qué hace?
Es una "fábrica de botones" (Factory pattern). Toma unas coordenadas, un texto y una acción, y dibuja la caja invisible, el texto y la banda blanca diagonal que aparece al pasar el ratón (Hover).

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- El tamaño del área donde se puede hacer clic (`buttonW = 520`, `buttonH = 135`).
- El ancho de la banda diagonal blanca (`860` arriba, `790` abajo).
- El margen del texto hacia la derecha (`x + 45`).
- Los colores del hover y del texto (`#16213e`, `#ffffff`).

¿Qué controla?
La estética interactiva de la navegación. 

Importancia
ALTA. Mantiene el código de `create()` limpio al encapsular toda la lógica matemática del botón.
------------------------------------------- */
    _menuItem(x, y, label, onClick) {
        const buttonW = 520;
        const buttonH = 135;

        // 🎨 EL HOVER DEL BOCETO
        const hoverGfx = this.add.graphics();
        hoverGfx.setVisible(false); 

        hoverGfx.fillStyle(0xf0ede6, 1); 
        hoverGfx.beginPath();
        hoverGfx.moveTo(x, y - buttonH / 2);               
        hoverGfx.lineTo(x + 860, y - buttonH / 2);         
        hoverGfx.lineTo(x + 790, y + buttonH / 2);         
        hoverGfx.lineTo(x, y + buttonH / 2);               
        hoverGfx.closePath();
        hoverGfx.fillPath();

        // 📝 TEXTO BASE 
        const texto = this.add.text(x + 45, y, label, { 
            fontFamily: FONT_TITULOS,
            fontSize: '60px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
        }).setOrigin(0, 0.5);

        // 🕹️ ZONA INTERACTIVA INVISIBLE
        const zona = this.add.rectangle(x + buttonW / 2, y, buttonW, buttonH, 0xffffff, 0)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        // --- CONTROL DE EVENTOS DINÁMICOS ---
        zona.on('pointerover', () => {
            hoverGfx.setVisible(true); 
            texto.setColor('#16213e').setStroke('#16213e', 0); 
        });

        zona.on('pointerout', () => {
            hoverGfx.setVisible(false); 
            texto.setColor('#ffffff').setStroke('#000000', 8); 
        });

        zona.on('pointerdown', onClick);
    }

/* ---------------------------------------------
¿Qué hace?
Despliega una pantalla "flotante" (Modal) con un fondo oscuro translúcido. Muestra el título, itera sobre un arreglo de nombres del equipo de desarrollo, pinta sus cargos y agrega un botón para cerrar.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- La opacidad del fondo negro (`0.87`).
- La información del equipo (arreglo `staff`).
- El espacio vertical entre cada integrante (`yBase = 200 + (i * 90)`).
- Las fuentes y colores de "Cargo" y "Nombre".

¿Qué controla?
La visualización de los créditos sin tener que crear una escena completamente nueva en Phaser.

Importancia
MEDIA. Es una pantalla informativa que demuestra un buen manejo de contenedores de UI.
------------------------------------------- */
    _abrirCreditos() {
        const W = this.scale.width;
        const H = this.scale.height;

        // 1. Fondo de aislamiento
        const overlay = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.87).setInteractive();
        const contenedor = this.add.container(0, 0);

        // 2. Título "CRÉDITOS"
        const titulo = this.add.text(110, 80, 'CRÉDITOS', {
            fontFamily: FONT_TITULOS, fontSize: '60px', color: '#ffffff', letterSpacing: 4
        });

        // 3. Lista de nombres y cargos
        const staff = [
            { cargo: 'PROGRAMACIÓN', nombre: 'GERSON SORIA' },
            { cargo: 'PROGRAMACIÓN', nombre: 'JESÚS ORNELAS' },
            { cargo: 'ARTE Y ANIMACIÓN', nombre: 'MARIA RENE' },
            { cargo: 'ARTE Y ANIMACIÓN', nombre: 'DIANA CANTÚ' },
            { cargo: 'ARTE Y ANIMACIÓN', nombre: 'ELIUD ESPINOZA' },
            { cargo: 'MÚSICA Y SFX', nombre: 'MARIA RENE' },
            { cargo: 'DISEÑO DE NIVELES', nombre: 'TODOS' }
        ];

        staff.forEach((persona, i) => {
            const yBase = 200 + (i * 90); 

            const cargoTxt = this.add.text(115, yBase, persona.cargo, {
                fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold', color: '#8a8a9a', letterSpacing: 2
            });

            const nombreTxt = this.add.text(115, yBase + 22, persona.nombre, {
                fontFamily: FONT_TITULOS, fontSize: '28px', color: '#ffffff'
            });

            contenedor.add([cargoTxt, nombreTxt]);
        });

        // 4. Botón de Cerrar
        const btnVolver = this.add.text(W / 2, H - 70, '← VOLVER AL MENÚ', {
            fontFamily: FONT_TITULOS, fontSize: '32px', color: '#ffffff', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        contenedor.add([titulo, btnVolver]);

        // 🔒 Lógica de salida
        const cerrarCreditos = () => {
            // Hacemos que el contenedor se desvanezca suavemente
            this.tweens.add({
                targets: [contenedor, overlay],
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    // Solo destruimos la basura del DOM, NO reiniciamos la escena
                    contenedor.destroy();
                    overlay.destroy();
                }
            });
        };

        btnVolver.on('pointerover', () => btnVolver.setColor('#ffd700'));
        btnVolver.on('pointerout', () => btnVolver.setColor('#ffffff'));
        btnVolver.on('pointerdown', cerrarCreditos);
        overlay.on('pointerdown', cerrarCreditos);

        // Entrada animada
        contenedor.setAlpha(0).setX(-50);
        this.tweens.add({ targets: contenedor, alpha: 1, x: 0, duration: 300, ease: 'Power2.Out' });
    }
}