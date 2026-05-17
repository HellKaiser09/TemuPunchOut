import { Paciente } from '../entities/Paciente.js';
import { Nemesis } from '../entities/Nemesis.js';
import { BuffSystem } from '../systems/BuffSystem.js';
import { AudioSystem } from '../systems/AudioSystem.js';

export class CombatScene extends Phaser.Scene {
/* ---------------------------------------------
¿Qué hace?
Registra la escena de pelea en el núcleo del motor Phaser bajo el identificador único 'CombatScene'.
------------------------------------------- */
    constructor() {
        super({ key: 'CombatScene' });
    }

/* ---------------------------------------------
¿Qué hace?
Recupera las variables de persistencia entre asaltos (round actual, vida del jugador, etc.).
------------------------------------------- */
    init(data) {
        this.currentRound   = data?.currentRound   ?? 1;
        this.nemesisRevived = data?.nemesisRevived ?? false;
        this.savedPatientHp = data?.savedPatientHp ?? 150;
        this.pendingBuff    = data?.pendingBuff    ?? null;
    }

/* ---------------------------------------------
¿Qué hace?
Construye los elementos del ring de boxeo: instancia los personajes lógicos, asocia sus sprites gráficos,
inicializa el HUD redondeado y configura los eventos de transición.
------------------------------------------- */
    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.add.image(W / 2, H / 2, 'fondo_pelea').setDisplaySize(W, H);
        this.cameras.main.fadeIn(500, 0, 0, 0);

        // ── Animaciones ───────────────────────────────────────
        if (!this.anims.exists('enemigo_batazo_izq')) {
            this.anims.create({
                key: 'enemigo_batazo_izq',
                frames: [
                    { key: 'hamburguesa_golpe_izq_1' },
                    { key: 'hamburguesa_golpe_izq_2' },
                    { key: 'hamburguesa_golpe_izq_3' },
                ],
                frameRate: 12, repeat: 0
            });
        }

        if (!this.anims.exists('bloqueo_derecho')) {
            this.anims.create({
                key: 'bloqueo_derecho',
                frames: [
                    { key: 'bloqueo2' },
                    { key: 'bloqueo1' },
                ],
                frameRate: 12, repeat: 0
            });
        }

        if (!this.anims.exists('enemigo_batazo_der')) {
            this.anims.create({
                key: 'enemigo_batazo_der',
                frames: [
                    { key: 'hamburguesa_golpe_der_1' },
                    { key: 'hamburguesa_golpe_der_2' },
                    { key: 'hamburguesa_golpe_der_3' },
                ],
                frameRate: 12, repeat: 0
            });
        }

        if (!this.anims.exists('enemigo_batazo_arriba')) {
            this.anims.create({
                key: 'enemigo_batazo_arriba',
                frames: [
                    { key: 'hamburguesa_arriba_1' },
                    { key: 'hamburguesa_arriba_2' },
                    { key: 'hamburguesa_arriba_3' },
                ],
                frameRate: 10, repeat: 0
            });
        }

        if (!this.anims.exists('enemigo_especial')) {
            this.anims.create({
                key: 'enemigo_especial',
                frames: [
                    { key: 'hamburguesa_especial_1' },
                    { key: 'hamburguesa_especial_2' },
                    { key: 'hamburguesa_especial_3' },
                    { key: 'hamburguesa_especial_4' },
                ],
                frameRate: 6, repeat: -1
            });
        }

        if (!this.anims.exists('enemigo_idle')) {
            this.anims.create({
                key: 'enemigo_idle',
                frames: [
                    { key: 'hamburguesa_idle_1' },
                    { key: 'hamburguesa_idle_2' },
                    { key: 'hamburguesa_idle_3' },
                ],
                frameRate: 4, repeat: -1
            });
        }

        if (!this.anims.exists('enemigo_bloqueoarriba')) {
            this.anims.create({
                key: 'enemigo_bloqueoarriba',
                frames: [
                    { key: 'bloqueo1' },
                    { key: 'bloqueo2' },
                ],
                frameRate: 3, repeat: -1
            });
        }

