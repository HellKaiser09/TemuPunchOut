export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        if (this.textures.exists('bg_menu')) {
            this.add.image(W / 2, H / 2, 'bg_menu').setDisplaySize(W, H);
            this.add.image(W * 0.67, H * 0.54, 'coach_character_menu').setOrigin(0.44);
        } else {
            this.add.rectangle(W / 2, H / 2, W, H, 0x111122);
        }

        const introLines = [
            { speaker: 'dr',      text: '¿Y dígame... por qué se encuentra aquí hoy?' },
            { speaker: 'patient', text: 'Bueno... es que tengo un problema. Soy estudiante de diseño gráfico y me da mucho miedo que cuando me gradúe solo pueda terminar trabajando en una tienda de comida rápida.' },
            { speaker: 'dr',      text: 'Ajá.' },
            { speaker: 'dr',      text: '¿Y eso le quita el sueño?' },
            { speaker: 'patient', text: 'Sí, bastante.' },
            { speaker: 'dr',      text: 'Perfecto.' },
            { speaker: 'patient', text: '¿...Perfecto?' },
            { speaker: 'dr',      text: 'Recuéstese en el sillón. Cierre los ojos.' },
            { speaker: 'dr',      text: 'Que empieza... la Terapia de Choque.' },
            { speaker: 'patient', text: 'Oiga, doctor... ¿esto es normal? Siento que me estoy—' },
        ];

        const opciones = [
            {
                
    label: 'PLAY',
    action: () => {
        this.cameras.main.fade(400, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('IntroScene');
        });
    }
},
            
            { label: 'CRÉDITOS', action: () => this._abrirCreditos() },
            { label: 'TUTORIAL', action: () => this.scene.start('TutorialScene') },
        ];

        opciones.forEach((op, i) => {
            this._menuItem(130, 570 + i * 210, op.label, op.action);
        });
    }

    _menuItem(x, y, label, onClick) {
        const buttonW = 520;
        const buttonH = 135;

        const hoverGfx = this.add.graphics();
        hoverGfx.setVisible(false);

        hoverGfx.fillStyle(0xf0ede6, 1);
        hoverGfx.beginPath();
        hoverGfx.moveTo(x,       y - buttonH / 2);
        hoverGfx.lineTo(x + 860, y - buttonH / 2);
        hoverGfx.lineTo(x + 790, y + buttonH / 2);
        hoverGfx.lineTo(x,       y + buttonH / 2);
        hoverGfx.closePath();
        hoverGfx.fillPath();

        const texto = this.add.text(x + 45, y, label, {
            fontFamily: '"Bowlby One SC", Impact, sans-serif',
            fontSize: '60px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
        }).setOrigin(0, 0.5);

        const zona = this.add.rectangle(x + buttonW / 2, y, buttonW, buttonH, 0xffffff, 0)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

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

    _abrirCreditos() {
        const W = this.scale.width;
        const H = this.scale.height;

        const overlay = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.87)
            .setInteractive();

        const contenedor = this.add.container(0, 0);

        const titulo = this.add.text(110, 80, 'CRÉDITOS', {
            fontFamily: '"Bowlby One SC", sans-serif',
            fontSize: '60px',
            color: '#ffffff',
            letterSpacing: 4
        });

        const staff = [
            { cargo: 'PROGRAMACIÓN',      nombre: 'GERSON SORIA'   },
            { cargo: 'PROGRAMACIÓN',      nombre: 'JESÚS ORNELAS'  },
            { cargo: 'ARTE Y ANIMACIÓN',  nombre: 'MARIA RENE'     },
            { cargo: 'ARTE Y ANIMACIÓN',  nombre: 'DIANA CANTÚ'    },
            { cargo: 'ARTE Y ANIMACIÓN',  nombre: 'ELIUD ESPINOZA' },
            { cargo: 'MÚSICA Y SFX',      nombre: 'MARIA RENE'     },
            { cargo: 'DISEÑO DE NIVELES', nombre: 'TODOS'          },
        ];

        staff.forEach((persona, i) => {
            const yBase = 200 + i * 90;

            const cargoTxt = this.add.text(115, yBase, persona.cargo, {
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#8a8a9a',
                letterSpacing: 2
            });

            const nombreTxt = this.add.text(115, yBase + 22, persona.nombre, {
                fontFamily: '"Bowlby One SC", sans-serif',
                fontSize: '28px',
                color: '#ffffff'
            });

            contenedor.add([cargoTxt, nombreTxt]);
        });

        const btnVolver = this.add.text(W / 2, H - 70, '← VOLVER AL MENÚ', {
            fontFamily: '"Bowlby One SC", Impact, sans-serif',
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        contenedor.add([titulo, btnVolver]);

        const cerrarCreditos = () => {
            this.cameras.main.fade(200, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                contenedor.destroy();
                overlay.destroy();
                this.scene.start('MenuScene');
            });
        };

        btnVolver.on('pointerover', () => btnVolver.setColor('#ffd700'));
        btnVolver.on('pointerout',  () => btnVolver.setColor('#ffffff'));
        btnVolver.on('pointerdown', cerrarCreditos);
        overlay.on('pointerdown',   cerrarCreditos);

        contenedor.setAlpha(0).setX(-50);
        this.tweens.add({
            targets: contenedor,
            alpha: 1, x: 0,
            duration: 300, ease: 'Power2.Out'
        });
    }
}