export class Nemesis extends Phaser.GameObjects.Rectangle {
/* ---------------------------------------------
¿Qué hace?
Crea la entidad lógica del enemigo. Establece sus estadísticas base (vida, daño), su estado inicial, su catálogo de movimientos y arranca un temporizador (Timer) infinito que será el "cerebro" que decida cuándo atacar.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- La vida (`hp` y `maxHp`).
- El daño base (`damage`).
- El tiempo entre ataques del Timer (`delay: 4500` = 4.5 segundos). Si bajas este número, el enemigo atacará más rápido.

¿Qué controla?
La inicialización de la Inteligencia Artificial en el ring.

Importancia
CRÍTICA. Define qué tan fuerte y rápido es tu jefe final.
------------------------------------------- */
    constructor(scene, x, y) {
        super(scene, x, y, 300, 150, 0x882222);
        scene.add.existing(this);

        this.scene    = scene;
        this.hp       = 100;
        this.maxHp    = 100;
        this.damage   = 10;
        this.state    = "IDLE";
        this.baseX    = x;
        this.baseY    = y;

        // ── Invulnerabilidad ──────────────────────────────────
        this.invulnerable = false;

        // ── Catálogo de ataques ───────────────────────────────
        this.ataques = ['IZQUIERDA', 'DERECHA', 'ARRIBA', 'ESPECIAL'];
        this.ultimoAtaque = null; 

        // ── Objetos reutilizables para atacarEspecial() ────────
        const W = scene.sys.game.config.width;
        this.letreroEspecial = scene.add.rectangle(-100, scene.sys.game.config.height / 2, 160, 50, 0xffcc00);
        this.letreroEspecialTexto = scene.add.text(this.letreroEspecial.x, this.letreroEspecial.y, '¡COMIDA RÁPIDA!', { fontSize: '13px', color: '#000', fontFamily: 'monospace' }).setOrigin(0.5);
        this.letreroEspecial.setVisible(false);
        this.letreroEspecialTexto.setVisible(false);

        // ── Timer principal ───────────────────────────────────
        this.attackTimer = scene.time.addEvent({
            delay: 4500,
            callback: this.elegirAtaque,
            callbackScope: this,
            loop: true
        });
    }

/* ---------------------------------------------
¿Qué hace?
Es la toma de decisiones de la IA. Revisa la lista de ataques, filtra el último que usó (para no repetir y ser predecible), elige uno al azar y ejecuta la función correspondiente.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
Puedes alterar las probabilidades. Actualmente todos tienen la misma posibilidad, pero podrías hacer que el ataque 'ESPECIAL' solo ocurra si su HP es menor a 50.

¿Qué controla?
El azar y la variedad del combate.

Importancia
ALTA. Evita que el jugador memorice un patrón exacto.
------------------------------------------- */
    elegirAtaque() {
        if (this.state !== 'IDLE' || this.hp <= 0) return;

        const opciones = this.ataques.filter(a => a !== this.ultimoAtaque);
        const elegido  = Phaser.Utils.Array.GetRandom(opciones);
        this.ultimoAtaque = elegido;

        console.log(`[Nemesis] elegirAtaque -> opciones: ${JSON.stringify(opciones)}, elegido: ${elegido}`);

        switch (elegido) {
            case 'IZQUIERDA': this.atacarLateral('IZQUIERDA'); break;
            case 'DERECHA':   this.atacarLateral('DERECHA');   break;
            case 'ARRIBA':    this.atacarArriba();              break;
            case 'ESPECIAL':  this.atacarEspecial();            break;
        }
    }

/* ---------------------------------------------
¿Qué hace?
Ejecuta la animación lógica de un gancho lateral. Tiene 3 fases: Preparación (se asoma), Ataque (se lanza e inflige daño) y Recovery (regresa a su posición dejando una ventana para que el jugador lo golpee).

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- La distancia a la que se asoma (`offsetX * 0.3`).
- Los tiempos de reacción: `duration: 400` para asomarse y `1500` ms de espera antes de soltar el golpe. 

¿Qué controla?
El telégrafo visual (la advertencia) para que el jugador tenga tiempo de esquivar.

Importancia
ALTA. Es el ataque principal del juego.
------------------------------------------- */
    atacarLateral(direccion) {
        this.state        = 'CARGANDO';
        this.invulnerable = true;

        const offsetX = direccion === 'IZQUIERDA' ? -90 : 90;

        console.log(`[Nemesis] atacarLateral -> direccion: ${direccion}, offsetX: ${offsetX}`);

        console.log(`[Nemesis] atacarLateral -> direccion: ${direccion}, offsetX: ${offsetX}`);

        // Fase 1: PREPARAR 
        this.scene.events.emit('nemesis-preparar', direccion);
        this._mostrarAlerta(`⚠ Golpe ${direccion}`, 1400);

        this.scene.tweens.add({
            targets: this, x: this.baseX + offsetX * 0.3, duration: 400, ease: 'Sine.InOut',
        });

        // Fase 2: DURANTE 
        this.scene.time.delayedCall(1500, () => {
            this.state = 'ATACANDO';
            console.log(`[Nemesis] emitir evento 'nemesis-atacar' -> ${direccion}`);
            this.scene.events.emit('nemesis-atacar', direccion);

            this.scene.tweens.add({
                targets: this, x: this.baseX + offsetX, duration: 120, ease: 'Power3',
                onComplete: () => {
                    this.scene.procesarGolpeNemesis({ tipo: 'LATERAL', direccion });
                    // Fase 3: RECOVERY 
                    this._iniciarRecovery(500);
                }
            });
        });
    }

/* ---------------------------------------------
¿Qué hace?
Sube al enemigo en el eje Y para avisar que atacará por arriba, y luego lo baja rápidamente para golpear.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
Las posiciones `y: this.baseY - 60` (cuánto sube para avisar) y `y: this.baseY + 30` (cuánto baja al golpear).

¿Qué controla?
La obligación del jugador de usar la tecla de agacharse.

Importancia
MEDIA. Agrega verticalidad al combate.
------------------------------------------- */
    atacarArriba() {
        this.state        = 'CARGANDO';
        this.invulnerable = true;

        this.scene.events.emit('nemesis-preparar', 'ARRIBA');
        this._mostrarAlerta('⚠ ¡Golpe alto! Agáchate', 1400);

        this.scene.tweens.add({ targets: this, y: this.baseY - 60, duration: 500, ease: 'Back.Out' });

        this.scene.time.delayedCall(1500, () => {
            this.state = 'ATACANDO';
            this.scene.events.emit('nemesis-atacar', 'ARRIBA');

            this.scene.tweens.add({
                targets: this, y: this.baseY + 30, duration: 110, ease: 'Power3',
                onComplete: () => {
                    this.scene.procesarGolpeNemesis({ tipo: 'ARRIBA' });
                    this.scene.tweens.add({
                        targets: this, y: this.baseY, duration: 200, ease: 'Sine.Out',
                        onComplete: () => this._iniciarRecovery(500),
                    });
                }
            });
        });
    }

/* ---------------------------------------------
¿Qué hace?
El ataque final. Hace temblar al enemigo, genera un objeto nuevo (el letrero de "COMIDA RÁPIDA"), lo hace cruzar la pantalla y programa un temporizador (ticks) que castiga al jugador si no está agachado mientras el letrero vuela.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- El daño por tick (`dano: 8`).
- El tamaño del letrero (`160, 50`) y su color (`0xffcc00`).
- La velocidad a la que cruza (`duration: 3000` ms).

¿Qué controla?
El evento más peligroso del juego, que exige que el jugador mantenga una postura prolongada.

Importancia
ALTA. Es el "Ultimate" del jefe.
------------------------------------------- */
    atacarEspecial() {
        this.state        = 'CARGANDO';
        this.invulnerable = true;
        const W = this.scene.sys.game.config.width;

        this.scene.events.emit('nemesis-preparar', 'ESPECIAL');
        this._mostrarAlerta('⚠ ¡PODER ESPECIAL! ¡Agáchate y no te muevas!', 1200);

        this.scene.tweens.add({ targets: this, x: this.baseX + 15, duration: 80, yoyo: true, repeat: 4 });

        this.scene.time.delayedCall(1300, () => {
            this.state = 'ATACANDO';
            this.scene.events.emit('nemesis-atacar', 'ESPECIAL');

            let ticksDano = 0;
            this.specialCheckEvent = this.scene.time.addEvent({
                delay: 200, repeat: 14,
                callback: () => {
                    const paciente = this.scene.paciente;
                    if (!paciente) return;

                    const estaAgachado = paciente.state === 'AGACHADO';
                    if (!estaAgachado) {
                        this.scene.procesarGolpeNemesis({ tipo: 'ESPECIAL', dano: 8 });
                        ticksDano++;
                    }
                },
                callbackScope: this,
                onComplete: () => {
                    this._iniciarRecovery(700);
                }
            });

            // Respaldo adicional para evitar que la animación se quede atascada.
            this.scene.time.delayedCall(3000, () => {
                if (this.state === 'ATACANDO') {
                    this._iniciarRecovery(700);
                }
            });
        });
    }

/* ---------------------------------------------
¿Qué hace?
Abre la ventana de vulnerabilidad del enemigo. Quita el seguro (`invulnerable = false`), avisa al jugador y regresa al enemigo a su centro.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
El tiempo que se queda mareado esperando el golpe (`duracionMs`). 

¿Qué controla?
La recompensa del jugador por haber esquivado correctamente.

Importancia
ALTA. Si esto no se ejecuta, el jefe sería invencible.
------------------------------------------- */
    _iniciarRecovery(duracionMs) {
    this.state        = 'RECOVERY';
    this.invulnerable = false;

    this.scene.events.emit('nemesis-recovery');
    this._mostrarAlerta('¡AHORA! Golpéalo', duracionMs - 50);

    this.scene.tweens.add({
        targets: this,
        x: this.baseX,
        y: this.baseY,
        duration: 200,
        ease: 'Sine.Out',
    });

    this.scene.time.delayedCall(duracionMs, () => {
        this.state = 'IDLE';
        this.scene.events.emit('nemesis-idle');
        this.scene.events.emit('nemesis-fin-recovery'); // ← nuevo
        if (this.scene.alertText) this.scene.alertText.setText('');
    });
}
    // ══════════════════════════════════════════════════════════
    //  RECIBIR DAÑO
    // ══════════════════════════════════════════════════════════
    recibirDano(cantidad) {
        if (this.invulnerable) {
            this._feedbackInvulnerable();
            return 0;
        }

        this.hp = Math.max(0, this.hp - cantidad);

        this.scene.tweens.add({
            targets: this, fillColor: 0xffffff, duration: 60, yoyo: true,
            onComplete: () => { if (this.hp > 0) this.setFillStyle(0x882222); }
        });

        if (this.state === 'RECOVERY') {
            this.attackTimer.reset({ delay: 4500, callback: this.elegirAtaque, callbackScope: this, loop: true });
        }

        return cantidad;
    }

/* ---------------------------------------------
¿Qué hace? (MÉTODOS AUXILIARES)
- puedeSerGolpeado: Evalúa lógicamente si el jugador está autorizado para hacerle daño en este instante.
- _mostrarAlerta / _feedbackInvulnerable: Manejan los textos dinámicos de UI para avisar al jugador de un error o peligro.
------------------------------------------- */
    puedeSerGolpeado(tipoPunch) {
        if (this.invulnerable) return false;
        if (this.state === 'IDLE' || this.state === 'CARGANDO') return false;
        return true; 
    }

    _mostrarAlerta(mensaje, duracionMs) {
        if (!this.scene.alertText) return;
        this.scene.alertText.setText(mensaje);
        if (duracionMs) {
            this.scene.time.delayedCall(duracionMs, () => {
                if (this.scene.alertText) this.scene.alertText.setText('');
            });
        }
    }

    _feedbackInvulnerable() {
        this.scene.tweens.add({ targets: this, fillColor: 0xffdd00, duration: 60, yoyo: true });
        if (this.scene.infoText) {
            this.scene.infoText.setText('¡Está cargando, espera!');
            this.scene.time.delayedCall(600, () => {
                this.scene.infoText.setText('Estado: NEUTRAL');
            });
        }
    }
}