        if (!this.anims.exists('enemigo_bloqueoabajo')) {
            this.anims.create({
                key: 'enemigo_bloqueoabajo',
                frames: [
                    { key: 'bloqueo3' },
                    { key: 'bloqueo4' },
                ],
                frameRate: 3, repeat: -1
            });
        }

        // ── Animación de daño genérico del némesis ────────────
        // Se reproduce en TODOS los golpes que conectan del jugador,
        // sin importar el round ni si el némesis revivió.
        if (!this.anims.exists('daño_burguer')) {
            this.anims.create({
                key: 'daño_burguer',
                frames: [
                    { key: 'verguado1' },
                    { key: 'verguado2' },
                ],
                frameRate: 14, repeat: 0
            });
        }

        // ── Animaciones exclusivas de némesis revivido ────────
        // Se activan en procesarGolpeJugador como capa adicional de
        // feedback dramático cuando nemesisRevived === true.
        // La animación base de daño (daño_burguer) sigue reproduciéndose
        // en ambos casos; estas se encadenan al terminar daño_burguer.
        if (!this.anims.exists('golpe_final_derecho')) {
            this.anims.create({
                key: 'golpe_final_derecho',
                frames: [
                    { key: 'final1' },
                    { key: 'final2' },
                ],
                frameRate: 14, repeat: 0
            });
        }

        if (!this.anims.exists('golpe_final_izquierdo')) {
            this.anims.create({
                key: 'golpe_final_izquierdo',
                frames: [
                    { key: 'final3' },
                    { key: 'final4' },
                ],
                frameRate: 14, repeat: 0
            });
        }

        if (!this.anims.exists('golpe_final_arriba')) {
            this.anims.create({
                key: 'golpe_final_arriba',
                frames: [
                    { key: 'final5' },
                    { key: 'final6' },
                ],
                frameRate: 14, repeat: 0
            });
        }

        // ── Entidades ─────────────────────────────────────────
        this.nemesis  = new Nemesis(this, W / 2, H / 2 - 50);
        this.paciente = new Paciente(this, W / 2, H - 120);
        this.paciente.hp = this.savedPatientHp;

        // Las entidades lógicas se mantienen invisibles;
        // el renderizado lo hacen los sprites enemigo / jugador.
        this.nemesis.setVisible(false);
        this.paciente.setVisible(false);

        // ── Sprite enemigo ────────────────────────────────────
        this.enemigo = this.add.sprite(this.nemesis.x, this.nemesis.y + 60, 'hamburguesa_idle_1');
        this.enemigo.setScale(0.70).setDepth(10).setVisible(true);
        this.enemigo.play('enemigo_idle');

        this.enemigo.on('animationcomplete', (anim) => {
            // Al terminar cualquier animación de reacción a daño vuelve a idle.
            const animsDeReaccion = [
                'enemigo_batazo_izq',
                'enemigo_batazo_der',
                'enemigo_batazo_arriba',
                'daño_burguer',
                'golpe_final_derecho',
                'golpe_final_izquierdo',
                'golpe_final_arriba',
            ];
            if (animsDeReaccion.includes(anim.key)) {
                this.enemigo.play('enemigo_idle');
            }
        });

        // ── Sprite jugador ────────────────────────────────────
        this.jugador = this.add.sprite(this.paciente.x, this.paciente.y, 'paciente_iddle');
        this.jugador.setScale(0.60).setDepth(5).setVisible(true);
        this.lastPacienteState = this.paciente.state;

        // ── Eventos del nemesis ───────────────────────────────
        this.events.on('nemesis-atacar', (direccion) => {
            if (direccion === 'IZQUIERDA')     this.enemigo.play('enemigo_batazo_izq',    true);
            else if (direccion === 'DERECHA')  this.enemigo.play('enemigo_batazo_der',    true);
            else if (direccion === 'ARRIBA')   this.enemigo.play('enemigo_batazo_arriba', true);
            else if (direccion === 'ESPECIAL') this.enemigo.play('enemigo_especial',       true);
        });

        this.events.on('nemesis-fin-recovery', () => {
            if (this.enemigo?.active) {
                this.enemigo.play('enemigo_idle', true);
            }
        });

        this.events.on('nemesis-recovery', () => {
            if (this.enemigo.anims.currentAnim?.key === 'enemigo_especial') {
                this.enemigo.stop();
                this.enemigo.play('enemigo_idle');
            }
        });

