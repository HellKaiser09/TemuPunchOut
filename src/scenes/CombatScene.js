import { Paciente } from '../entities/Paciente.js';
import { Nemesis } from '../entities/Nemesis.js';
import { BuffSystem } from '../systems/BuffSystem.js';

/**
 * Escena principal del bucle de combate.
 * Controla el flujo de los asaltos, la resolución de impactos, mitigaciones de daño,
 * y la persistencia de los estados lógicos y de juego.
 */
export class CombatScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CombatScene' });
    }

    // ── MIGRACIÓN Y PERSISTENCIA DE DATOS ENTRE ROUNDS ──
    init(data) {
        // Control del asalto actual (Por defecto Round 1)
        this.currentRound   = data?.currentRound ?? 1;
        
        // Flag que rastrea si el Némesis ya resucitó en el clímax dramático
        this.nemesisRevived  = data?.nemesisRevived ?? false;
        
        // Conservación del estado de salud del prota entre transiciones
        this.savedPatientHp  = data?.savedPatientHp ?? 150;

        // Buff seleccionado en la escena del Coach pendiente por procesar
        this.pendingBuff     = data?.pendingBuff ?? null; 
    }

    // ── INICIALIZACIÓN DE ASSETS Y ELEMENTOS DEL RING ──
    create() {
        // Transición cinematográfica de entrada suave
        this.cameras.main.fadeIn(500, 0, 0, 0);
        
        const width = this.sys.game.config.width;
        const height = this.sys.game.config.height;

        // Instanciación de entidades modulares (Inyección de dependencias)
        this.nemesis = new Nemesis(this, width / 2, height / 2 - 50);
        this.paciente = new Paciente(this, width / 2, height - 120);
        this.paciente.hp = this.savedPatientHp; // Restauramos la vida acumulada

        // Inicialización del ecosistema de modificadores lógicos (BuffSystem)
        this.buffSystem = new BuffSystem(this, this.paciente, this.nemesis);

        // ESCUCHADOR GLOBAL: Procesar la recompensa elegida en la esquina del Coach
        this.events.off('coach-buff-chosen'); 
        this.events.on('coach-buff-chosen', (buffId) => {
            this.currentRound++;
            // Viaje de datos hacia el siguiente asalto de forma limpia
            this.scene.restart({
                currentRound: this.currentRound,
                savedPatientHp: this.paciente.hp,
                nemesisRevived: this.nemesisRevived,
                pendingBuff: buffId 
            });
        });

        // ── MAQUETACIÓN DE LA INTERFAZ DE USUARIO (UI) ──
        // Sección de salud del Paciente
        this.add.text(50, 30, `Paciente (Round ${this.currentRound}): `, { font: "16px Arial", fill: "#fff" });
        this.pacienteHPbar = this.add.rectangle(50, 55, 250, 20, 0x00ff00).setOrigin(0, 0.5);
        this.pacienteHPbar.setSize((this.paciente.hp / 150) * 250, 20);

        // Barra medidora del Súper Ataque
        this.add.text(50, 85, "SÚPER:", { font: "12px monospace", fill: "#00ffff" });
        this.superBar = this.add.rectangle(100, 92, 0, 10, 0x00ffff).setOrigin(0, 0.5);
        this.superBar.setSize((this.paciente.superMeter / 100) * 150, 10);

        // Sección de salud del Némesis
        this.add.text(width - 300, 30, this.nemesisRevived ? 'NÉMESIS (💥 IRA CONSCIENTE)' : 'Némesis', { font: '16px Arial', fill: '#fff' });
        this.nemesisHPBar = this.add.rectangle(width - 300, 55, 250, 20, 0xff0000).setOrigin(0, 0.5);

        // BALANCEO CLÍMAX: Modificadores de peligro si la sombra se reincorpora en el Round 3
        if (this.nemesisRevived) {
            this.nemesis.hp = 60; 
            this.nemesis.attackTimer.delay = 2500; // Incremento drástico de velocidad
        }

        // Canales independientes de textos para alertas y mecánicas
        this.infoText = this.add.text(width / 2, 20, 'Estado: NEUTRAL', { font: '18px monospace', fill: '#ffff00' }).setOrigin(0.5);
        this.countdownText = this.add.text(width / 2, 60, '', { font: '48px Arial', fill: '#00ff00', fontStyle: 'bold' }).setOrigin(0.5).setVisible(false);
        this.alertText = this.add.text(width / 2, 110, '', { font: '22px Arial', fill: '#ff3333', fontStyle: 'bold' }).setOrigin(0.5);

        // ── CONTENEDOR DIAGNÓSTICO DE BUFFS Y DEBUFFS ACTIVOS ──
        this.add.rectangle(width / 2, height - 95, 920, 100, 0x0b1526, 0.82).setStrokeStyle(2, 0x4f8bd8);
        this.effectsTitle = this.add.text(width / 2 - 445, height - 135, 'ESTADO DE COMBATE', {
            font: '14px monospace', fill: '#7ed7ff', fontStyle: 'bold'
        }).setOrigin(0, 0.5);
        
        this.buffLineText = this.add.text(width / 2 - 445, height - 112, 'BUFFS: ninguno', {
            font: '13px monospace', fill: '#6dff9d', wordWrap: { width: 900 }
        }).setOrigin(0, 0);
        
        this.debuffLineText = this.add.text(width / 2 - 445, height - 90, 'DEBUFFS: ninguno', {
            font: '13px monospace', fill: '#ff8f8f', wordWrap: { width: 900 }
        }).setOrigin(0, 0);
        
        this.statsLineText = this.add.text(width / 2 - 445, height - 68, 'STATS: --', {
            font: '13px monospace', fill: '#e5e7eb', wordWrap: { width: 900 }
        }).setOrigin(0, 0);

        // FLUJO DE INTERCEPCIÓN: Aplicar el modificador lógicamente en el nuevo ciclo de vida
        if (this.pendingBuff) {
            console.log(`[SISTEMA] Activando efectos de: ${this.pendingBuff} para el Round ${this.currentRound}`);
            this.buffSystem.apply(this.pendingBuff);
            this.pendingBuff = null; // Vaciamos el búfer
        }

        this._refreshCombatUI();
    }

    // ── BUCLE PRINCIPAL DE ACTUALIZACIÓN VISUAL Y CONTROL ──
    update() {
        // Delegación de inputs del teclado al objeto del protagonista
        this.paciente.update();
        // Sincronización de las líneas de estados del panel de control inferior
        this._refreshCombatUI();
    }

    /**
     * Calcula la acumulación de energía adicional ganada por golpes asestados (Efecto Courage)
     * @returns {number} Porcentaje acumulado de recarga de Súper
     */
    _getOnHitBonus() {
        const onHitEffects = this.registry.get('onHitBuff') ?? [];
        return onHitEffects
            .filter(effect => effect.stat === 'courage' && effect.targetKey === 'self')
            .reduce((acc, effect) => acc + effect.value, 0);
    }

    /**
     * Transforma la matriz lógica interna de BuffSystem en etiquetas legibles en pantalla.
     */
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

    // ── SISTEMA DE EVENTOS OFENSIVOS DEL PROTAGONISTA ──
    procesarGolpeJugador(tipo) {
        // Ventana de Reacción: Si la IA está atacando es más probable que bloquee tu contraataque
        const bloqueandoPorVentana = this.nemesis.state === 'ATACANDO';
        const blockChance = bloqueandoPorVentana ? 0.70 : 0.32;

        if (Math.random() < blockChance) {
            // Caso A: El golpe impacta en la guardia del enemigo
            this.infoText.setText('¡Bloqueado por el Némesis!');
            this.alertText.setText('¡BLOQUEO!');
            this.nemesis.setFillStyle(0x555555); // Feedback visual gris metálico
            
            console.log(`[DIFFICULTY] Bloqueo enemigo (${Math.round(blockChance * 100)}%) durante ${bloqueandoPorVentana ? 'ventana de ataque' : 'neutral'}`);
            
            this.time.delayedCall(150, () => {
                if (this.nemesis.hp > 0 && this.nemesis.state !== 'ATACANDO') this.nemesis.setFillStyle(0x882222);
                this.alertText.setText('');
            });
        } else {
            // Caso B: El golpe conecta directo en el cuerpo del enemigo
            let damageCalculado = (tipo.includes('BAJO')) ? 8 : 12; // Daño diferencial alto/bajo
            
            // MECÁNICA RPG: Inyección del modificador de la carta 'Vulnerabilidad' (Críticos)
            let esCritico = false;
            if (this.paciente.critDamage > 0 && Math.random() < 0.35) { 
                const extraDamage = Math.round(damageCalculado * (this.paciente.critDamage / 100));
                damageCalculado += extraDamage;
                esCritico = true;
            }

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
            
            // MECÁNICA RPG: Bono acumulado por efectos On Hit (Valentía)
            let bonoEnergiaExtra = 0;
            const onHitEffects = this.registry.get('onHitBuff') ?? [];
            onHitEffects.forEach(effect => {
                if (effect.stat === 'courage' && (effect.targetKey === 'self' || effect.target === this.paciente)) {
                    bonoEnergiaExtra += effect.value; 
                }
            });

            // Actualización del medidor de energía cinemática (Súper)
            this.paciente.superMeter = Math.min(100, this.paciente.superMeter + 10 + bonoEnergiaExtra);
            this.superBar.setSize((this.paciente.superMeter / 100) * 150, 10);

            this.nemesisHPBar.setSize((Math.max(0, this.nemesis.hp) / 100) * 250, 20);
            this.cameras.main.shake(80, 0.01); // "Juice" visual de impacto ligero
            this.nemesis.setFillStyle(0xffffff); // Destello momentáneo blanco
            
            this.tweens.add({
                targets: this.nemesis,
                scaleX: 1.1, duration: 50, yoyo: true,
                onComplete: () => { if (this.nemesis.hp > 0 && this.nemesis.state !== 'ATACANDO') this.nemesis.setFillStyle(0x882222); }
            });

            if (this.nemesis.hp <= 0) this.terminarCombate(true);
        }
    }

    // ── CONTROL DEL SÚPER ATAQUE CINEMÁTICO ──
    procesarSuperJugador() {
        this.nemesis.setFillStyle(0x00ffff);
        this.cameras.main.flash(300, 0, 255, 255); // Destello cyan destructivo
        this.cameras.main.shake(500, 0.03); // Sacudida masiva de pantalla

        this.nemesis.hp -= 50; // Daño bruto crítico masivo
        this.nemesisHPBar.setSize((Math.max(0, this.nemesis.hp) / 100) * 250, 20);

        this.tweens.add({
            targets: this.paciente,
            y: this.paciente.baseY - 80, scaleX: 1.3, duration: 200, yoyo: true,
            onComplete: () => {
                this.paciente.y = this.paciente.baseY;
                this.paciente.setScale(1, 1);
                
                if (this.nemesis.hp <= 0) {
                    this.terminarCombate(true);
                } else {
                    this.nemesis.setFillStyle(0x882222);
                    this.paciente.state = 'NEUTRAL'; // Desbloqueo del State Lock anti-congelamiento
                    this.infoText.setText('Estado: NEUTRAL');
                }
            }
        });
    }

    // ── SISTEMA DE RESOLUCIÓN DE IMPACTOS DE LA INTELIGENCIA ARTIFICIAL ──
    procesarGolpeNemesis(data = {}) {
        if (this.paciente.hp <= 0) return;

        // Desglose de parámetros enviados por la IA del enemigo
        const { tipo = 'LATERAL', direccion = 'NINGUNA', dano = 10 } = data;

        // 🛡️ SUB-PROCESO ESPECIAL: Manejo de amenazas continuas/Obstáculos (Letreros)
        if (tipo === 'ESPECIAL') {
            this.paciente.hp = Math.max(0, this.paciente.hp - dano);
            this.pacienteHPbar.setSize((this.paciente.hp / 150) * 250, 20);
            this.cameras.main.shake(80, 0.01);

            if (this.paciente.hp <= 0) this.terminarCombate(false);
            return;
        }

        // Variables de decisión de la ventana de esquive (Fórmula original Punch-Out)
        let evadido   = false;
        let bloqueado = false;
        let razon     = '';

        // 1. CONDICIONALES DE ATAQUES LATERALES (Mezcla Izquierda / Derecha)
        if (tipo === 'LATERAL') {
            if (direccion === 'IZQUIERDA' && this.paciente.lastDodgeDirection === 'DERECHA') {
                evadido = true;
                razon   = '¡Esquive perfecto! (IZQ → moviste DER)';
            }
            if (direccion === 'DERECHA' && this.paciente.lastDodgeDirection === 'IZQUIERDA') {
                evadido = true;
                razon   = '¡Esquive perfecto! (DER → moviste IZQ)';
            }
            if (!evadido && this.paciente.state === 'AGACHADO') {
                evadido = false; // Agacharse no te salva de ganchos laterales directos
            }
        }

        // 2. CONDICIONALES DE ATAQUES VERTICALES (Pases por arriba)
        if (tipo === 'ARRIBA' || tipo === 'ESPECIAL') {
            if (this.paciente.state === 'AGACHADO' || this.paciente.isDucking) {
                evadido = true;
                razon = tipo === 'ARRIBA' ? '¡Pasó por arriba! (te agachaste)' : '¡Esquivaste el letrero!';
            }
        }

        // 3. CONDICIONAL DE DETECCIÓN DE GUARDIA ACTIVA
        if (!evadido && this.paciente.state === 'BLOQUEANDO') {
            bloqueado = true;
        }
        
        // ── RESOLUCIÓN DE MATRIZ DE DAÑO Y MITIGACIONES ──
        if (evadido) {
            // Caso I: Esquive limpio exitoso
            this.infoText.setText(`✓ ${razon}`);

        } else if (bloqueado) {
            // Caso II: Chip Damage (Daño por absorción balanceado)
            const chipDamage = 2;
            this.paciente.hp = Math.max(0, this.paciente.hp - chipDamage);
            this.pacienteHPbar.setSize((this.paciente.hp / 150) * 250, 20);
            this.infoText.setText(`Guardia firme (-${chipDamage} HP)`);
            this.cameras.main.shake(50, 0.005);

        } else {
            // Caso III: El golpe conecta directo (Castigo por error)
            let dañoFinal = dano;
            
            // DESVENTAJA DE ROL: Si tienes Vulnerabilidad activa, sufres castigo amplificado
            if (this.paciente.critDamage > 0) {
                dañoFinal = Math.round(dañoFinal * 1.25); // +25% de dolor por heridas expuestas
                this.infoText.setText(`✗ ¡Impacto amplificado por Vulnerabilidad! (-${dañoFinal} HP)`);
            } else {
                this.infoText.setText(`✗ ¡Golpe directo! (-${dañoFinal} HP)`);
            }

            this.paciente.hp = Math.max(0, this.paciente.hp - dañoFinal);
            this.pacienteHPbar.setSize((this.paciente.hp / 150) * 250, 20);
            
            // "Juice" visual violento por impacto directo recibido
            this.cameras.main.shake(250, 0.025);
            this.cameras.main.flash(100, 255, 0, 0); // Destello de dolor rojo sangre
        }

        // ── REINICIO DE LOS FRAMES DE RECUPERACIÓN (300ms) ──
        this.time.delayedCall(300, () => {
            this.nemesis.setFillStyle(0x882222); // Restablecer color base carmesí
            this.paciente.lastDodgeDirection = 'NINGUNA';
            this.alertText.setText('');

            if (this.paciente.state === 'NEUTRAL') {
                this.infoText.setText('Estado: NEUTRAL');
            }

            // Comprobación fulminante de Game Over
            if (this.paciente.hp <= 0) {
                console.log('[DERROTA] El paciente ha caído.');
                this.terminarCombate(false);
            }
        });
    }

    // ── REGLAS DE ENRUTAMIENTO CINEMÁTICO Y NARRATIVO DEL RÉFERI ──
    terminarCombate(victoria) {
        this.nemesis.attackTimer.destroy(); // Detenemos disparos de la IA

        if (!victoria) {
            // Flujo A: Derrota absoluta -> Fundido a negro hacia la pantalla de KO
            this.cameras.main.fade(800, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('EndScene', { victoria: false });
            });
            return;
        }

        // Flujo B: Victoria parcial -> Lanzamiento estratégico del Coach (Rounds 1 y 2)
        if (this.currentRound === 1 || this.currentRound === 2) {
            this.paciente.state = 'CINEMATIC'; 
            this.buffSystem.tickRound(); // Consumir tiempo de duración de ventajas lógicas

            // Lanzamos overlay del Coach de forma superpuesta sin pausar el fondo
            this.scene.launch('CoachScene', {
                round: this.currentRound,
                playerHp: this.paciente.hp,
                playerMaxHp: this.paciente.maxHp,
                playerEnergy: this.paciente.superMeter
            });

        } else if (this.currentRound === 3) {
            // Flujo C: El clímax narrativo del tercer asalto (El "Falso Final")
            if (!this.nemesisRevived) {
                this.paciente.state = 'CINEMATIC';

                // Líneas guionadas de la transformación/resurrección
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
                            nemesisRevived: true, // Forzamos flag de resurrección para el reenganche
                            savedPatientHp: this.paciente.hp
                        }
                    });
                });
            } else {
                // Flujo D: Segundo noqueo del Round 3 -> Redención y Victoria Final del juego
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