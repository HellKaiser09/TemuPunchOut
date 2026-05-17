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
    this.lines         = data.lines          || [];
    this.nextScene     = data.nextScene      || 'CombatScene';
    this.nextData      = data.nextData       || {};
    this.onFinishEvent = data.onFinishEvent  || null;
    this.typing        = false;
    this.fullText      = '';
    this.charIndex     = 0;
    this.typTimer      = null;
}


    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        // ── Fondo semitransparente (se lanza sobre CombatScene o BootScene) ──
        this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.6);

        // ── Caja de diálogo ──────────────────────────────────────────────────
        const boxH = 220;
        const boxY = H - boxH/2 - 10;

        this.add.rectangle(W/2, boxY, W - 40, boxH, 0x0d0d1a, 0.97)
            .setStrokeStyle(1.5, 0xffd700);

        // ── Retrato ──────────────────────────────────────────────────────────
        this.portraitImg = this.add.image(70, boxY, '__DEFAULT')
            .setVisible(false)
            .setScale(0.45);

        // ── Textos ───────────────────────────────────────────────────────────
        this.speakerText = this.add.text(110, boxY - 58, '', {
            fontSize: '40px', fontFamily: 'monospace',
            color: '#ffd700', fontStyle: 'bold',
        });

        const bodyWidth = W - 180;
        this.bodyHeight = boxH - 70;
        this.bodyText = this.add.text(110, boxY - 38, '', {
            fontSize: '44px', fontFamily: 'sans-serif',
            color: '#f0ede6', wordWrap: { width: bodyWidth },
            lineSpacing: 6,
        });

        this.measureText = this.add.text(0, 0, '', {
            fontSize: '44px', fontFamily: 'sans-serif',
            wordWrap: { width: bodyWidth },
            lineSpacing: 6,
        }).setVisible(false);

        // ── Indicador de avance ──────────────────────────────────────────────
        this.prompt = this.add.text(W - 30, boxY + boxH/2 - 10, '▶', {
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
        this.pages     = this._paginateText(this.fullText, cfg);
        this.pageIndex = 0;
        this._currentConfig = cfg;
        this._showPage(cfg);
    }

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

    _paginateText(text, cfg) {
        const pages = [];
        const words = text.split(' ');
        let pageText = '';

        const measure = (value) => {
            this.measureText.setText(value);
            return this.measureText.height <= this.bodyHeight;
        };

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const candidate = pageText ? `${pageText} ${word}` : word;

            if (measure(candidate)) {
                pageText = candidate;
                continue;
            }

            if (!pageText) {
                let partial = '';
                for (const char of word) {
                    const nextText = partial + char;
                    if (!measure(nextText)) break;
                    partial = nextText;
                }
                if (partial) {
                    pages.push(partial);
                    const remainder = word.slice(partial.length);
                    words[i] = remainder;
                    pageText = '';
                    i--;
                    continue;
                }
            }

            pages.push(pageText);
            pageText = word;
        }

        if (pageText) pages.push(pageText);
        return pages.length ? pages : [text];
    }

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

        this.dialogSystem.advance(); // avanza; si termina llama onFinish → _finish
        if (!this.dialogSystem.isFinished()) {
            this._showCurrent();
        }
    }

    _finish() {
    this.tweens.add({
        targets: this.cameras.main, alpha: 0, duration: 300,
        onComplete: () => {
            // Emite el evento a CombatScene si se configuró uno
            if (this.onFinishEvent) {
                const combatScene = this.scene.get('CombatScene');
                if (combatScene) combatScene.events.emit(this.onFinishEvent);
            }
            this.scene.stop('DialogueScene');
        },
    });
}

}