        // ── Base nemesis ──────────────────────────────────────
        this.nemesis.base   = { ...(this.nemesis.base ?? {}), damage: 10 };
        this.nemesis.damage = this.nemesis.damage ?? this.nemesis.base.damage;

        // ── Sistemas ──────────────────────────────────────────
        this.buffSystem  = new BuffSystem(this, this.paciente, this.nemesis);
        this.audioSystem = new AudioSystem(this);
        this.audioSystem.playBGM('bgm_pelea');
        this.audioSystem.playInicioPelea();

        // ── UI ────────────────────────────────────────────────
        const topY = 70;
        const barW = 450;
        const barH = 38;
        const cornerRadius = 18;
        this.hudConfig = { topY, barW, barH, cornerRadius, W };

        this.graphicsHPJugador = this.add.graphics().setDepth(14);
        this.graphicsHPEnemigo = this.add.graphics().setDepth(14);

        const marcoGfx = this.add.graphics().setDepth(13);
        marcoGfx.fillStyle(0x0d0d1a, 1);
        marcoGfx.lineStyle(3, 0xffd700, 1);

        marcoGfx.fillRoundedRect(45, topY - 45, 90, 90, 24);
        marcoGfx.strokeRoundedRect(45, topY - 45, 90, 90, 24);
        marcoGfx.fillRoundedRect(W - 135, topY - 45, 90, 90, 24);
        marcoGfx.strokeRoundedRect(W - 135, topY - 45, 90, 90, 24);

        this.avatarJugador = this.add.image(90, topY, 'perfilpaciente', 0)
            .setScale(1.2)
            .setDepth(15)
            .setOrigin(0.5);

        this.avatarEnemigo = this.add.image(W - 90, topY, 'perfilburguer', 0)
            .setScale(0.19)
            .setDepth(15)
            .setOrigin(0.5);

        if (this.nemesisRevived) {
            this.nemesis.hp = 60;
            this.nemesis.attackTimer.delay = 2500;
        }

        this.infoText      = this.add.text(W / 2, 20, '', { font: '18px monospace', fill: '#ffff00' }).setOrigin(0.5);
        this.countdownText = this.add.text(W / 2, 60, '', { font: '48px Arial', fill: '#00ff00', fontStyle: 'bold' }).setOrigin(0.5).setVisible(false);
        this.alertText     = this.add.text(W / 2, 110, '', { font: '22px Arial', fill: '#ff3333', fontStyle: 'bold' }).setOrigin(0.5);
        this.buffHintText  = this.add.text(W / 2, H - 40, '', {
            fontFamily: 'Arial, sans-serif', fontSize: '26px', color: '#ffd700', fontStyle: 'italic', align: 'center',
        }).setOrigin(0.5).setDepth(20);

        // ── Buff pendiente ────────────────────────────────────
        const registryPendingBuff = this.registry.get('pendingBuff');
        if (!this.pendingBuff && registryPendingBuff) this.pendingBuff = registryPendingBuff;

        if (this.pendingBuff) {
            this.buffSystem.apply(this.pendingBuff);
            this.registry.set('lastBuff', this.pendingBuff);
            this.registry.remove('pendingBuff');
            this.pendingBuff = null;
        }

        this._refreshCombatUI();
    }

/* ---------------------------------------------
¿Qué hace?
Sincroniza la posición lógica y de texturas a 60 FPS estables.
------------------------------------------- */
    update() {
        this.paciente.update();

        if (this.jugador && this.paciente) {
            this.jugador.x = this.paciente.x;
            this.jugador.y = this.paciente.y;

            if (this.paciente.state !== this.lastPacienteState) {
                this._updateJugadorTextura(this.paciente.state);
                this.lastPacienteState = this.paciente.state;
            }
        }

        if (this.enemigo && this.nemesis) {
            this.enemigo.x = this.nemesis.x;
            this.enemigo.y = this.nemesis.y + 60;
        }

        this._refreshCombatUI();
    }

