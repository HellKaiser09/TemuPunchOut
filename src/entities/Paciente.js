export class Paciente extends Phaser.GameObjects.Rectangle {
/* ---------------------------------------------
¿Qué hace?
Inicializa la entidad lógica del jugador en el ring. Define sus estadísticas (HP, medidor de Súper), las variables de control de fatiga/combo por spam de golpes, los estados de movimiento y mapea todas las teclas del teclado (QWER, Flechas, Espacio).

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- Vida inicial (`hp` y `maxHp` a 150).
- Daño base (`damage: 10`).
- Tiempos de reacción: velocidad normal entre golpes (`punchCooldownMs: 350`) y el castigo por fatiga si spamea (`fatigueCooldownMs: 800`).
- El límite de golpes permitidos seguidos antes de cansarse (`maxConsecutive: 3`).

¿Qué controla?
El setup lógico del jugador y los disparadores de comandos (Input mapping).

Importancia
CRÍTICA. Es la raíz de la jugabilidad del usuario; sin esto, el jugador no se mueve ni responde.
------------------------------------------- */
    constructor(scene, x, y) {
        super(scene, x, y, 120, 180, 0x224488);
        scene.add.existing(this);

        this.scene = scene;
        this.hp = 100;
        this.maxHp = 100;
        this.damage = 8;
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
        this.lastPunchType = null; // 🥊 Rastrear tipo de golpe para sprite visual

        // ── Duck mantenido ────────────────────────────────────
        this.isDucking = false;

        this.keys = scene.input.keyboard.addKeys({
            left:     Phaser.Input.Keyboard.KeyCodes.LEFT,
            right:    Phaser.Input.Keyboard.KeyCodes.RIGHT,
            down:     Phaser.Input.Keyboard.KeyCodes.DOWN,
            up:       Phaser.Input.Keyboard.KeyCodes.UP,
            punchBajoIzq:  Phaser.Input.Keyboard.KeyCodes.Q,
            punchAltoIzq:  Phaser.Input.Keyboard.KeyCodes.W,
            punchBajoDer:  Phaser.Input.Keyboard.KeyCodes.E,
            punchAltoDer:  Phaser.Input.Keyboard.KeyCodes.R,
            superKey:      Phaser.Input.Keyboard.KeyCodes.SPACE
        });
    }

/* ---------------------------------------------
¿Qué hace?
Es el motor síncrono que corre a 60 FPS. Escucha continuamente el teclado. Si mantienes presionado ABAJO, te agacha; si estás en estado NEUTRAL, evalúa si presionaste las flechas laterales para esquivar, las teclas QWER para tirar jabs/ganchos, o ESPACIO para desatar el Súper.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
Los desfases (offsets) a los que se dirige el puño al atacar en cada uno de los `executePunch` (ej. `this.baseY - 40` para golpes altos).

¿Qué controla?
La lectura en tiempo real de las acciones del jugador en cada fotograma del juego.

Importancia
CRÍTICA. Es el detector de reflejos del juego. Si se detiene, el jugador queda congelado.
------------------------------------------- */
    update() {
        // ── Duck mantenido: se agacha mientras ↓ esté presionado ──
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
        if (k.left.isDown)         this.executeDodge('IZQUIERDA');
        else if (k.right.isDown)  this.executeDodge('DERECHA');
        else if (k.up.isDown)     this.executeGuard();

        // Golpes — Q W E R
        else if (Phaser.Input.Keyboard.JustDown(k.punchBajoIzq)) this.executePunch('BAJO_IZQ', -20, this.baseY - 10);
        else if (Phaser.Input.Keyboard.JustDown(k.punchAltoIzq)) this.executePunch('ALTO_IZQ', -30, this.baseY - 40);
        else if (Phaser.Input.Keyboard.JustDown(k.punchBajoDer)) this.executePunch('BAJO_DER',  20, this.baseY - 10);
        else if (Phaser.Input.Keyboard.JustDown(k.punchAltoDer)) this.executePunch('ALTO_DER',  30, this.baseY - 40);

        // Super
        else if (Phaser.Input.Keyboard.JustDown(k.superKey) && this.superMeter >= 100) this.executeSuperAttack();
    }

/* ---------------------------------------------
¿Qué hace? (MÉTODOS DE AGACHADO)
- `_iniciarAgachado`: Altera el estado a 'AGACHADO', deprime el objeto en Y y lo encoge verticalmente a un 60% (`scaleY: 0.6`).
- `_terminarAgachado`: Restaura la escala original del jugador y devuelve el estado a 'NEUTRAL'.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- La velocidad de la agachada (`duration: 100` ms).
- El factor de encogimiento visual (`scaleY: 0.6` -> bajarlo más te encoge más).
- Cuántos píxeles baja el cuerpo (`this.baseY + 50`).

¿Qué controla?
La evasión segura frente a los ataques altos o poderes especiales del Némesis.

Importancia
ALTA. Es la única defensa efectiva contra el ataque del letrero giratorio.
------------------------------------------- */
    _iniciarAgachado() {
        this.isDucking = true;
        this.state = 'AGACHADO';

        this.scene.tweens.add({
            targets: this, y: this.baseY + 50, scaleY: 0.6, duration: 100,
        });
    }

    _terminarAgachado() {
        this.isDucking = false;

        this.scene.tweens.add({
            targets: this, y: this.baseY, scaleY: 1, duration: 100,
            onComplete: () => {
                if (this.state === 'AGACHADO') {
                    this.state = 'NEUTRAL';
                    this.consecutivePunches = 0;
                }
            }
        });
    }

/* ---------------------------------------------
¿Qué hace?
Procesa la lógica de ataque del jugador. Mide el tiempo entre clics para calcular combos; si detecta spam desmedido (más de 3 golpes ultra veloces), activa el castigo de fatiga. Genera un efecto de embate (lunge forward) usando un tween y envía el golpe a `CombatScene`.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- El límite de tiempo para considerar que un golpe es combo (`200` ms).
- La velocidad del viaje del puño hacia el rival (`duration: 70` ms).

¿Qué controla?
La ofensiva del jugador, el control de abuso de botones (Anti-button-mash) y los frames de recuperación del Paciente.

Importancia
CRÍTICA. Es el núcleo de ataque del gameplay loop.
------------------------------------------- */
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
        this.lastPunchType = tipo; // 🥊 Guardar tipo de golpe para el sprite visual

        this.scene.procesarGolpeJugador(tipo);

        this.scene.tweens.add({
            targets: this,
            x: (this.scene.sys.game.config.width / 2) + offsetX, y: targetY,
            duration: 70, yoyo: true,
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

/* ---------------------------------------------
¿Qué hace?
Mueve lateralmente al jugador hacia la izquierda o derecha por un instante corto con un efecto de espera (`hold`), permitiendo esquivar los ganchos de la hamburguesa.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- La distancia del paso lateral (`offset = 60` píxeles).
- La duración total del esquive (`duration: 120`) y el tiempo que se queda plantado a un lado (`hold: 80`).

¿Qué controla?
La evasión de ataques laterales del contrincante.

Importancia
ALTA. Es fundamental para conseguir ventanas de contraataque ("¡AHORA!").
------------------------------------------- */
    executeDodge(direction) {
        this.state = direction === 'IZQUIERDA' ? 'ESQUIVE_IZQ' : 'ESQUIVE_DER';
        this.lastDodgeDirection = direction;

        const offset  = direction === 'IZQUIERDA' ? -60 : 60;
        const centerX = this.scene.sys.game.config.width / 2;

        this.scene.tweens.add({
            targets: this, x: centerX + offset, duration: 120, yoyo: true, hold: 80,
            onComplete: () => {
                this.x = centerX;
                this.state = 'NEUTRAL';
                this.consecutivePunches = 0;
            }
        });
    }

/* ---------------------------------------------
¿Qué hace? (MÉTODOS DE GUARDIA Y SÚPER)
- `executeGuard`: Cambia el estado a bloqueando y achica el ancho horizontal. Espera a que se suelte la tecla para volver a la normalidad.
- `executeSuperAttack`: Restablece el medidor, limpia los combos y activa el golpe destructivo en la escena de pelea.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- La escala de la guardia (`setScale(0.8, 1)` -> se hace más angosto para simular cubrirse con los guantes).

¿Qué controla?
Las mecánicas avanzadas de protección pasiva y recompensa definitiva.

Importancia
ALTA. Son los mitigadores y finalizadores del ring.
------------------------------------------- */
    executeGuard() {
        this.state = 'BLOQUEANDO';
        this.setScale(0.8, 1);
        this.scene.input.keyboard.once('keyup-UP', () => {
            this.setScale(1, 1);
            this.state = 'NEUTRAL';
            this.consecutivePunches = 0;
        });
    }

    executeSuperAttack() {
        this.state = 'ATACANDO';
        this.superMeter = 0;
        this.consecutivePunches = 0;
        this.scene.superBar?.setSize(0, 10);
        this.scene.procesarSuperJugador();
    }

/* ---------------------------------------------
¿Qué hace? (DAÑO Y HELPERS VISUALES)
- `recibirDano`: Sustrae vida. Si el estado es 'BLOQUEANDO', reduce el daño al 50%. Lanza un destello rojo.
- `_showFatigue`: Muestra un feedback rojo intermitente cuando el jugador atacó muy rápido de forma desordenada.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- El porcentaje de mitigación de la guardia (`cantidad * 0.5` -> un 50% de reducción).
- El color del daño (`0xff4444` rojo brillante) o fatiga (`0xff2222`).

¿Qué controla?
Los sistemas de penalización de salud e interactividad tardía por cansancio.

Importancia
CRÍTICA. Dictamina las condiciones de supervivencia del jugador.
------------------------------------------- */
    recibirDano(cantidad) {
        const danoFinal = this.state === 'BLOQUEANDO'
            ? Math.floor(cantidad * 0.5)
            : cantidad;

        this.hp = Math.max(0, this.hp - danoFinal);

        this.scene.tweens.add({
            targets: this, fillColor: 0xff4444, duration: 60, yoyo: true,
            onComplete: () => this.setFillStyle(0x224488),
        });

        this.consecutivePunches = 0;
        return danoFinal;
    }

    _showFatigue() {
        this.scene.tweens.add({
            targets: this, fillColor: 0xff2222, duration: 80, yoyo: true, repeat: 2,
            onComplete: () => this.setFillStyle(0x224488),
        });
        if (this.scene.infoText) {
            this.scene.infoText.setText('¡Demasiado rápido! Recuperando...');
        }
    }
}