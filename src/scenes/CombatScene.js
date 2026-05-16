import { Paciente } from '../entities/Paciente.js';
import { Nemesis } from '../entities/Nemesis.js';
import { BuffSystem } from '../systems/BuffSystem.js';

export class CombatScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CombatScene' });
    }

    init(data) {
        // Si venimos de DialogueScene tras la resurrección, cargamos los datos guardados
        this.currentRound   = data?.currentRound ?? 1;
        this.nemesisRevived  = data?.nemesisRevived ?? false;
        
        // Conservar vida del paciente si venimos del round anterior
        this.savedPatientHp  = data?.savedPatientHp ?? 150;

        // 🔥 NUEVO: Recibir el buff que viene del Coach para este round
        this.pendingBuff     = data?.pendingBuff ?? null; 
    }

    create() {
        this.cameras.main.fadeIn(500, 0, 0, 0);
        const width = this.sys.game.config.width;
        const height = this.sys.game.config.height;

        // INSTANCIAR ENTIDADES MODULARES
        this.nemesis = new Nemesis(this, width / 2, height / 2 - 50);
        this.paciente = new Paciente(this, width / 2, height - 120);
        this.paciente.hp = this.savedPatientHp;

        this.buffSystem = new BuffSystem(this, this.paciente, this.nemesis);

        // CONFIGURACIÓN DE EVENTOS (Coach Buff)
        this.events.off('coach-buff-chosen'); // Limpiar escuchas viejas por seguridad
        this.events.on('coach-buff-chosen', (buffId) => {
            // Avanzamos de round y le pasamos el ID del buff a la nueva escena reiniciada
            this.currentRound++;
            this.scene.restart({
                currentRound: this.currentRound,
                savedPatientHp: this.paciente.hp,
                nemesisRevived: this.nemesisRevived,
                pendingBuff: buffId // 🔥 Enviamos el buff para el siguiente round
            });
        });

        
        this.add.text(50, 30, `Paciente (Round ${this.currentRound}): `, { font: "16px Arial", fill: "#fff" });
        this.pacienteHPbar = this.add.rectangle(50, 55, 250, 20, 0x00ff00).setOrigin(0, 0.5);
        this.pacienteHPbar.setSize((this.paciente.hp / 150) * 250, 20);

        // 🔥 LA SOLUCIÓN ACÁ: Se volvió a agregar la barra de Súper que se había borrado
        this.add.text(50, 85, "SÚPER:", { font: "12px monospace", fill: "#00ffff" });
        this.superBar = this.add.rectangle(100, 92, 0, 10, 0x00ffff).setOrigin(0, 0.5);
        // Inicializamos el tamaño visual del súper acumulado
        this.superBar.setSize((this.paciente.superMeter / 100) * 150, 10);

        this.add.text(width - 300, 30, this.nemesisRevived ? 'NÉMESIS (💥 IRA CONSCIENTE)' : 'Némesis', { font: '16px Arial', fill: '#fff' });
        this.nemesisHPBar = this.add.rectangle(width - 300, 55, 250, 20, 0xff0000).setOrigin(0, 0.5);

        // Si es la resurrección del Round 3, alteramos las propiedades del Némesis
        if (this.nemesisRevived) {
            this.nemesis.hp = 60; // Se levanta con menos vida pero más furioso
            this.nemesis.attackTimer.delay = 2500; // ¡Ataca el doble de rápido!
        }

        // Textos informativos de estado y alertas
        this.infoText = this.add.text(width / 2, 20, 'Estado: NEUTRAL', { font: '18px monospace', fill: '#ffff00' }).setOrigin(0.5);
        this.countdownText = this.add.text(width / 2, 60, '', { font: '48px Arial', fill: '#00ff00', fontStyle: 'bold' }).setOrigin(0.5).setVisible(false);
        this.alertText = this.add.text(width / 2, 110, '', { font: '22px Arial', fill: '#ff3333', fontStyle: 'bold' }).setOrigin(0.5);

        // Panel visual mejorado para entender buffs/debuffs y stats del round
        this.add.rectangle(width / 2, height - 95, 920, 100, 0x0b1526, 0.82).setStrokeStyle(2, 0x4f8bd8);
        this.effectsTitle = this.add.text(width / 2 - 445, height - 135, 'ESTADO DE COMBATE', {
            font: '14px monospace',
            fill: '#7ed7ff',
            fontStyle: 'bold'
        }).setOrigin(0, 0.5);
        this.buffLineText = this.add.text(width / 2 - 445, height - 112, 'BUFFS: ninguno', {
            font: '13px monospace',
            fill: '#6dff9d',
            wordWrap: { width: 900 }
        }).setOrigin(0, 0);
        this.debuffLineText = this.add.text(width / 2 - 445, height - 90, 'DEBUFFS: ninguno', {
            font: '13px monospace',
            fill: '#ff8f8f',
            wordWrap: { width: 900 }
        }).setOrigin(0, 0);
        this.statsLineText = this.add.text(width / 2 - 445, height - 68, 'STATS: --', {
            font: '13px monospace',
            fill: '#e5e7eb',
            wordWrap: { width: 900 }
        }).setOrigin(0, 0);

        // 🔥 NUEVO: Si venimos de un cambio de round y hay un buff pendiente, lo aplicamos AHORA
        if (this.pendingBuff) {
            console.log(`[SISTEMA] Activando efectos de: ${this.pendingBuff} para el Round ${this.currentRound}`);
            this.buffSystem.apply(this.pendingBuff);
            this.pendingBuff = null;
        }

        this._refreshCombatUI();
    }

    update() {
        // Ejecuta el bucle de inputs del prota
        this.paciente.update();
        this._refreshCombatUI();
    }

    _getOnHitBonus() {
        const onHitEffects = this.registry.get('onHitBuff') ?? [];
        return onHitEffects
            .filter(effect => effect.stat === 'courage' && effect.targetKey === 'self')
            .reduce((acc, effect) => acc + effect.value, 0);
    }

    _refreshCombatUI() {
        if (!this.buffLineText || !this.debuffLineText || !this.statsLineText || !this.buffSystem || !this.paciente || !this.nemesis) return;

        const active = this.buffSystem.getActiveBuffs();
        const toLabel = (mod) => {
            const side = mod.targetKey === 'enemy' ? 'NEMESIS' : 'PACIENTE';
            const rounds = typeof mod.rounds === 'number' ? `${mod.rounds}r` : 'inst';
            if (mod.type === 'immunity') return `${side}:inmune(${mod.value}, ${rounds})`;
            if (mod.type === 'block') return `${side}:bloquea(${mod.value}, ${rounds})`;
            if (mod.type === 'on_hit') return `${side}:on_hit(${rounds})`;
            const stat = mod.effect?.stat ?? 'stat';
            return `${side}:${stat}(${rounds})`;
        };

        const buffMods = active.filter(mod => mod.sourceTag !== 'debuff');
        const debuffMods = active.filter(mod => mod.sourceTag === 'debuff' || mod.targetKey === 'enemy');
        const buffLine = buffMods.length ? buffMods.map(toLabel).join(' | ') : 'ninguno';
        const debuffLine = debuffMods.length ? debuffMods.map(toLabel).join(' | ') : 'ninguno';

        this.buffLineText.setText(`BUFFS: ${buffLine}`);
        this.debuffLineText.setText(`DEBUFFS: ${debuffLine}`);
        this.statsLineText.setText(
            `STATS: Daño Némesis ${this.nemesis.damage} | Crit Paciente ${this.paciente.critDamage}% | Bonus energía por golpe +${this._getOnHitBonus()}% | Bloqueo manipulación ${this.buffSystem.isAbilityBlocked('manipulacion') ? 'SI' : 'NO'}`
        );
    }