/* ---------------------------------------------
¿Qué hace?
Redibuja los vectores rounded de salud y actualiza la barra de energía del ataque cargado.
------------------------------------------- */
    _refreshCombatUI() {
        if (!this.buffSystem || !this.paciente || !this.nemesis) return;
        if (!this.buffHintText) return;

        const { topY, barW, barH, cornerRadius, W } = this.hudConfig;

        const pctJugador = Math.max(0, this.paciente.hp / 150);
        const pctEnemigo = Math.max(0, this.nemesis.hp / 100);

        const playerBarX = 150;
        const playerColor = 0x00ff88;
        this._renderizarBarraRounded(this.graphicsHPJugador, playerBarX, topY - (barH / 2), barW, barH, cornerRadius, pctJugador, playerColor, false);

        const enemyBarX = W - barW - 150;
        const enemyColor = 0xff3333;
        this._renderizarBarraRounded(this.graphicsHPEnemigo, enemyBarX, topY - (barH / 2), barW, barH, cornerRadius, pctEnemigo, enemyColor, true);

        if (this.superBar) {
            this.superBar.setSize((this.paciente.superMeter / 100) * 150, 10);
        }

        const active   = this.buffSystem.getActiveBuffs();
        const lastBuff = this.registry.get('lastBuff');
        const hints = {
            'autoestima':     ' Recuerda por qué elegiste el diseño.',
            'limites':        ' Tu miedo solo tiene el poder que tú le das.',
            'vulnerabilidad': ' Mostrarte es tu mayor fortaleza ahora.',
            'perdonarte':     ' Suelta el peso. Estás más ligero.',
        };

        this.buffHintText.setText(
            active.length > 0 && lastBuff ? (hints[lastBuff] || '') : ''
        );
    }

