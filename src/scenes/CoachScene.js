export default class CoachScene extends Phaser.Scene  {
    constructor() {
        super({ key: 'CoachScene' });
    }


    init(data) {
        this.roundData  = data;
        this.selectedId = null;
        this.popup      = null;
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        // Fondo oscuro sobre el combate
        this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.82);

        // Título
        this.add.text(W/2, 120, 'ELIGE TU CONSEJO', {
            fontFamily: '"bowlby-one-sc", Impact, sans-serif',
            fontSize: '80px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 6,
        }).setOrigin(0.5);

        // Frase del coach
        this.add.text(W/2, 230, '"Tengo un consejo para usted antes del siguiente round."', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '32px', color: '#aaaaaa',
            fontStyle: 'italic',
        }).setOrigin(0.5);

        // 4 opciones de buff
        const buffs = Object.values(BUFF_CATALOG);
        const totalW  = buffs.length * 420 + (buffs.length - 1) * 40;
        const startX  = (W - totalW) / 2;

        buffs.forEach((buff, i) => {
            const x = startX + i * 460 + 210;
            const y = H / 2 + 80;
            this._buffItem(x, y, buff);
        });

        // Botón confirmar (desactivado hasta elegir)
        this.confirmarBtn = this.add.text(W/2, H - 140, 'CONFIRMAR', {
            fontFamily: '"bowlby-one-sc", Impact, sans-serif',
            fontSize: '64px', color: '#555555',
        }).setOrigin(0.5);
    }

    _buffItem(x, y, buff) {
        const W_CARD = 400;
        const H_CARD = 300;

        // Fondo de la card
        const fondo = this.add.rectangle(x, y, W_CARD, H_CARD, 0x111122)
            .setStrokeStyle(3, 0x444466);

        // Hover highlight
        const highlight = this.add.rectangle(x, y, W_CARD, H_CARD, 0xffffff, 0)
            .setStrokeStyle(0);

        // Nombre del buff
        const nombre = this.add.text(x, y - 60, buff.name.toUpperCase(), {
            fontFamily: '"bowlby-one-sc", Impact, sans-serif',
            fontSize: '42px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 4,
            align: 'center', wordWrap: { width: W_CARD - 40 },
        }).setOrigin(0.5);

        // Descripción corta
        const desc = this.add.text(x, y + 20, buff.desc, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '26px', color: '#aaaaaa',
            align: 'center', wordWrap: { width: W_CARD - 60 },
            lineSpacing: 6,
        }).setOrigin(0.5);

        // Tag buff/debuff
        const tagColor = buff.type === 'enemy' ? '#dd4444' : '#44bb88';
        this.add.text(x, y + 110, buff.tag.toUpperCase(), {
            fontFamily: '"bowlby-one-sc", Impact, sans-serif',
            fontSize: '22px', color: tagColor,
        }).setOrigin(0.5);

        // Zona interactiva
        const zona = this.add.rectangle(x, y, W_CARD, H_CARD, 0xffffff, 0)
            .setInteractive({ useHandCursor: true });

        zona.on('pointerover', () => {
            this.tweens.add({ targets: highlight, fillAlpha: 0.08, duration: 100 });
            fondo.setStrokeStyle(4, 0xffffff);
            nombre.setColor('#000000');
            highlight.setFillStyle(0xffffff);
            this.tweens.add({ targets: highlight, fillAlpha: 0.12, duration: 100 });

            // Popup descripción
            this._mostrarPopup(x, y - H_CARD/2 - 20, buff);
        });

        zona.on('pointerout', () => {
            fondo.setStrokeStyle(3, 0x444466);
            nombre.setColor('#ffffff');
            this.tweens.add({ targets: highlight, fillAlpha: 0, duration: 100 });
            this._cerrarPopup();
        });

        zona.on('pointerdown', () => {
            this.selectedId = buff.id;
            // Resalta la seleccionada
            fondo.setStrokeStyle(5, 0xffd700);
            nombre.setColor('#ffd700');

            // Activa el botón confirmar
            this.confirmarBtn
                .setColor('#ffffff')
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => this._confirmar())
                .on('pointerover', () => this.confirmarBtn.setColor('#000000').setBackgroundColor('#ffffff'))
                .on('pointerout',  () => this.confirmarBtn.setColor('#ffffff').setBackgroundColor(null));
        });
    }

    _mostrarPopup(x, y, buff) {
        this._cerrarPopup();

        const W_POP = 380;
        const H_POP = 130;

        // Ajusta para que no salga de pantalla
        const px = Phaser.Math.Clamp(x, W_POP/2 + 20, this.scale.width - W_POP/2 - 20);
        const py = Math.max(y - H_POP/2, 60);

        const bg = this.add.rectangle(px, py, W_POP, H_POP, 0x0d0d1a)
            .setStrokeStyle(2, 0xffffff);

        const texto = this.add.text(px, py, `"${buff.coachQuote}"`, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '24px', color: '#dddddd',
            fontStyle: 'italic',
            align: 'center', wordWrap: { width: W_POP - 30 },
            lineSpacing: 5,
        }).setOrigin(0.5);

        this.popup = { bg, texto };
    }

    _cerrarPopup() {
        if (!this.popup) return;
        this.popup.bg.destroy();
        this.popup.texto.destroy();
        this.popup = null;
    }

    _confirmar() {
        if (!this.selectedId) return;
        this._cerrarPopup();

        // Guarda el buff y regresa al combate
        this.registry.set('pendingBuff', this.selectedId);
        this.scene.get('CombatScene').events.emit('coach-buff-chosen', this.selectedId);
        this.scene.stop('CoachScene');
    }
}

// Catálogo inline — o impórtalo desde BuffSystem.js
const BUFF_CATALOG = {
    autoestima:     { id: 'autoestima',    name: 'Autoestima',      type: 'self',  tag: 'buff',   desc: 'Reconoces tu valor. Eso sana.',               coachQuote: 'No necesitas ganar su aprobación.' },
    limites:        { id: 'limites',       name: 'Poner Límites',   type: 'enemy', tag: 'debuff', desc: 'Defines lo que no tolerarás.',                 coachQuote: 'Un "no" dicho a tiempo vale más que mil disculpas.' },
    vulnerabilidad: { id: 'vulnerabilidad',name: 'Vulnerabilidad',  type: 'self',  tag: 'buff',   desc: 'Mostrar tus heridas es fuerza, no debilidad.', coachQuote: 'Mostrar tus cicatrices no te hace débil.' },
    perdonarte:     { id: 'perdonarte',    name: 'Perdonarte',      type: 'self',  tag: 'buff',   desc: 'Sueltas el peso que cargabas.',                coachQuote: 'El perdón no es para ellos. Es para ti.' },
};