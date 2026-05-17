export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        // 🖼️ ANCLAJE DEL ARTE FINAL: Renderiza el fondo centrado y adaptado al tamaño del lienzo
        if (this.textures.exists('bg_menu')) {
            this.add.image(W / 2, H / 2, 'bg_menu').setDisplaySize(W, H);
            this.add.image(W * 0.67, H * 0.54, 'coach_character_menu').setOrigin(0.44);
        } else {
            // Respado elegante por si el asset no se ha cargado en BootScene
            this.add.rectangle(W / 2, H / 2, W, H, 0x111122); 
        }

        // 🕹️ CONFIGURACIÓN DE OPCIONES (Líneas de intro añadidas para evitar congelamientos)
        const opciones = [
            { 
                label: 'PLAY', 
                action: () => {
                    // Guion mínimo de bienvenida para alimentar la DialogueScene de forma segura
                    const introLines = [{ speaker: 'system', text: '◈ SESIÓN DE IMPACTO: Prepárate para el Round 1.' }];
                    this.scene.start('DialogueScene', { lines: introLines, nextScene: 'CombatScene' });
                } 
            },
            { label: 'CRÉDITOS', action: () => this._abrirCreditos() },
            { label: 'TUTORIAL', action: () => this.scene.start('TutorialScene') },
        ];

        // Renderizado secuencial de los botones alineados a la izquierda del ring
        opciones.forEach((op, i) => {
            // Bajamos la escala del espaciado (i * 90) para que entren limpio abajo del logo
            this._menuItem(130, 570 + i * 210, op.label, op.action);
        });
    }

    /**
     * Constructor modular de botones interactivos para el menú.
     */
    _menuItem(x, y, label, onClick) {
        const buttonW = 520;
        const buttonH = 135;

        // 🎨 EL HOVER DEL BOCETO (Banda blanca slanteada + línea roja inferior)
        const hoverGfx = this.add.graphics();
        hoverGfx.setVisible(false); // Oculto por defecto

        // 1. Dibujar el bloque de fondo blanco diagonal
        hoverGfx.fillStyle(0xf0ede6, 1); // Off-white limpio
        hoverGfx.beginPath();
        hoverGfx.moveTo(x, y - buttonH / 2);               // Esquina Top-Left
        hoverGfx.lineTo(x + 860, y - buttonH / 2);         // Esquina Top-Right (más larga)
        hoverGfx.lineTo(x + 790, y + buttonH / 2);         // Esquina Bottom-Right (corta, hace la diagonal)
        hoverGfx.lineTo(x, y + buttonH / 2);               // Esquina Bottom-Left
        hoverGfx.closePath();
        hoverGfx.fillPath();

        // 📝 TEXTO BASE (Blanco con borde negro)
        const texto = this.add.text(x + 45, y, label, { // x + 45 da el margen/padding del boceto
            fontFamily: '"Bowlby One SC", Impact, sans-serif',
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
            hoverGfx.setVisible(true); // Mostramos la banda del boceto
            texto.setColor('#16213e')  // Cambia a azul marino oscuro (Igual al fondo del panel)
                 .setStroke('#16213e', 0); // Quitamos el borde negro para que se vea plano y limpio
        });

        zona.on('pointerout', () => {
            hoverGfx.setVisible(false); // Ocultamos la banda
            texto.setColor('#ffffff')   // Regresa a blanco
                 .setStroke('#000000', 8); // Recupera el borde negro original
        });

        zona.on('pointerdown', onClick);
    }

    /**
     * Despliega la ventana modal con los nombres de los integrantes del equipo.
     */
    _abrirCreditos() {
        const W = this.scale.width;
        const H = this.scale.height;

        // 1. Fondo de aislamiento (Negro profundo)
        const overlay = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.87)
            .setInteractive();

        // Contenedor para mover todo el bloque de texto junto
        const contenedor = this.add.container(0, 0);

        // 2. Título "CRÉDITOS" (Alineado arriba a la izquierda según el boceto)
        const titulo = this.add.text(110, 80, 'CRÉDITOS', {
            fontFamily: '"Bowlby One SC", sans-serif',
            fontSize: '60px',
            color: '#ffffff',
            letterSpacing: 4
        });

        // 3. Lista de nombres y cargos (Nombres genéricos con cargos)
        const staff = [
            { cargo: 'PROGRAMACIÓN', nombre: 'GERSON SORIA' },
            { cargo: 'PROGRAMACIÓN', nombre: 'JESÚS ORNELAS' },
            { cargo: 'ARTE Y ANIMACIÓN', nombre: 'MARIA RENE' },
            { cargo: 'ARTE Y ANIMACIÓN', nombre: 'DIANA CANTÚ' },
            { cargo: 'ARTE Y ANIMACIÓN', nombre: 'ELIUD ESPINOZA' },
            { cargo: 'MÚSICA Y SFX', nombre: 'MARIA RENE' },
            { cargo: 'DISEÑO DE NIVELES', nombre: 'TODOS' }
        ];

        // Renderizamos cada par Cargo/Nombre
        staff.forEach((persona, i) => {
            const yBase = 200 + (i * 90); // Espaciado vertical entre bloques

            // Cargo (Texto pequeño y minimalista arriba del nombre)
            const cargoTxt = this.add.text(115, yBase, persona.cargo, {
                fontFamily: 'monospace',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#8a8a9a', // Gris suave
                letterSpacing: 2
            });

            // Nombre (Texto grande igual al boceto)
            const nombreTxt = this.add.text(115, yBase + 22, persona.nombre, {
                fontFamily: '"Bowlby One SC", sans-serif',
                fontSize: '28px',
                color: '#ffffff'
            });

            contenedor.add([cargoTxt, nombreTxt]);
        });

        // 4. Botón de Cerrar (Minimalista abajo)
        const btnVolver = this.add.text(W / 2, H - 70, '← VOLVER AL MENÚ', {
            fontFamily: '"Bowlby One SC", Impact, sans-serif',
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        // Agregar elementos restantes al contenedor
        contenedor.add([titulo, btnVolver]);

        // 🔒 Lógica de salida
        const cerrarCreditos = () => {
            this.cameras.main.fade(200, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                contenedor.destroy();
                overlay.destroy();
                this.scene.start('MenuScene');
            });
        };

        btnVolver.on('pointerover', () => btnVolver.setColor('#ffd700'));
        btnVolver.on('pointerout', () => btnVolver.setColor('#ffffff'));
        btnVolver.on('pointerdown', cerrarCreditos);
        overlay.on('pointerdown', cerrarCreditos); // Cerrar al tocar cualquier parte

        // Entrada animada suave (Slide desde la izquierda)
        contenedor.setAlpha(0).setX(-50);
        this.tweens.add({
            targets: contenedor,
            alpha: 1,
            x: 0,
            duration: 300,
            ease: 'Power2.Out'
        });
    }
}