/* ---------------------------------------------
¿Qué hace?
Procesa los golpes del jugador contra el némesis. Si el némesis está en animación de bloqueo
compatible con el tipo de golpe, lo bloquea; de lo contrario aplica daño normal.
- enemigo_bloqueoarriba bloquea golpes ALTO_IZQ y ALTO_DER.
- enemigo_bloqueoabajo  bloquea golpes BAJO_IZQ y BAJO_DER.
Cuando un golpe conecta, SIEMPRE se reproduce 'daño_burguer' (verguado1/verguado2)
como feedback universal de daño. En el round del némesis revivido además se encadena
la animación 'golpe_final_*' correspondiente a la dirección para mayor dramatismo.
------------------------------------------- */
    procesarGolpeJugador(tipo) {
        // ── Comprobación de bloqueo direccional del némesis ───
        const animActual = this.enemigo.anims.currentAnim?.key;
        const esGolpeAlto = tipo === 'ALTO_IZQ' || tipo === 'ALTO_DER';
        const esGolpeBajo = tipo === 'BAJO_IZQ' || tipo === 'BAJO_DER';

        const bloqueoNemesisDireccional =
            (animActual === 'enemigo_bloqueoarriba' && esGolpeAlto) ||
            (animActual === 'enemigo_bloqueoabajo'  && esGolpeBajo);

        if (bloqueoNemesisDireccional) {
            this.infoText.setText('¡El Némesis bloqueó tu golpe!');
            this.alertText.setText('¡BLOQUEO!');
            this.audioSystem?.playGolpePaciente();
            this.cameras.main.shake(40, 0.005);
            this.time.delayedCall(800, () => {
                this.alertText.setText('');
                if (this.paciente.state === 'NEUTRAL') this.infoText.setText('');
            });
            return;
        }

        // ── Lógica original de bloqueo probabilístico ─────────
        const bloqueandoPorVentana = this.nemesis.state === 'ATACANDO';
        const blockChance = bloqueandoPorVentana ? 0.70 : 0.32;

        if (Math.random() < blockChance) {
            this.infoText.setText('¡Bloqueado por el Némesis!');
            this.alertText.setText('¡BLOQUEO!');
            this.audioSystem?.playGolpePaciente();

            this.enemigo.stop();
            this.enemigo.setTexture('bloqueo2');
            this.time.delayedCall(80, () => {
                if (!this.enemigo?.active) return;
                this.enemigo.setTexture('bloqueo1');
                this.time.delayedCall(80, () => {
                    if (!this.enemigo?.active) return;
                    this.enemigo.play('enemigo_idle', true);
                    this.alertText.setText('');
                });
            });
        } else {
            let damageCalculado = tipo.includes('BAJO') ? 6 : 9;
            let esCritico = false;

            if (this.paciente.critDamage > 0 && Math.random() < 0.35) {
                const extraDamage = Math.round(damageCalculado * (this.paciente.critDamage / 100));
                damageCalculado += extraDamage;
                esCritico = true;
            }

            this.nemesis.hp -= damageCalculado;

            // ── Feedback visual de daño recibido ──────────────
            // 'daño_burguer' se reproduce SIEMPRE que un golpe conecta
            // (verguado1 → verguado2) en ambos rounds.
            // Si el némesis está revivido, al completarse daño_burguer se
            // encadena la animación final direccional para mayor impacto.
            // En ambos casos el listener global 'animationcomplete' devuelve el sprite a idle.
            if (this.nemesisRevived) {
                const esArriba = tipo.includes('ALTO');
                const esIzq    = tipo.includes('IZQ');

                this.enemigo.play('daño_burguer', true);
                this.enemigo.once('animationcomplete', () => {
                    if (!this.enemigo?.active) return;
                    if (esArriba)   this.enemigo.play('golpe_final_arriba',    true);
                    else if (esIzq) this.enemigo.play('golpe_final_izquierdo', true);
                    else            this.enemigo.play('golpe_final_derecho',    true);
                    // La vuelta a idle queda en manos del listener global 'animationcomplete'.
                });
            } else {
                // Round normal: solo daño_burguer; idle lo gestiona animationcomplete.
                this.enemigo.play('daño_burguer', true);
            }

            this.audioSystem?.playGolpePaciente();

            if (esCritico) {
                this.infoText.setText(`¡CRÍTICO! Golpe ${tipo} (-${damageCalculado} HP)`);
                this.alertText.setText('CRÍTICO');
                this.time.delayedCall(600, () => this.alertText.setText(''));
            } else {
                this.infoText.setText(`¡Golpe ${tipo}! (-${damageCalculado} HP)`);
            }

            const onHitEffects = this.registry.get('onHitBuff') ?? [];
            let bonoEnergiaExtra = 0;
            onHitEffects.forEach(effect => {
                if (effect.stat === 'courage' && (effect.targetKey === 'self' || effect.target === this.paciente)) {
                    bonoEnergiaExtra += effect.value;
                }
            });

            this.paciente.superMeter = Math.min(100, this.paciente.superMeter + 10 + bonoEnergiaExtra);
            this.cameras.main.shake(80, 0.01);

            this.enemigo.setTint(0xffffff);
            this.tweens.add({
                targets: this.enemigo, scaleX: 1.6, duration: 50, yoyo: true,
                onComplete: () => this.enemigo.clearTint()
            });

            if (this.nemesis.hp <= 0) this.terminarCombate(true);
        }
    }

/* ---------------------------------------------
¿Qué hace?
Ejecuta la animación y reducción masiva de salud por el Súper Golpe de Espacio.
------------------------------------------- */
    procesarSuperJugador() {
        this.audioSystem?.playEspecial();
        this.enemigo.setTint(0x00ffff);
        this.cameras.main.flash(300, 0, 255, 255);
        this.cameras.main.shake(500, 0.03);

        this.nemesis.hp -= 50;

        // El super-golpe también reproduce daño_burguer.
        // Si el némesis está revivido encadena golpe_final_arriba al terminar.
        this.enemigo.play('daño_burguer', true);
        if (this.nemesisRevived) {
            this.enemigo.once('animationcomplete', () => {
                if (this.enemigo?.active) this.enemigo.play('golpe_final_arriba', true);
            });
        }

        this.tweens.add({
            targets: this.paciente, y: this.paciente.baseY - 80, scaleX: 1.3, duration: 200, yoyo: true,
            onComplete: () => {
                this.paciente.y = this.paciente.baseY;
                this.paciente.setScale(1, 1);
                if (this.nemesis.hp <= 0) {
                    this.terminarCombate(true);
                } else {
                    this.enemigo.clearTint();
                    this.paciente.state = 'NEUTRAL';
                    this.infoText.setText('');
                }
            }
        });
    }

