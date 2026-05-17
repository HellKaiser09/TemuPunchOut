import { Paciente } from '../entities/Paciente.js';
import { Nemesis } from '../entities/Nemesis.js';
import { BuffSystem } from '../systems/BuffSystem.js';
import { AudioSystem } from '../systems/AudioSystem.js';

export class CombatScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CombatScene' });
    }

    init(data) {
        this.currentRound   = data?.currentRound  ?? 1;
        this.nemesisRevived = data?.nemesisRevived ?? false;
        this.savedPatientHp = data?.savedPatientHp ?? 150;
        this.pendingBuff    = data?.pendingBuff    ?? null;
    }

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

        // ── Entidades ─────────────────────────────────────────
        this.nemesis  = new Nemesis(this, W / 2, H / 2 - 50);
        this.paciente = new Paciente(this, W / 2, H - 120);
        this.paciente.hp = this.savedPatientHp;
        this.nemesis.setVisible(false);
        this.paciente.setVisible(false);

        // ── Sprite enemigo ────────────────────────────────────
        this.enemigo = this.add.sprite(this.nemesis.x, this.nemesis.y + 60, 'hamburguesa_idle_1');
        this.enemigo.setScale(0.70).setDepth(10).setVisible(true);
        this.enemigo.play('enemigo_idle');

        this.enemigo.on('animationcomplete', (anim) => {
            if (anim.key === 'enemigo_batazo_izq' ||
                anim.key === 'enemigo_batazo_der'  ||
                anim.key === 'enemigo_batazo_arriba') {
                this.enemigo.play('enemigo_idle');
            }
        });

        // ── Sprite jugador ────────────────────────────────────
        this.jugador = this.add.sprite(this.paciente.x, this.paciente.y, 'paciente_iddle');
        this.jugador.setScale(0.60).setDepth(5).setVisible(true);
        this.lastPacienteState = this.paciente.state;

        // ── Eventos del nemesis ───────────────────────────────
        this.events.on('nemesis-atacar', (direccion) => {
            if (direccion === 'IZQUIERDA')      this.enemigo.play('enemigo_batazo_izq',    true);
            else if (direccion === 'DERECHA')   this.enemigo.play('enemigo_batazo_der',    true);
            else if (direccion === 'ARRIBA')    this.enemigo.play('enemigo_batazo_arriba', true);
            else if (direccion === 'ESPECIAL')  this.enemigo.play('enemigo_especial',      true);
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

        // ── Coach buff ────────────────────────────────────────
        this.events.off('coach-buff-chosen');
        this.events.on('coach-buff-chosen', (buffId) => {
            this.currentRound++;
            this.scene.restart({
                currentRound:   this.currentRound,
                savedPatientHp: this.paciente.hp,
                nemesisRevived: this.nemesisRevived,
                pendingBuff:    buffId
            });
        });

        // ── UI ────────────────────────────────────────────────
        this.add.text(50, 30, `Paciente (Round ${this.currentRound}):`, {
            font: '16px Arial', fill: '#fff'
        });
        this.pacienteHPbar = this.add.rectangle(50, 55, 250, 20, 0x00ff00).setOrigin(0, 0.5);
        this.pacienteHPbar.setSize((this.paciente.hp / 150) * 250, 20);

        this.add.text(50, 85, 'SÚPER:', { font: '12px monospace', fill: '#00ffff' });
        this.superBar = this.add.rectangle(100, 92, 0, 10, 0x00ffff).setOrigin(0, 0.5);
        this.superBar.setSize((this.paciente.superMeter / 100) * 150, 10);

        this.add.text(W - 300, 30,
            this.nemesisRevived ? 'AUTONÉMESIS (💥 IRA CONSCIENTE)' : 'AutoNémesis',
            { font: '16px Arial', fill: '#fff' }
        );
        this.nemesisHPBar = this.add.rectangle(W - 300, 55, 250, 20, 0xff0000).setOrigin(0, 0.5);

        if (this.nemesisRevived) {
            this.nemesis.hp = 60;
            this.nemesis.attackTimer.delay = 2500;
        }

        this.infoText = this.add.text(W / 2, 20, '', {
            font: '18px monospace', fill: '#ffff00'
        }).setOrigin(0.5);

        this.countdownText = this.add.text(W / 2, 60, '', {
            font: '48px Arial', fill: '#00ff00', fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false);

        this.alertText = this.add.text(W / 2, 110, '', {
            font: '22px Arial', fill: '#ff3333', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.buffHintText = this.add.text(W / 2, H - 40, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '26px',
            color: '#ffd700',
            fontStyle: 'italic',
            align: 'center',
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

    _refreshCombatUI() {
        if (!this.buffSystem || !this.paciente || !this.nemesis) return;
        if (!this.buffHintText) return;

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

    procesarGolpeJugador(tipo) {
        const bloqueandoPorVentana = this.nemesis.state === 'ATACANDO';
        const blockChance = bloqueandoPorVentana ? 0.70 : 0.32;

        if (Math.random() < blockChance) {
            this.infoText.setText('¡Bloqueado por el Némesis!');
            this.alertText.setText('¡BLOQUEO!');
            this.enemigo.setTint(0x555555);
            this.audioSystem?.playGolpePaciente();
            this.time.delayedCall(150, () => {
                this.enemigo.clearTint();
                this.alertText.setText('');
            });
        } else {
            let damageCalculado = tipo.includes('BAJO') ? 8 : 12;

            let esCritico = false;
            if (this.paciente.critDamage > 0 && Math.random() < 0.35) {
                const extraDamage = Math.round(damageCalculado * (this.paciente.critDamage / 100));
                damageCalculado += extraDamage;
                esCritico = true;
            }

            this.nemesis.hp -= damageCalculado;

            // ── Sprite recibir golpe del nemesis ──────────────
            const esIzq = tipo.includes('IZQ');
            this.enemigo.setTexture(esIzq ? 'hamburguesa_golpe_izq_1' : 'hamburguesa_golpe_der_1');
            this.time.delayedCall(250, () => {
                if (this.enemigo?.active) this.enemigo.play('enemigo_idle', true);
            });

            // ── Sonido ────────────────────────────────────────
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
            this.superBar.setSize((this.paciente.superMeter / 100) * 150, 10);
            this.nemesisHPBar.setSize((Math.max(0, this.nemesis.hp) / 100) * 250, 20);
            this.cameras.main.shake(80, 0.01);

            this.enemigo.setTint(0xffffff);
            this.tweens.add({
                targets: this.enemigo,
                scaleX: 1.6,
                duration: 50,
                yoyo: true,
                onComplete: () => this.enemigo.clearTint()
            });

            if (this.nemesis.hp <= 0) this.terminarCombate(true);
        }
    }

    procesarSuperJugador() {
        this.audioSystem?.playEspecial();
        this.enemigo.setTint(0x00ffff);
        this.cameras.main.flash(300, 0, 255, 255);
        this.cameras.main.shake(500, 0.03);

        this.nemesis.hp -= 50;
        this.nemesisHPBar.setSize((Math.max(0, this.nemesis.hp) / 100) * 250, 20);

        this.tweens.add({
            targets: this.paciente,
            y: this.paciente.baseY - 80,
            scaleX: 1.3,
            duration: 200,
            yoyo: true,
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

    procesarGolpeNemesis(data = {}) {
        if (this.paciente.hp <= 0) return;

        const dañoBase = this.nemesis.damage ?? 10;
        const { tipo = 'LATERAL', direccion = 'NINGUNA', dano = dañoBase } = data;

        if (tipo === 'ESPECIAL') {
            this.audioSystem?.playGolpeHamburguesa();
            this.jugador.setTexture('paciente_recibir_1');
            this.time.delayedCall(200, () => this.jugador.setTexture('paciente_iddle'));

            this.paciente.hp = Math.max(0, this.paciente.hp - dano);
            this.pacienteHPbar.setSize((this.paciente.hp / 150) * 250, 20);
            this.cameras.main.shake(80, 0.01);
            if (this.paciente.hp <= 0) this.terminarCombate(false);
            return;
        }

        let evadido   = false;
        let bloqueado = false;
        let razon     = '';

        if (tipo === 'LATERAL') {
            if (direccion === 'IZQUIERDA' && this.paciente.lastDodgeDirection === 'DERECHA') {
                evadido = true;
                razon   = '¡Esquive perfecto!';
            }
            if (direccion === 'DERECHA' && this.paciente.lastDodgeDirection === 'IZQUIERDA') {
                evadido = true;
                razon   = '¡Esquive perfecto!';
            }
        }

        if (tipo === 'ARRIBA') {
            if (this.paciente.state === 'AGACHADO' || this.paciente.isDucking) {
                evadido = true;
                razon   = '¡Pasó por arriba!';
            }
        }

        if (!evadido && this.paciente.state === 'BLOQUEANDO') bloqueado = true;

        if (evadido) {
            this.infoText.setText(`✓ ${razon}`);
        } else if (bloqueado) {
            const chipDamage = 2;
            this.audioSystem?.playGolpeHamburguesa();
            this.paciente.hp = Math.max(0, this.paciente.hp - chipDamage);
            this.pacienteHPbar.setSize((this.paciente.hp / 150) * 250, 20);
            this.infoText.setText(`Guardia firme (-${chipDamage} HP)`);
            this.cameras.main.shake(50, 0.005);
        } else {
            // ── Sprite recibir golpe del paciente ─────────────
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
            this.pacienteHPbar.setSize((this.paciente.hp / 150) * 250, 20);
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
            this.scene.launch('CoachScene', {
                round:        this.currentRound,
                playerHp:     this.paciente.hp,
                playerMaxHp:  this.paciente.maxHp,
                playerEnergy: this.paciente.superMeter
            });

        } else if (this.currentRound === 3) {
            this.paciente.state = 'CINEMATIC';

            if (!this.nemesisRevived) {
                const lineasResurreccion = [
                    { speaker: 'patient', text: '¡Se acabó! Pensaba que me iba a tomar de 6 a 7 rounds.' },
                    { speaker: 'dr',      text: '¿Eso crees? El servicio al cliente te está llamando.' },
                    { speaker: 'nemesis', text: 'Jajaja... No puedes borrarme con puños. ¡SOY TU PROPIA CULPA!' },
                    { speaker: 'dr',      text: '¡Hey! No estudiaste para terminar ahí, puedes vencerlo.' },
                    { speaker: 'patient', text: 'Es verdad... Solo necesito resistir un poco más.' }
                ];
                this.cameras.main.fade(500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('DialogueScene', {
                        lines:     lineasResurreccion,
                        nextScene: 'CombatScene',
                        nextData:  {
                            currentRound:   3,
                            nemesisRevived: true,
                            savedPatientHp: this.paciente.hp
                        }
                    });
                });
            } else {
                const lineasVictoriaFinal = [
                    { speaker: 'nemesis', text: 'No... puede... ser... Te estás... aceptando...' },
                    { speaker: 'patient', text: 'Adiós, viejo. Creo que dejaré de tener tan poca confianza en mí mismo.' },
                    { speaker: 'system',  text: '◈ ENHORABUENA: Has superado tus demonios internos.' }
                ];
                this.cameras.main.fade(1000, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('DialogueScene', {
                        lines:     lineasVictoriaFinal,
                        nextScene: 'EndScene',
                        nextData:  { victoria: true }
                    });
                });
            }
        }
    }

    _updateJugadorTextura(estado) {
        if (!this.jugador) return;

        if (estado === 'ATACANDO' && this.paciente.lastPunchType) {
            const punchMap = {
                'ALTO_IZQ': 'paciente_arriba_izq',
                'ALTO_DER': 'paciente_arriba_der',
                'BAJO_IZQ': 'paciente_abajo_izq',
                'BAJO_DER': 'paciente_abajo_der',
            };
            this.jugador.setTexture(punchMap[this.paciente.lastPunchType] || 'paciente_iddle');
        } else {
            const texturaMap = {
                'NEUTRAL':     'paciente_iddle',
                'ESQUIVE_IZQ': 'paciente_esquive_izq',
                'ESQUIVE_DER': 'paciente_esquive_der',
                'AGACHADO':    'paciente_iddle',
                'BLOQUEANDO':  'paciente_iddle',
                'RECOVERY':    'paciente_iddle',
                'CINEMATIC':   'paciente_iddle'
            };
            this.jugador.setTexture(texturaMap[estado] || 'paciente_iddle');
        }
    }
}