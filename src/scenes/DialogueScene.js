// src/scenes/DialogueScene.js
export class DialogueScene extends Phaser.Scene {
    constructor() {
        super({ key: 'DialogueScene' });
    }

    init(data) {
        this.lines = data.lines || [];
        this.nextScene = data.nextScene || 'CombatScene';
        this.nextData = data.nextData || {};
        
        // Variables para el HUD superior (Vidas reales)
        this.playerHp = data.playerHp ?? 150;
        this.playerMaxHp = data.playerMaxHp ?? 150;
        this.nemesisHp = data.nemesisHp ?? 100;
        this.nemesisMaxHp = data.nemesisMaxHp ?? 100;
        
        // Flag: Si es true, al terminar el diálogo pasaremos a CoachScene
        this.mostrarMenuCoach = data.mostrarMenuCoach || false;

        this.currentIndex = 0;
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        // 1. 🖼️ FONDO
        this.add.image(W / 2, H / 2, 'fondo_pelea').setDisplaySize(W, H);

        // 2. 🍔 PERSONAJES (CORREGIDOS)
        // Paciente a la izquierda, Coach y Némesis a la derecha
        this.chars = {
            paciente: this.add.sprite(W * 0.20, H, 'paciente_idle').setOrigin(0.5, 1).setScale(1.1).setAlpha(0.6),
            coach: this.add.sprite(W * 0.80, H, 'coach_eleccion').setOrigin(0.5, 1).setScale(0.9).setAlpha(0).setVisible(false),
            nemesis: this.add.sprite(W * 0.80, H + 20, 'hamburguesa_golpe_izq', 0).setOrigin(0.5, 1).setScale(0.35).setAlpha(0.6)
        };

        // 3. 💬 CAJA DE DIÁLOGO
        const boxW = 850;
        const boxH = 130;
        const graphics = this.add.graphics();
        graphics.fillStyle(0xffffff, 1);
        graphics.fillRoundedRect((W - boxW) / 2, H - 160, boxW, boxH, 40);

        this.speakerText = this.add.text((W - boxW) / 2 + 40, H - 195, '', {
            fontFamily: '"Bowlby One SC", sans-serif', fontSize: '28px', color: '#ffd700', stroke: '#000', strokeThickness: 6
        });
        
        this.dialogueText = this.add.text((W - boxW) / 2 + 50, H - 135, '', {
            fontFamily: 'sans-serif', fontSize: '22px', color: '#000', wordWrap: { width: boxW - 100 }
        });

        // 5. 🖱️ INTERACCIÓN
        this.input.on('pointerdown', () => this._avanzarDialogo());
        this._mostrarLinea();
        
        this.cameras.main.fadeIn(300, 0, 0, 0);
    }

    _resaltarHablante(speaker) {
        Object.values(this.chars).forEach(c => {
            this.tweens.add({ targets: c, alpha: 0.5, duration: 200 });
        });

        let charActivo = null;
        if (speaker === 'patient') charActivo = this.chars.paciente;
        if (speaker === 'dr' || speaker === 'coach') {
            this.chars.nemesis.setVisible(false);
            charActivo = this.chars.coach;
        } else if (speaker === 'nemesis') {
            this.chars.coach.setVisible(false);
            charActivo = this.chars.nemesis;
        }

        if (charActivo) {
            charActivo.setVisible(true);
            this.tweens.add({ targets: charActivo, alpha: 1, duration: 200 });
        }
    }

    _mostrarLinea() {
        const linea = this.lines[this.currentIndex];
        this._resaltarHablante(linea.speaker);
        
        let nombreMostrado = '';
        switch (linea.speaker) {
            case 'patient': nombreMostrado = 'PACIENTE'; break;
            case 'dr': nombreMostrado = 'DR. PROYECTADO'; break;
            case 'nemesis': nombreMostrado = 'NÉMESIS'; break;
            case 'system': nombreMostrado = 'SISTEMA'; break;
            default: nombreMostrado = linea.speaker.toUpperCase();
        }

        this.speakerText.setText(nombreMostrado);
        this.dialogueText.setText(linea.text);
    }

    _avanzarDialogo() {
        this.currentIndex++;
        if (this.currentIndex < this.lines.length) {
            this._mostrarLinea();
        } else {
            this.input.enabled = false;
            this.cameras.main.fade(400, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                
                // 🔥 ENRUTAMIENTO: Aquí está la magia que pedías
                if (this.mostrarMenuCoach) {
                    // Si el flag está activo, saltamos a TU CoachScene original
                    this.scene.start('CoachScene', this.nextData);
                } else {
                    // Si no, vamos a donde diga nextScene (CombatScene o EndScene)
                    this.scene.start(this.nextScene, this.nextData);
                }

            });
        }
    }
}