/* ---------------------------------------------
¿Qué hace?
Procesa los golpes entrantes de la hamburguesa, validando esquives perfectos o mitigaciones por guardia.
------------------------------------------- */
    procesarGolpeNemesis(data = {}) {
        if (this.paciente.hp <= 0) return;

        const dañoBase = this.nemesis.damage ?? 10;
        const { tipo = 'LATERAL', direccion = 'NINGUNA', dano = dañoBase } = data;

        if (tipo === 'ESPECIAL') {
            this.audioSystem?.playGolpeHamburguesa();
            this.jugador.setTexture('paciente_recibir_1');
            this.time.delayedCall(200, () => this.jugador.setTexture('paciente_iddle'));

            this.paciente.hp = Math.max(0, this.paciente.hp - dano);
            this.cameras.main.shake(80, 0.01);
            if (this.paciente.hp <= 0) this.terminarCombate(false);
            return;
        }

        let evadido   = false;
        let bloqueado = false;
        let razon     = '';

        if (tipo === 'LATERAL') {
            if (direccion === 'IZQUIERDA' && this.paciente.lastDodgeDirection === 'DERECHA') { evadido = true; razon = '¡Esquive perfecto!'; }
            if (direccion === 'DERECHA' && this.paciente.lastDodgeDirection === 'IZQUIERDA') { evadido = true; razon = '¡Esquive perfecto!'; }
        }

        if (tipo === 'ARRIBA') {
            if (this.paciente.state === 'AGACHADO' || this.paciente.isDucking) { evadido = true; razon = '¡Pasó por arriba!'; }
        }

        if (!evadido && this.paciente.state === 'BLOQUEANDO') bloqueado = true;

        if (evadido) {
            this.infoText.setText(`✓ ${razon}`);
        } else if (bloqueado) {
            const chipDamage = 2;
            this.audioSystem?.playGolpeHamburguesa();
            this.paciente.hp = Math.max(0, this.paciente.hp - chipDamage);
            this.infoText.setText(`Guardia firme (-${chipDamage} HP)`);
            this.cameras.main.shake(50, 0.005);
        } else {
            this.audioSystem?.playGolpeHamburguesa();
            const texRecibir = direccion === 'IZQUIERDA' ? 'paciente_recibir_1' : 'paciente_recibir_2';
            this.jugador.setTexture(texRecibir);
            this.time.delayedCall(250, () => this.jugador.setTexture('paciente_iddle'));

            let dañoFinal = dano;
            if (this.paciente.critDamage > 0) {
                dañoFinal = Math.round(dañoFinal * 1.25);
                this.infoText.setText(`✗ ¡Impacto amplificado! (-${dañoFinal} HP)`);
            } else {
                this.infoText.setText(`✗ ¡Golpe directo! (-${dañoFinal} HP)`);
            }
            this.paciente.hp = Math.max(0, this.paciente.hp - dañoFinal);
            this.cameras.main.shake(250, 0.025);
            this.cameras.main.flash(100, 255, 0, 0);
        }

        this.time.delayedCall(300, () => {
            this.paciente.lastDodgeDirection = 'NINGUNA';
            this.alertText.setText('');
            if (this.paciente.state === 'NEUTRAL') this.infoText.setText('');
            if (this.paciente.hp <= 0) this.terminarCombate(false);
        });
    }