procesarGolpeJugador(tipo) {
        const bloqueandoPorVentana = this.nemesis.state === 'ATACANDO';
        const blockChance = bloqueandoPorVentana ? 0.70 : 0.32;

        if (Math.random() < blockChance) {
            this.infoText.setText('¡Bloqueado por el Némesis!');
            this.alertText.setText('¡BLOQUEO!');
            this.nemesis.setFillStyle(0x555555);
            console.log(`[DIFFICULTY] Bloqueo enemigo (${Math.round(blockChance * 100)}%) durante ${bloqueandoPorVentana ? 'ventana de ataque' : 'neutral'}`);
            this.time.delayedCall(150, () => {
                if (this.nemesis.hp > 0 && this.nemesis.state !== 'ATACANDO') this.nemesis.setFillStyle(0x882222);
                this.alertText.setText('');
            });
        } else {
            let damageCalculado = (tipo.includes('BAJO')) ? 8 : 12;
            
            // 🔥 NUEVO: Efecto de la carta 'Vulnerabilidad' (GOLPES CRÍTICOS)
            let esCritico = false;
            if (this.paciente.critDamage > 0 && Math.random() < 0.35) { // 35% de probabilidad de crítico si el buff está activo
                const extraDamage = Math.round(damageCalculado * (this.paciente.critDamage / 100));
                damageCalculado += extraDamage;
                esCritico = true;
            }

            // Dentro de procesarGolpeJugador (Caso golpe exitoso)
            console.log(`[BUFF CHECK] ¿Paciente tiene Multiplicador Crítico?: ${this.paciente.critDamage}%`);
            console.log(`[DAMAGE CHECK] Daño real aplicado al Némesis: ${damageCalculado}`);

            this.nemesis.hp -= damageCalculado;
            
            if (esCritico) {
                this.infoText.setText(`💥 ¡CRÍTICO! Golpe ${tipo} (-${damageCalculado} HP)`);
                this.alertText.setText('💥 CRÍTICO 💥');
                this.time.delayedCall(600, () => this.alertText.setText(''));
            } else {
                this.infoText.setText(`¡Golpe ${tipo}! (-${damageCalculado} HP)`);
            }
            
            // 🔥 NUEVO: Efecto 'on_hit' del BuffSystem (Cargar barra de súper extra con 'courage')
            let bonoEnergiaExtra = 0;
            const onHitEffects = this.registry.get('onHitBuff') ?? [];
            onHitEffects.forEach(effect => {
                if (effect.stat === 'courage' && (effect.targetKey === 'self' || effect.target === this.paciente)) {
                    bonoEnergiaExtra += effect.value; // Te da +5% de energía extra por golpe asestado
                }
            });

            // Incrementa y redimensiona la barra de Súper sumando el bono por valentía
            this.paciente.superMeter = Math.min(100, this.paciente.superMeter + 10 + bonoEnergiaExtra);
            this.superBar.setSize((this.paciente.superMeter / 100) * 150, 10);

            this.nemesisHPBar.setSize((Math.max(0, this.nemesis.hp) / 100) * 250, 20);
            this.cameras.main.shake(80, 0.01);
            this.nemesis.setFillStyle(0xffffff);
            
            this.tweens.add({
                targets: this.nemesis,
                scaleX: 1.1, duration: 50, yoyo: true,
                onComplete: () => { if (this.nemesis.hp > 0 && this.nemesis.state !== 'ATACANDO') this.nemesis.setFillStyle(0x882222); }
            });

            if (this.nemesis.hp <= 0) this.terminarCombate(true);
        }
    }

    procesarSuperJugador() {
        this.nemesis.setFillStyle(0x00ffff);
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
                    this.nemesis.setFillStyle(0x882222);
                    this.paciente.state = 'NEUTRAL'; 
                    this.infoText.setText('Estado: NEUTRAL');
                }
            }
        });
    }
