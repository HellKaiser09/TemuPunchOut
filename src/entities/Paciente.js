export class Paciente extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y) {
        super(scene, x, y, 120, 180, 0x224488);
        scene.add.existing(this);

        this.scene = scene;
        this.hp = 150;
        this.maxHp = 150;
        this.superMeter = 0;
        this.baseY = y;
        this.state = "NEUTRAL";
        this.lastDodgeDirection = "NINGUNA";

        // ── Anti-spam ────────────────────────────────────────
        this.punchCooldown = false;       // bloquea el siguiente golpe
        this.punchCooldownMs = 350;       // ms entre golpes (ajusta a gusto)
        this.consecutivePunches = 0;      // contador de golpes seguidos
        this.maxConsecutive = 3;          // máx golpes antes de forzar pausa
        this.fatigueCooldownMs = 800;     // pausa si se excede el máx

        // ── Ventana de golpe (parry window) ──────────────────
        this.lastPunchTime = 0;           // para medir ritmo

        this.keys = scene.input.keyboard.addKeys({
            left:     Phaser.Input.Keyboard.KeyCodes.LEFT,
            right:    Phaser.Input.Keyboard.KeyCodes.RIGHT,
            up:       Phaser.Input.Keyboard.KeyCodes.UP,
            down:     Phaser.Input.Keyboard.KeyCodes.DOWN,
            punchLH:  Phaser.Input.Keyboard.KeyCodes.A,
            punchRH:  Phaser.Input.Keyboard.KeyCodes.S,
            punchLL:  Phaser.Input.Keyboard.KeyCodes.Z,
            punchRL:  Phaser.Input.Keyboard.KeyCodes.X,
            superKey: Phaser.Input.Keyboard.KeyCodes.SPACE
        });
    }

    update() {
        if (this.state !== "NEUTRAL") return; // un solo punto de entrada

        const k = this.keys;

        // Esquives y guardia
        if (k.left.isDown)       this.executeDodge("IZQUIERDA");
        else if (k.right.isDown) this.executeDodge("DERECHA");
        else if (k.down.isDown)  this.executeDuck();
        else if (k.up.isDown)    this.executeGuard();

        // Golpes — JustDown evita que mantener la tecla cuente
        else if (Phaser.Input.Keyboard.JustDown(k.punchLH)) this.executePunch('ALTO_IZQ', -30, this.baseY - 40);
        else if (Phaser.Input.Keyboard.JustDown(k.punchRH)) this.executePunch('ALTO_DER',  30, this.baseY - 40);
        else if (Phaser.Input.Keyboard.JustDown(k.punchLL)) this.executePunch('BAJO_IZQ', -20, this.baseY - 10);
        else if (Phaser.Input.Keyboard.JustDown(k.punchRL)) this.executePunch('BAJO_DER',  20, this.baseY - 10);

        // Super
        else if (Phaser.Input.Keyboard.JustDown(k.superKey) && this.superMeter >= 100) this.executeSuperAttack();
    }

    // ── GOLPE ────────────────────────────────────────────────
    executePunch(tipo, offsetX, targetY) {
        // Bloqueos de seguridad
        if (this.punchCooldown)          return;
        if (this.scene.nemesis.hp <= 0)  return;

        // ── Fatiga: demasiados golpes seguidos = pausa forzada ──
        const now = this.scene.time.now;
        const timeSinceLast = now - this.lastPunchTime;

        // Si golpean muy rápido (< 200ms entre golpes), cuenta como spam
        if (timeSinceLast < 200) {
            this.consecutivePunches++;
        } else {
            this.consecutivePunches = 1; // resetea si hubo pausa natural
        }

        this.lastPunchTime = now;

        // Si excedió el máximo consecutivo, aplica fatiga
        const cooldownMs = this.consecutivePunches > this.maxConsecutive
            ? this.fatigueCooldownMs
            : this.punchCooldownMs;

        if (this.consecutivePunches > this.maxConsecutive) {
            this._showFatigue();
            this.consecutivePunches = 0;
        }

        // Activa cooldown
        this.punchCooldown = true;
        this.state = 'ATACANDO';

        // Notifica a la escena
        this.scene.procesarGolpeJugador(tipo);

        // Animación del golpe
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

                // Recovery + cooldown
                this.state = 'RECOVERY';
                this.scene.time.delayedCall(cooldownMs, () => {
                    this.punchCooldown = false;
                    this.state = 'NEUTRAL';
                });
            }
        });
    }

    // ── Feedback visual de fatiga ─────────────────────────────
    _showFatigue() {
        // Parpadeo rojo para indicar que el jugador se pasó de golpes
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

    // ── ESQUIVE ───────────────────────────────────────────────
    executeDodge(direction) {
        this.state = direction === "IZQUIERDA" ? "ESQUIVE_IZQ" : "ESQUIVE_DER";
        this.lastDodgeDirection = direction;

        const offset = direction === "IZQUIERDA" ? -60 : 60;
        const centerX = this.scene.sys.game.config.width / 2;

        this.scene.tweens.add({
            targets: this,
            x: centerX + offset,
            duration: 120,
            yoyo: true,
            hold: 80,
            onComplete: () => {
                this.x = centerX;
                this.state = "NEUTRAL";
                // Esquivar resetea el contador de spam (fue intencional)
                this.consecutivePunches = 0;
            }
        });
    }

    // ── AGACHARSE ─────────────────────────────────────────────
    executeDuck() {
        this.state = 'AGACHADO';
        this.scene.tweens.add({
            targets: this,
            y: this.baseY + 50,
            scaleY: 0.6,
            duration: 100,
            yoyo: true,
            hold: 100,
            onComplete: () => {
                this.y = this.baseY;
                this.setScale(1, 1);
                this.state = 'NEUTRAL';
                this.consecutivePunches = 0; // agacharse también resetea
            }
        });
    }

    // ── GUARDIA ───────────────────────────────────────────────
    executeGuard() {
        this.state = 'BLOQUEANDO';
        this.setScale(0.8, 1);
        this.scene.input.keyboard.once('keyup-UP', () => {
            this.setScale(1, 1);
            this.state = 'NEUTRAL';
            this.consecutivePunches = 0; // guardia también resetea
        });
    }

    // ── SUPER ─────────────────────────────────────────────────
    executeSuperAttack() {
        this.state = 'ATACANDO';
        this.superMeter = 0;
        this.consecutivePunches = 0;
        this.scene.superBar?.setSize(0, 10);
        this.scene.procesarSuperJugador();
    }

    // ── Recibir daño ──────────────────────────────────────────
    recibirDano(cantidad) {
        // La guardia reduce el daño a la mitad
        const danoFinal = this.state === 'BLOQUEANDO'
            ? Math.floor(cantidad * 0.5)
            : cantidad;

        this.hp = Math.max(0, this.hp - danoFinal);

        // Feedback visual
        this.scene.tweens.add({
            targets: this,
            fillColor: 0xff4444,
            duration: 60,
            yoyo: true,
            onComplete: () => this.setFillStyle(0x224488),
        });

        // Interrumpe el combo si te golpean
        this.consecutivePunches = 0;

        return danoFinal;
    }
}