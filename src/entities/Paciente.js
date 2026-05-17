export class Paciente extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y) {
        super(scene, x, y, 120, 180, 0x224488);
        scene.add.existing(this);

        this.scene = scene;
        this.hp = 150;
        this.maxHp = 150;
        this.damage = 10;
        this.superMeter = 0;
        this.baseY = y;
        this.state = "NEUTRAL";
        this.lastDodgeDirection = "NINGUNA";
        this.critDamage = 0; 
        this.courage = 0;

        this.punchCooldown = false;
        this.punchCooldownMs = 350;
        this.consecutivePunches = 0;
        this.maxConsecutive = 3;
        this.fatigueCooldownMs = 800;
        this.lastPunchTime = 0;

        // ── Duck mantenido ────────────────────────────────────
        this.isDucking = false;

        this.keys = scene.input.keyboard.addKeys({
            left:     Phaser.Input.Keyboard.KeyCodes.LEFT,
            right:    Phaser.Input.Keyboard.KeyCodes.RIGHT,
            down:     Phaser.Input.Keyboard.KeyCodes.DOWN,
            // Q = golpe bajo izq, W = golpe alto izq
            // E = golpe bajo der, R = golpe alto der
            punchBajoIzq:  Phaser.Input.Keyboard.KeyCodes.Q,
            punchAltoIzq:  Phaser.Input.Keyboard.KeyCodes.W,
            punchBajoDer:  Phaser.Input.Keyboard.KeyCodes.E,
            punchAltoDer:  Phaser.Input.Keyboard.KeyCodes.R,
            superKey:      Phaser.Input.Keyboard.KeyCodes.SPACE
        });
    }

    update() {
        // ── Duck mantenido: se agacha mientras ↓ esté presionado ──
        // Solo cubre golpes ALTOS y poder especial
        if (this.keys.down.isDown) {
            if (!this.isDucking && this.state === 'NEUTRAL') {
                this._iniciarAgachado();
            }
        } else {
            if (this.isDucking) {
                this._terminarAgachado();
            }
        }

        if (this.state !== 'NEUTRAL') return;

        const k = this.keys;

        // Esquives laterales
        if (k.left.isDown)        this.executeDodge('IZQUIERDA');
        else if (k.right.isDown)  this.executeDodge('DERECHA');

        // Golpes — Q W E R
        else if (Phaser.Input.Keyboard.JustDown(k.punchBajoIzq)) this.executePunch('BAJO_IZQ', -20, this.baseY - 10);
        else if (Phaser.Input.Keyboard.JustDown(k.punchAltoIzq)) this.executePunch('ALTO_IZQ', -30, this.baseY - 40);
        else if (Phaser.Input.Keyboard.JustDown(k.punchBajoDer)) this.executePunch('BAJO_DER',  20, this.baseY - 10);
        else if (Phaser.Input.Keyboard.JustDown(k.punchAltoDer)) this.executePunch('ALTO_DER',  30, this.baseY - 40);

        // Super
        else if (Phaser.Input.Keyboard.JustDown(k.superKey) && this.superMeter >= 100) this.executeSuperAttack();
    }

    // ── Agachado mantenido ────────────────────────────────────
    _iniciarAgachado() {
        this.isDucking = true;
        this.state = 'AGACHADO';

        this.scene.tweens.add({
            targets: this,
            y: this.baseY + 50,
            scaleY: 0.6,
            duration: 100,
        });
    }

    _terminarAgachado() {
        this.isDucking = false;

        this.scene.tweens.add({
            targets: this,
            y: this.baseY,
            scaleY: 1,
            duration: 100,
            onComplete: () => {
                if (this.state === 'AGACHADO') {
                    this.state = 'NEUTRAL';
                    this.consecutivePunches = 0;
                }
            }
        });
    }

    // ── Golpe ─────────────────────────────────────────────────
    executePunch(tipo, offsetX, targetY) {
        if (this.punchCooldown)         return;
        if (this.scene.nemesis.hp <= 0) return;

        const now = this.scene.time.now;
        const timeSinceLast = now - this.lastPunchTime;

        if (timeSinceLast < 200) {
            this.consecutivePunches++;
        } else {
            this.consecutivePunches = 1;
        }
        this.lastPunchTime = now;

        const cooldownMs = this.consecutivePunches > this.maxConsecutive
            ? this.fatigueCooldownMs
            : this.punchCooldownMs;

        if (this.consecutivePunches > this.maxConsecutive) {
            this._showFatigue();
            this.consecutivePunches = 0;
        }

        this.punchCooldown = true;
        this.state = 'ATACANDO';

        this.scene.procesarGolpeJugador(tipo);

        this.scene.tweens.add({
            targets: this,
            x: (this.scene.sys.game.config.width / 2) + offsetX,
            y: targetY,
            duration: 70,
            yoyo: true,
            onComplete: () => {
                this.x = this.scene.sys.game.config.width / 2;
                this.y = this.baseY;

                if (this.scene.nemesis.hp <= 0) return;

                this.state = 'RECOVERY';
                this.scene.time.delayedCall(cooldownMs, () => {
                    this.punchCooldown = false;
                    this.state = 'NEUTRAL';
                });
            }
        });
    }

    // ── Esquive lateral ───────────────────────────────────────
    executeDodge(direction) {
        this.state = direction === 'IZQUIERDA' ? 'ESQUIVE_IZQ' : 'ESQUIVE_DER';
        this.lastDodgeDirection = direction;

        const offset  = direction === 'IZQUIERDA' ? -60 : 60;
        const centerX = this.scene.sys.game.config.width / 2;

        this.scene.tweens.add({
            targets: this,
            x: centerX + offset,
            duration: 120,
            yoyo: true,
            hold: 80,
            onComplete: () => {
                this.x = centerX;
                this.state = 'NEUTRAL';
                this.consecutivePunches = 0;
            }
        });
    }

    // ── Guardia ───────────────────────────────────────────────
    executeGuard() {
        this.state = 'BLOQUEANDO';
        this.setScale(0.8, 1);
        this.scene.input.keyboard.once('keyup-UP', () => {
            this.setScale(1, 1);
            this.state = 'NEUTRAL';
            this.consecutivePunches = 0;
        });
    }

    // ── Super ─────────────────────────────────────────────────
    executeSuperAttack() {
        this.state = 'ATACANDO';
        this.superMeter = 0;
        this.consecutivePunches = 0;
        this.scene.superBar?.setSize(0, 10);
        this.scene.procesarSuperJugador();
    }

    // ── Recibir daño ──────────────────────────────────────────
    recibirDano(cantidad) {
        const danoFinal = this.state === 'BLOQUEANDO'
            ? Math.floor(cantidad * 0.5)
            : cantidad;

        this.hp = Math.max(0, this.hp - danoFinal);

        this.scene.tweens.add({
            targets: this,
            fillColor: 0xff4444,
            duration: 60,
            yoyo: true,
            onComplete: () => this.setFillStyle(0x224488),
        });

        this.consecutivePunches = 0;
        return danoFinal;
    }

    _showFatigue() {
        this.scene.tweens.add({
            targets: this,
            fillColor: 0xff2222,
            duration: 80,
            yoyo: true,
            repeat: 2,
            onComplete: () => this.setFillStyle(0x224488),
        });
        if (this.scene.infoText) {
            this.scene.infoText.setText('¡Demasiado rápido! Recuperando...');
        }
    }
}