procesarGolpeNemesis(data = {}) {
    if (this.paciente.hp <= 0) return;

    const { tipo = 'LATERAL', direccion = 'NINGUNA', dano = 10 } = data;

    // ── ESPECIAL — manejo separado (daño por tick) ────────────
    if (tipo === 'ESPECIAL') {
        this.paciente.hp = Math.max(0, this.paciente.hp - dano);
        this.pacienteHPbar.setSize((this.paciente.hp / 150) * 250, 20);
        this.cameras.main.shake(80, 0.01);

        if (this.paciente.hp <= 0) this.terminarCombate(false);
        return;
    }

    // ── LATERAL e IZQUIERDA/DERECHA ───────────────────────────
    let evadido   = false;
    let bloqueado = false;
    let razon     = '';

    if (tipo === 'LATERAL') {
        // Esquive correcto: moverse al lado contrario
        if (direccion === 'IZQUIERDA' && this.paciente.lastDodgeDirection === 'DERECHA') {
            evadido = true;
            razon   = '¡Esquive perfecto! (IZQ → moviste DER)';
        }
        if (direccion === 'DERECHA' && this.paciente.lastDodgeDirection === 'IZQUIERDA') {
            evadido = true;
            razon   = '¡Esquive perfecto! (DER → moviste IZQ)';
        }
        // Agachado no esquiva un golpe lateral
        if (!evadido && this.paciente.state === 'AGACHADO') {
            evadido = false;
        }
    }
// Agachado — solo esquiva ARRIBA y ESPECIAL, no laterales
    if (tipo === 'ARRIBA' || tipo === 'ESPECIAL') {
    if (this.paciente.state === 'AGACHADO' || this.paciente.isDucking) {
        evadido = true;
        razon = tipo === 'ARRIBA'
            ? '¡Pasó por arriba! (te agachaste)'
            : '¡Esquivaste el letrero!';
    }
}

    
    // ── Aplicar resultado ─────────────────────────────────────
    if (evadido) {
        this.infoText.setText(`✓ ${razon}`);

    } else if (bloqueado) {
        const chipDamage = 2;
        this.paciente.hp = Math.max(0, this.paciente.hp - chipDamage);
        this.pacienteHPbar.setSize((this.paciente.hp / 150) * 250, 20);
        this.infoText.setText(`Guardia firme (-${chipDamage} HP)`);
        this.cameras.main.shake(50, 0.005);

    } else {
        this.paciente.hp = Math.max(0, this.paciente.hp - dano);
        this.pacienteHPbar.setSize((this.paciente.hp / 150) * 250, 20);
        this.infoText.setText(`✗ ¡Golpe directo! (-${dano} HP)`);
        this.cameras.main.shake(250, 0.025);
        this.cameras.main.flash(100, 255, 0, 0);
    }

    // ── Limpieza ──────────────────────────────────────────────
    this.time.delayedCall(300, () => {
        this.nemesis.setFillStyle(0x882222);
        this.paciente.lastDodgeDirection = 'NINGUNA';
        this.alertText.setText('');

        if (this.paciente.state === 'NEUTRAL') {
            this.infoText.setText('Estado: NEUTRAL');
        }

        if (this.paciente.hp <= 0) {
            console.log('[DERROTA] El paciente ha caído.');
            this.terminarCombate(false);
        }
    });
}
    terminarCombate(victoria) {
        this.nemesis.attackTimer.destroy();

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
                round: this.currentRound,
                playerHp: this.paciente.hp,
                playerMaxHp: this.paciente.maxHp,
                playerEnergy: this.paciente.superMeter
            });

        } else if (this.currentRound === 3) {
            if (!this.nemesisRevived) {
                this.paciente.state = 'CINEMATIC';

                const lineasResurreccion = [
                    { speaker: 'patient', text: '¡Se acabó!, pensaba que me que me iba tomar de 6 a 7 rounds.' },
                    { speaker: 'dr', text: '¿Eso crees? El servicio al cliente te está llamando.' },
                    { speaker: 'nemesis', text: 'Jajaja... No puedes borrarme con puños. ¡SOY TU PROPIA CULPA!' },
                    { speaker: 'dr', text: '¡Hey! No estudiaste para terminar ahí, puedes vencerlo.' },
                    { speaker: 'patient', text: 'Es verdad... Solo necesito resistir un poco más y vencerme.' }
                ];

                this.cameras.main.fade(500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('DialogueScene', {
                        lines: lineasResurreccion,
                        nextScene: 'CombatScene',
                        nextData: {
                            currentRound: 3,
                            nemesisRevived: true,
                            savedPatientHp: this.paciente.hp
                        }
                    });
                });
            } else {
                this.paciente.state = 'CINEMATIC';
                
                const lineasVictoriaFinal = [
                    { speaker: 'nemesis', text: 'No... puede... ser... Te estás... aceptando...' },
                    { speaker: 'patient', text: 'Adiós, viejo. Creo que dejaré de tener tan poca confianza en mí mismo.' },
                    { speaker: 'system', text: '◈ ENHORABUENA: Has superado tus demonios internos.' }
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
}