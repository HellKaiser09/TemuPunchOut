export class TutorialScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TutorialScene' });
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        // Fondo del ring (mismo que el combate)
        this.add.image(W / 2, H / 2, 'fondo_pelea').setDisplaySize(W, H);

        this.cameras.main.fadeIn(400);

        const tutorialLines = [
            { speaker: 'system', text: 'Estás dentro de tu propio miedo.' },
            { speaker: 'system', text: 'No te preocupes. Es solo un sueño.' },
            { speaker: 'system', text: '(Más o menos.)' },
            { speaker: 'system', text: '[Q] Golpe bajo izq.   [W] Golpe alto izq.\n[E] Golpe bajo der.   [R] Golpe alto der.' },
            { speaker: 'system', text: '[←] [→] Esquivar a los lados\n[↓]  Agacharse (mantén presionado)' },
            { speaker: 'system', text: 'Tu oponente representa algo que te ha estado quitando el sueño.' },
            { speaker: 'system', text: 'Aunque literalmente tiene forma de combo #3.' },
        ];

        // Caja de diálogo estilo sistema
        this.add.rectangle(W / 2, H / 2, W * 0.7, 280, 0x0d0d1a, 0.96)
            .setStrokeStyle(2, 0x4a9eff);

        this.sysLabel = this.add.text(W / 2, H / 2 - 100, '◈ SISTEMA', {
            fontFamily: 'monospace',
            fontSize: '22px', color: '#4a9eff',
            letterSpacing: 3,
        }).setOrigin(0.5);

        this.sysText = this.add.text(W / 2, H / 2 - 30, '', {
            fontFamily: 'monospace',
            fontSize: '28px', color: '#a0c8ff',
            align: 'center',
            wordWrap: { width: W * 0.62 },
            lineSpacing: 8,
        }).setOrigin(0.5, 0);

        this.prompt = this.add.text(W / 2, H / 2 + 110, '[ PRESIONA CUALQUIER TECLA ]', {
            fontFamily: 'monospace',
            fontSize: '20px', color: '#4a9eff',
        }).setOrigin(0.5);

        this.tweens.add({
            targets: this.prompt, alpha: 0,
            duration: 600, yoyo: true, repeat: -1,
        });

        // Estado
        this.lines    = tutorialLines;
        this.index    = 0;
        this.typing   = false;
        this.fullText = '';
        this.charIdx  = 0;
        this.typTimer = null;

        this._showLine(0);

        this.input.keyboard.on('keydown', this._onAdvance, this);
        this.input.on('pointerdown', this._onAdvance, this);
    }

    _showLine(i) {
        if (i >= this.lines.length) {
            this._irACombate();
            return;
        }
        this.index    = i;
        this.fullText = this.lines[i].text;
        this.charIdx  = 0;
        this.typing   = true;
        this.sysText.setText('');

        if (this.typTimer) this.typTimer.remove();
        this.typTimer = this.time.addEvent({
            delay: 30,
            repeat: this.fullText.length - 1,
            callback: () => {
                this.charIdx++;
                this.sysText.setText(this.fullText.substring(0, this.charIdx));
                if (this.charIdx >= this.fullText.length) this.typing = false;
            },
        });
    }

    _onAdvance() {
        if (this.typing) {
            if (this.typTimer) this.typTimer.remove();
            this.sysText.setText(this.fullText);
            this.typing = false;
            return;
        }
        this._showLine(this.index + 1);
    }

    _irACombate() {
    this.cameras.main.fade(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
        // Primero inicia CombatScene
        this.scene.start('CombatScene');
        
        // Espera un frame para que CombatScene termine su create()
        // y luego emite show-enemy
        // Si viene del tutorial, muestra los sprites después de un momento
this.time.delayedCall(300, () => {
    this.enemigo.setVisible(true);
    this.jugador.setVisible(true);
});
    
    });
}
}