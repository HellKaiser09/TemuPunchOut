export class Nemesis extends Phaser.GameObjects.Rectangle {
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
        this.ultimoAtaque = null; // evita repetir el mismo dos veces seguidas

        // ── Timer principal ───────────────────────────────────
        this.attackTimer = scene.time.addEvent({
            delay: 4500,
            callback: this.elegirAtaque,
            callbackScope: this,
            loop: true
        });
    }

    // ── ELIGE ATAQUE (no repite el mismo dos veces) ───────────
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

    // ══════════════════════════════════════════════════════════
    //  ATAQUE LATERAL (izquierda / derecha)
    //  Jugador debe esquivar al lado contrario
    // ══════════════════════════════════════════════════════════
    atacarLateral(direccion) {
        this.state        = 'CARGANDO';
        this.invulnerable = true;

        const offsetX = direccion === 'IZQUIERDA' ? -90 : 90;

        console.log(`[Nemesis] atacarLateral -> direccion: ${direccion}, offsetX: ${offsetX}`);

        // ── Fase 1: PREPARAR (animación ya existente) ─────────
        this.scene.events.emit('nemesis-preparar', direccion);
        this._mostrarAlerta(`⚠ Golpe ${direccion}`, 1400);

        // Movimiento de preparación — se inclina hacia el lado
        this.scene.tweens.add({
            targets: this,
            x: this.baseX + offsetX * 0.3,  // se asoma un poco
            duration: 400,
            ease: 'Sine.InOut',
        });

        // ── Fase 2: DURANTE — el golpe sale ───────────────────
        this.scene.time.delayedCall(1500, () => {
            this.state = 'ATACANDO';
            console.log(`[Nemesis] emitir evento 'nemesis-atacar' -> ${direccion}`);
            this.scene.events.emit('nemesis-atacar', direccion);

            this.scene.tweens.add({
                targets: this,
                x: this.baseX + offsetX,
                duration: 120,
                ease: 'Power3',
                onComplete: () => {
                    this.scene.procesarGolpeNemesis({ tipo: 'LATERAL', direccion });

                    // ── Fase 3: RECOVERY — ventana de castigo ─
                    this._iniciarRecovery(500);
                }
            });
        });
    }

    // ══════════════════════════════════════════════════════════
    //  ATAQUE ARRIBA
    //  Jugador debe agacharse (↓)
    // ══════════════════════════════════════════════════════════
    atacarArriba() {
        this.state        = 'CARGANDO';
        this.invulnerable = true;

        // ── Fase 1: PREPARAR — sube antes de golpear ─────────
        this.scene.events.emit('nemesis-preparar', 'ARRIBA');
        this._mostrarAlerta('⚠ ¡Golpe alto! Agáchate', 1400);

        this.scene.tweens.add({
            targets: this,
            y: this.baseY - 60,           // sube visiblemente
            duration: 500,
            ease: 'Back.Out',
        });

        // ── Fase 2: DURANTE — baja de golpe ──────────────────
        this.scene.time.delayedCall(1500, () => {
            this.state = 'ATACANDO';
            this.scene.events.emit('nemesis-atacar', 'ARRIBA');

            this.scene.tweens.add({
                targets: this,
                y: this.baseY + 30,       // golpea hacia abajo
                duration: 110,
                ease: 'Power3',
                onComplete: () => {
                    this.scene.procesarGolpeNemesis({ tipo: 'ARRIBA' });

                    // Regresa a posición base
                    this.scene.tweens.add({
                        targets: this,
                        y: this.baseY,
                        duration: 200,
                        ease: 'Sine.Out',
                        onComplete: () => this._iniciarRecovery(500),
                    });
                }
            });
        });
    }

    // ══════════════════════════════════════════════════════════
    //  ATAQUE ESPECIAL — letrero giratorio
    //  Jugador debe mantenerse agachado 3 segundos
    //  Si no está abajo cuando el letrero pasa, recibe daño
    // ══════════════════════════════════════════════════════════
    atacarEspecial() {
        this.state        = 'CARGANDO';
        this.invulnerable = true;

        const W = this.scene.sys.game.config.width;

        // ── Fase 1: PREPARAR — el Nemesis hace la animación ──
        this.scene.events.emit('nemesis-preparar', 'ESPECIAL');
        this._mostrarAlerta('⚠ ¡PODER ESPECIAL! ¡Agáchate y no te muevas!', 1200);

        // Se sacude antes de lanzar
        this.scene.tweens.add({
            targets: this,
            x: this.baseX + 15,
            duration: 80,
            yoyo: true,
            repeat: 4,
        });

        this.scene.time.delayedCall(1300, () => {
            this.state = 'ATACANDO';
            this.scene.events.emit('nemesis-atacar', 'ESPECIAL');

            // Verificación continua durante los 3 segundos
            // Cada 200ms revisa si el jugador está agachado
            let ticksDano = 0;
            this.specialCheckEvent = this.scene.time.addEvent({
                delay: 200,
                repeat: 14,                        // 14 × 200ms = ~3 seg
                callback: () => {
                    const paciente = this.scene.paciente;
                    if (!paciente) return;

                    const estaAgachado = paciente.state === 'AGACHADO';

                    if (!estaAgachado) {
                        // Recibe daño por tick — no mata de un golpe
                        this.scene.procesarGolpeNemesis({
                            tipo: 'ESPECIAL',
                            dano: 8,               // daño por cada tick sin agacharse
                        });
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

    // ══════════════════════════════════════════════════════════
    //  RECOVERY — ventana donde SÍ se puede golpear
    // ══════════════════════════════════════════════════════════
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

        // Flash de impacto
        this.scene.tweens.add({
            targets: this,
            fillColor: 0xffffff,
            duration: 60,
            yoyo: true,
            onComplete: () => { if (this.hp > 0) this.setFillStyle(0x882222); }
        });

        // Golpear en recovery resetea el timer — le das más tiempo al jugador
        if (this.state === 'RECOVERY') {
            this.attackTimer.reset({
                delay: 4500,
                callback: this.elegirAtaque,
                callbackScope: this,
                loop: true
            });
        }

        return cantidad;
    }

    // ── Verifica si un golpe del jugador conecta ──────────────
    puedeSerGolpeado(tipoPunch) {
        if (this.invulnerable) return false;
        if (this.state === 'IDLE' || this.state === 'CARGANDO') return false;
        return true; // solo conecta en ATACANDO y RECOVERY
    }

    // ── Helpers visuales ──────────────────────────────────────
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
        this.scene.tweens.add({
            targets: this,
            fillColor: 0xffdd00,
            duration: 60,
            yoyo: true,
        });
        if (this.scene.infoText) {
            this.scene.infoText.setText('¡Está cargando, espera!');
            this.scene.time.delayedCall(600, () => {
                this.scene.infoText.setText('Estado: NEUTRAL');
            });
        }
    }
}