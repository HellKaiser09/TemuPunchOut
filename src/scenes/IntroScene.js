export class IntroScene extends Phaser.Scene {
    constructor() {
        super({ key: 'IntroScene' });
    }

    init() {
        this.dialogIndex = 0;
        this.typing      = false;
        this.fullText    = '';
        this.charIndex   = 0;
        this.typTimer    = null;
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        // ── Fondo sala de espera ──────────────────────────────
        this.add.image(W / 2, H / 2, 'bg_intro').setDisplaySize(W, H);

        // ── Retratos ──────────────────────────────────────────
        // Doctor — lado derecho
        this.drSprite = this.add.image(W * 0.78, H * 0.52, 'dr_intro')
            .setOrigin(0.5)
            .setScale(0.7);

        // Paciente — lado izquierdo, empieza con cara normal
        this.pacienteSprite = this.add.image(W * 0.22, H * 0.62, 'paciente_intro')
            .setOrigin(0.5)
            .setScale(0.7);


            
        // ── Caja de diálogo ───────────────────────────────────
        this.add.rectangle(W / 2, H - 130, W - 80, 200, 0x0d0d1a, 0.96)
            .setStrokeStyle(2, 0xffd700);

        this.speakerLabel = this.add.text(80, H - 220, '', {
            fontFamily: '"Bowlby One SC", sans-serif',
            fontSize: '28px', color: '#ffd700',
        });

        this.dialogText = this.add.text(80, H - 188, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '32px', color: '#f0ede6',
            wordWrap: { width: W - 180 },
            lineSpacing: 6,
        });

        // Indicador avance
        this.prompt = this.add.text(W - 60, H - 60, '▶', {
            fontSize: '28px', color: '#ffd700'
        }).setOrigin(1);

        this.tweens.add({
            targets: this.prompt, alpha: 0,
            duration: 500, yoyo: true, repeat: -1,
        });

        // ── Diálogos ──────────────────────────────────────────
        this.dialogs = [
            { speaker: 'dr',      text: '¿Y dígame... por qué se encuentra aquí hoy?',
              drAlpha: 1, pacAlpha: 0.5, pacTexture: 'paciente_intro' },

            { speaker: 'patient', text: 'Bueno... es que tengo un problema. Soy estudiante de diseño gráfico y me da mucho miedo que cuando me gradúe solo pueda terminar trabajando en una tienda de comida rápida.',
              drAlpha: 0.5, pacAlpha: 1, pacTexture: 'paciente_asustado' },

            { speaker: 'dr',      text: 'Ajá.',
              drAlpha: 1, pacAlpha: 0.5, pacTexture: 'paciente_intro' },

            { speaker: 'dr',      text: '¿Y eso le quita el sueño?',
              drAlpha: 1, pacAlpha: 0.5, pacTexture: 'paciente_intro' },

            { speaker: 'patient', text: 'Sí, bastante.',
              drAlpha: 0.5, pacAlpha: 1, pacTexture: 'paciente_asustado' },

            { speaker: 'dr',      text: 'Perfecto.',
              drAlpha: 1, pacAlpha: 0.5, pacTexture: 'paciente_intro' },

            { speaker: 'patient', text: '¿...Perfecto?',
              drAlpha: 0.5, pacAlpha: 1, pacTexture: 'paciente_asustado' },

            { speaker: 'dr',      text: 'Recuéstese en el sillón. Cierre los ojos.',
              drAlpha: 1, pacAlpha: 0.5, pacTexture: 'paciente_intro' },

            { speaker: 'dr',      text: 'Que empieza... la Terapia de Choque.',
              drAlpha: 1, pacAlpha: 0.5, pacTexture: 'paciente_intro' },

            { speaker: 'patient', text: 'Oiga, doctor... ¿esto es normal? Siento que me estoy—',
              drAlpha: 0.5, pacAlpha: 1, pacTexture: 'paciente_asustado' },
        ];

        // Fade in de entrada
        this.cameras.main.fadeIn(400);
        this._showLine(0);

        // Input
        this.input.keyboard.on('keydown', this._onAdvance, this);
        this.input.on('pointerdown', this._onAdvance, this);
    }

    _showLine(i) {
        if (i >= this.dialogs.length) {
            this._goToTutorial();
            return;
        }

        const d   = this.dialogs[i];
        this.dialogIndex = i;

        // Ilumina el que habla
        this.drSprite.setAlpha(d.drAlpha);
        this.pacienteSprite.setAlpha(d.pacAlpha).setTexture(d.pacTexture);

        // Nombre del speaker
        const nombres = { dr: 'Dr. Proyectado', patient: 'Paciente' };
        this.speakerLabel.setText(nombres[d.speaker] || '');

        // Tipeo animado
        this.fullText  = d.text;
        this.charIndex = 0;
        this.typing    = true;
        this.dialogText.setText('');

        if (this.typTimer) this.typTimer.remove();
        this.typTimer = this.time.addEvent({
            delay: 28,
            repeat: this.fullText.length - 1,
            callback: () => {
                this.charIndex++;
                this.dialogText.setText(this.fullText.substring(0, this.charIndex));
                if (this.charIndex >= this.fullText.length) this.typing = false;
            },
        });
    }

    _onAdvance() {
        if (this.typing) {
            if (this.typTimer) this.typTimer.remove();
            this.dialogText.setText(this.fullText);
            this.typing = false;
            return;
        }
        this._showLine(this.dialogIndex + 1);
    }

    _goToTutorial() {
        // Última línea — el paciente se "duerme", flash blanco y va al tutorial
        this.cameras.main.flash(300, 255, 255, 255);
        this.time.delayedCall(300, () => {
            this.cameras.main.fade(500, 255, 255, 255);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('TutorialScene');
            });
        });
    }
}