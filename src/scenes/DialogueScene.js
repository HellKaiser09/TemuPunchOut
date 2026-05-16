import { DialogueSystem } from '../systems/DialogueSystem.js';

const SPEAKER_CONFIG = {
    dr: {
        name:       'Dr. Proyectado',
        nameColor:  '#ffd700',
        textColor:  '#f0ede6',
        portrait:   'portrait_dr',   // clave del asset (cárgalo en BootScene)
        side:       'left',
    },
    patient: {
        name:       'Paciente',
        nameColor:  '#ffffff',
        textColor:  '#f0ede6',
        portrait:   'portrait_patient',
        side:       'right',
    },
    system: {
        name:       '◈ SISTEMA',
        nameColor:  '#4a9eff',
        textColor:  '#a0c8ff',
        portrait:   null,
        side:       'none',
        mono:       true,            // usa tipografía monospace
    },
    silent: {
        name:       '',
        nameColor:  '#ffffff',
        textColor:  '#888899',
        portrait:   null,
        side:       'none',
        italic:     true,
    },
};

export class DialogueScene extends Phaser.Scene {
    constructor() {
        super({ key: 'DialogueScene' });
    }

    // data = { lines: [...], nextScene: 'CombatScene', nextData: {} }
    init(data) {
        this.lines     = data.lines     || [];
        this.nextScene = data.nextScene || 'CombatScene';
        this.nextData  = data.nextData  || {};
        this.typing    = false;
        this.fullText  = '';
        this.charIndex = 0;
        this.typTimer  = null;
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        // ── Fondo semitransparente (se lanza sobre CombatScene o BootScene) ──
        this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.6);

        // ── Caja de diálogo ──────────────────────────────────────────────────
        const boxH = 130;
        const boxY = H - boxH/2 - 10;

        this.add.rectangle(W/2, boxY, W - 40, boxH, 0x0d0d1a, 0.97)
            .setStrokeStyle(1.5, 0xffd700);

        // ── Retrato ──────────────────────────────────────────────────────────
        this.portraitImg = this.add.image(70, boxY, '__DEFAULT')
            .setVisible(false)
            .setScale(0.45);

        // ── Textos ───────────────────────────────────────────────────────────
        this.speakerText = this.add.text(110, boxY - 48, '', {
            fontSize: '13px', fontFamily: 'monospace',
            color: '#ffd700', fontStyle: 'bold',
        });

        this.bodyText = this.add.text(110, boxY - 28, '', {
            fontSize: '15px', fontFamily: 'sans-serif',
            color: '#f0ede6', wordWrap: { width: W - 180 },
            lineSpacing: 5,
        });

        // ── Indicador de avance ──────────────────────────────────────────────
        this.prompt = this.add.text(W - 30, boxY + boxH/2 - 14, '▶', {
            fontSize: '13px', color: '#ffd700', fontFamily: 'monospace',
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

    _showCurrent() {
        const line = this.dialogSystem.current();
        if (!line) return;

        const cfg = SPEAKER_CONFIG[line.speaker] || SPEAKER_CONFIG.silent;

        if (cfg.portrait && this.textures.exists(cfg.portrait)) {
            this.portraitImg.setTexture(cfg.portrait).setVisible(true);
            this.portraitImg.setX(cfg.side === 'right' ? this.scale.width - 70 : 70);
        } else {
            this.portraitImg.setVisible(false);
        }

        this.speakerText
            .setText(cfg.name)
            .setColor(cfg.nameColor)
            .setFontFamily(cfg.mono ? 'monospace' : 'sans-serif');

        const textX = cfg.portrait && cfg.side === 'left' ? 110 : 30;
        this.bodyText.setX(textX);

        this.fullText  = line.text;
        this.charIndex = 0;
        this.typing    = true;
        this.bodyText.setText('').setColor(cfg.textColor)
            .setFontStyle(cfg.italic ? 'italic' : 'normal');

        if (this.typTimer) this.typTimer.remove();
        this.typTimer = this.time.addEvent({
            delay: 25,
            repeat: this.fullText.length - 1,
            callback: () => {
                this.charIndex++;
                this.bodyText.setText(this.fullText.substring(0, this.charIndex));
                if (this.charIndex >= this.fullText.length) this.typing = false;
            },
        });
    }

    _onAdvance() {
        if (this.typing) {
            if (this.typTimer) this.typTimer.remove();
            this.bodyText.setText(this.fullText);
            this.typing = false;
            return;
        }
        this.dialogSystem.advance(); // avanza; si termina llama onFinish → _finish
        if (!this.dialogSystem.isFinished()) {
            this._showCurrent();
        }
    }

    _finish() {
        this.tweens.add({
            targets: this.cameras.main, alpha: 0, duration: 300,
            onComplete: () => {
                this.scene.stop('DialogueScene');
                this.scene.start(this.nextScene, this.nextData);
            },
        });
    }
}