/* ---------------------------------------------
¿Qué hace?
Enrutador estratégico del juego. Decide si mandarte a la pantalla de KO o levantar el interludio cinematográfico.
------------------------------------------- */
    terminarCombate(victoria) {
        this.nemesis.attackTimer.destroy();
        this.audioSystem?.stopBGM();

        if (!victoria) {
            this.cameras.main.fade(800, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('EndScene', { victoria: false });
            });
            return;
        }

        if (this.currentRound === 1 || this.currentRound === 2) {
            this.paciente.state = 'CINEMATIC';
            this.buffSystem.tickRound();

            const coachData = {
                currentRound: this.currentRound + 1,
                playerHp: this.paciente.hp,
                playerMaxHp: this.paciente.maxHp || 150,
                playerEnergy: this.paciente.superMeter || 0
            };

            const lineasIntermedio = [
                { speaker: 'dr', text: 'Buen trabajo. Vamos a revisar tus opciones de mejora.' },
                { speaker: 'patient', text: '¿Qué debo escoger, doctor?' }
            ];

            this.cameras.main.fade(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('DialogueScene', {
                    lines: lineasIntermedio,
                    nextScene: 'CoachScene',
                    nextData: coachData
                });
            });
        } else if (this.currentRound === 3) {
            if (!this.nemesisRevived) {
                const lineasResurreccion = [
                    { speaker: 'patient', text: '¡Se acabó!, pensaba que me que me iba tomar de 6 a 7 rounds.' },
                    { speaker: 'dr', text: '¿Eso crees? El servicio al cliente te está llamando.' },
                    { speaker: 'nemesis', text: 'Jajaja... No puedes borrarme con puños. ¡SOY TU PROPIA CULPA!' },
                    { speaker: 'dr',      text: '¡Hey! No estudiaste para terminar ahí, puedes vencerlo.' },
                    { speaker: 'patient', text: 'Es verdad... Solo necesito resistir un poco más.' }
                ];
                this.cameras.main.fade(500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('DialogueScene', {
                        lines: lineasResurreccion,
                        nextScene: 'CombatScene',
                        nextData: { currentRound: 3, nemesisRevived: true, savedPatientHp: this.paciente.hp }
                    });
                });
            } else {
                this.paciente.state = 'CINEMATIC';
                const lineasVictoriaFinal = [
                    { speaker: 'nemesis', text: 'No... puede... ser... Te estás... aceptando...' },
                    { speaker: 'patient', text: 'Adiós, viejo. Creo que dejaré de tener tan poca confianza en mí mismo.' },
                    { speaker: 'system',  text: '◈ ENHORABUENA: Has superado tus demonios internos.' }
                ];
                this.cameras.main.fade(1000, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('DialogueScene', {
                        lines: lineasVictoriaFinal,
                        nextScene: 'EndScene',
                        nextData: { victoria: true }
                    });
                });
            }
        }
    }

/* ---------------------------------------------
¿Qué hace?
Intercambia dinámicamente las texturas de renderizado del avatar del jugador.
------------------------------------------- */
    _updateJugadorTextura(estado) {
        if (!this.jugador) return;

        if (estado === 'ATACANDO' && this.paciente.lastPunchType) {
            const punchMap = {
                'ALTO_IZQ': 'paciente_arriba_izq', 'ALTO_DER': 'paciente_arriba_der',
                'BAJO_IZQ': 'paciente_abajo_izq',  'BAJO_DER': 'paciente_abajo_der',
            };
            this.jugador.setTexture(punchMap[this.paciente.lastPunchType] || 'paciente_iddle');
        } else {
            const texturaMap = {
                'NEUTRAL':     'paciente_iddle',       'ESQUIVE_IZQ': 'paciente_esquive_izq',
                'ESQUIVE_DER': 'paciente_esquive_der', 'AGACHADO':    'paciente_iddle',
                'BLOQUEANDO':  'paciente_iddle',       'RECOVERY':    'paciente_iddle',
                'CINEMATIC':   'paciente_iddle'
            };
            this.jugador.setTexture(texturaMap[estado] || 'paciente_iddle');
        }
    }

/* ---------------------------------------------
¿Qué hace?
Trazador geométrico con curvatura antialias nativa de Phaser para el HUD arcade.
------------------------------------------- */
    _renderizarBarraRounded(graphics, x, y, width, height, radius, porcentaje, colorFill, isReversed) {
        graphics.clear();

        graphics.fillStyle(0xffffff, 1);
        graphics.fillRoundedRect(x, y, width, height, radius);

        const padding = 4;
        const innerH = height - (padding * 2);
        const maxInnerW = width - (padding * 2);
        const innerW = maxInnerW * porcentaje;

        if (innerW <= 0) return;

        graphics.fillStyle(colorFill, 1);

        if (!isReversed) {
            graphics.fillRoundedRect(x + padding, y + padding, innerW, innerH, radius - 2);
        } else {
            const reversedX = x + padding + (maxInnerW - innerW);
            graphics.fillRoundedRect(reversedX, y + padding, innerW, innerH, radius - 2);
        }
    }
}