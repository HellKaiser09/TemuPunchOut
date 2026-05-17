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
        this.currentRound   = data?.currentRound ?? 1;
        this.nemesisRevived  = data?.nemesisRevived ?? false;
        this.savedPatientHp  = data?.savedPatientHp ?? 150;
        this.pendingBuff     = data?.pendingBuff ?? null; 
    }

    // ── INICIALIZACIÓN DE ASSETS Y ELEMENTOS DEL RING ──
    create() {
        // 📐 SOLUCIÓN: Declaramos el tamaño de pantalla de forma segura para usar W y H
        const W = this.scale.width;
        const H = this.scale.height;

        // 🖼️ EL FONDO VA PRIMERO para que ningún personaje quede oculto detrás
        this.add.image(W / 2, H / 2, 'fondo_pelea').setDisplaySize(W, H);
        
        // Transición cinematográfica de entrada suave
        this.cameras.main.fadeIn(500, 0, 0, 0);

        // 🎬 1. REGISTRAR LA ANIMACIÓN DEL ENEMIGO (Usando tu asset del BootScene)
        this.anims.create({
            key: 'enemigo_batazo_izq',
            frames: this.anims.generateFrameNumbers('hamburguesa_golpe_izq', { start: 0, end: 2 }),
            frameRate: 12, // Velocidad arcade para el batazo
            repeat: 0      // Se ejecuta una sola vez por golpe
        });

        // Instanciación de entidades lógicas de tu compañero
        this.nemesis = new Nemesis(this, W / 2, H / 2 - 50);
        this.paciente = new Paciente(this, W / 2, H - 120);
        this.paciente.hp = this.savedPatientHp; 

        // 🙈 OCULTAR RECTÁNGULO DE PRUEBA: Apagamos el cuadro de color plano de la entidad Némesis
        // para que solo se vea tu personaje premium de la hamburguesa.
        this.nemesis.setVisible(false);

        // 🍔 2. INYECTAR EL SPRITE DE LA HAMBURGUESA ANIMADA
        this.enemigo = this.add.sprite(this.nemesis.x, this.nemesis.y + 60, 'hamburguesa_golpe_izq', 0);
        this.enemigo.setScale(0.70);
        this.enemigo.setDepth(10); // 🔥 FORZAR AL FRENTE: Evita que el fondo o la UI lo tapen

        // Retorno automático a la guardia al terminar el batazo
        this.enemigo.on('animationcomplete', (anim) => {
            if (anim.key === 'enemigo_batazo_izq') {
                this.enemigo.setFrame(0); 
            }
        });

        
        // Cuando el script de Nemesis.js grite 'nemesis-atacar', tu sprite reacciona al instante
        this.events.on('nemesis-atacar', (direccion) => {
            if (direccion === 'IZQUIERDA') {
                this.enemigo.play('enemigo_batazo_izq', true);
            }
            // NOTA: Si luego hacen la tira de la derecha, solo agregas:
            // if (direccion === 'DERECHA') this.enemigo.play('enemigo_batazo_der', true);
        });

        // Base explícita para que los debuffs de daño del enemigo sí afecten ataques reales.
        this.nemesis.base = { ...(this.nemesis.base ?? {}), damage: 10 };
        this.nemesis.damage = this.nemesis.damage ?? this.nemesis.base.damage;

        // Inicialización del ecosistema de modificadores lógicos (BuffSystem)
        this.buffSystem = new BuffSystem(this, this.paciente, this.nemesis);

        // ESCUCHADOR GLOBAL: Procesar la recompensa elegida en la esquina del Coach
        this.events.off('coach-buff-chosen'); 
        this.events.on('coach-buff-chosen', (buffId) => {
            this.currentRound++;
            this.scene.restart({
                currentRound: this.currentRound,
                savedPatientHp: this.paciente.hp,
                nemesisRevived: this.nemesisRevived,
                pendingBuff: buffId 
            });
        });

        // ── MAQUETACIÓN DE LA INTERFAZ DE USUARIO (UI) ──
        this.add.text(50, 30, `Paciente (Round ${this.currentRound}): `, { font: "16px Arial", fill: "#fff" });
        this.pacienteHPbar = this.add.rectangle(50, 55, 250, 20, 0x00ff00).setOrigin(0, 0.5);
        this.pacienteHPbar.setSize((this.paciente.hp / 150) * 250, 20);

        this.add.text(50, 85, "SÚPER:", { font: "12px monospace", fill: "#00ffff" });
        this.superBar = this.add.rectangle(100, 92, 0, 10, 0x00ffff).setOrigin(0, 0.5);
        this.superBar.setSize((this.paciente.superMeter / 100) * 150, 10);

        this.add.text(W - 300, 30, this.nemesisRevived ? 'NÉMESIS (💥 IRA CONSCIENTE)' : 'Némesis', { font: '16px Arial', fill: '#fff' });
        this.nemesisHPBar = this.add.rectangle(W - 300, 55, 250, 20, 0xff0000).setOrigin(0, 0.5);

        if (this.nemesisRevived) {
            this.nemesis.hp = 60; 
            this.nemesis.attackTimer.delay = 2500; 
        }

        this.infoText = this.add.text(W / 2, 20, 'Estado: NEUTRAL', { font: '18px monospace', fill: '#ffff00' }).setOrigin(0.5);
        this.countdownText = this.add.text(W / 2, 60, '', { font: '48px Arial', fill: '#00ff00', fontStyle: 'bold' }).setOrigin(0.5).setVisible(false);
        this.alertText = this.add.text(W / 2, 110, '', { font: '22px Arial', fill: '#ff3333', fontStyle: 'bold' }).setOrigin(0.5);

        // ── CONTENEDOR DIAGNÓSTICO DE BUFFS Y DEBUFFS ACTIVOS ──
        this.add.rectangle(W / 2, H - 95, 920, 100, 0x0b1526, 0.82).setStrokeStyle(2, 0x4f8bd8);
        this.effectsTitle = this.add.text(W / 2 - 445, H - 135, 'ESTADO DE COMBATE', {
            font: '14px monospace', fill: '#7ed7ff', fontStyle: 'bold'
        }).setOrigin(0, 0.5);
        
        this.buffLineText = this.add.text(W / 2 - 445, H - 112, 'BUFFS: ninguno', {
            font: '13px monospace', fill: '#6dff9d', wordWrap: { width: 900 }
        }).setOrigin(0, 0);
        
        this.debuffLineText = this.add.text(W / 2 - 445, H - 90, 'DEBUFFS: ninguno', {
            font: '13px monospace', fill: '#ff8f8f', wordWrap: { width: 900 }
        }).setOrigin(0, 0);
        
        this.statsLineText = this.add.text(W / 2 - 445, H - 68, 'STATS: --', {
            font: '13px monospace', fill: '#e5e7eb', wordWrap: { width: 900 }
        }).setOrigin(0, 0);

        // FLUJO DE INTERCEPCIÓN DE BUFFS
        const registryPendingBuff = this.registry.get('pendingBuff');
        if (!this.pendingBuff && registryPendingBuff) {
            this.pendingBuff = registryPendingBuff;
        }

        if (this.pendingBuff) {
            console.log(`[SISTEMA] Activando efectos de: ${this.pendingBuff} para el Round ${this.currentRound}`);
            this.buffSystem.apply(this.pendingBuff);
            this.registry.remove('pendingBuff');
            this.pendingBuff = null; 
        }

        this._refreshCombatUI();
    }

    update() {
        this.paciente.update();

        // 🔥 IMÁN DE POSITION: La hamburguesa copia la X y la Y lógica de Jesús en cada frame
        if (this.enemigo && this.nemesis) {
            this.enemigo.x = this.nemesis.x;
            this.enemigo.y = this.nemesis.y + 60; // Mantiene el ajuste de piso del ring
        }

        // Sincronización de las líneas de estados del panel de control inferior
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

    // ── SISTEMA DE EVENTOS OFENSIVOS DEL PROTAGONISTA ──
    procesarGolpeJugador(tipo) {
        const bloqueandoPorVentana = this.nemesis.state === 'ATACANDO';
        const blockChance = bloqueandoPorVentana ? 0.70 : 0.32;

        if (Math.random() < blockChance) {
            // Caso A: El golpe impacta en la guardia de la hamburguesa
            this.infoText.setText('¡Bloqueado por el Némesis!');
            this.alertText.setText('¡BLOQUEO!');
            
            // 🔥 MODIFICADO: Aplicamos el tinte gris de bloqueo directamente sobre tu nuevo Sprite
            this.enemigo.setTint(0x555555); 
            
            this.time.delayedCall(150, () => {
                this.enemigo.clearTint(); // Limpiamos el color gris
                this.alertText.setText('');
            });
        } else {
            // Caso B: El golpe conecta directo en el cuerpo del enemigo
            let damageCalculado = (tipo.includes('BAJO')) ? 8 : 12; 
            
            let esCritico = false;
            if (this.paciente.critDamage > 0 && Math.random() < 0.35) { 
                const extraDamage = Math.round(damageCalculado * (this.paciente.critDamage / 100));
                damageCalculado += extraDamage;
                esCritico = true;
            }

            this.nemesis.hp -= damageCalculado;
            
            if (esCritico) {
                this.infoText.setText(`💥 ¡CRÍTICO! Golpe ${tipo} (-${damageCalculado} HP)`);
                this.alertText.setText('💥 CRÍTICO 💥');
                this.time.delayedCall(600, () => this.alertText.setText(''));
            } else {
                this.infoText.setText(`¡Golpe ${tipo}! (-${damageCalculado} HP)`);
            }
            
            let bonoEnergiaExtra = 0;
            const onHitEffects = this.registry.get('onHitBuff') ?? [];
            onHitEffects.forEach(effect => {
                if (effect.stat === 'courage' && (effect.targetKey === 'self' || effect.target === this.paciente)) {
                    bonoEnergiaExtra += effect.value; 
                }
            });

            this.paciente.superMeter = Math.min(100, this.paciente.superMeter + 10 + bonoEnergiaExtra);
            this.superBar.setSize((this.paciente.superMeter / 100) * 150, 10);

            this.nemesisHPBar.setSize((Math.max(0, this.nemesis.hp) / 100) * 250, 20);
            this.cameras.main.shake(80, 0.01); 
            
            // 🔥 MODIFICADO: Destello momentáneo blanco en tu hamburguesa
            this.enemigo.setTint(0xffffff); 
            
            // 🔥 MODIFICADO: El Tween de impacto deforma ligeramente a la hamburguesa (Juice visual)
            this.tweens.add({
                targets: this.enemigo,
                scaleX: 1.6, 
                duration: 50, 
                yoyo: true,
                onComplete: () => { this.enemigo.clearTint(); }
            });

            if (this.nemesis.hp <= 0) this.terminarCombate(true);
        }
    }

    // ── CONTROL DEL SÚPER ATAQUE CINEMÁTICO ──
    procesarSuperJugador() {
        // 🔥 MODIFICADO: Tinte cyan directamente a tu personaje animado
        this.enemigo.setTint(0x00ffff);
        this.cameras.main.flash(300, 0, 255, 255); 
        this.cameras.main.shake(500, 0.03); 

        this.nemesis.hp -= 50; 
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
                    this.enemigo.clearTint(); // Limpiar rastro de color cyan
                    this.paciente.state = 'NEUTRAL'; 
                    this.infoText.setText('Estado: NEUTRAL');
                }
            }
        });
    }

    // ── SISTEMA DE RESOLUCIÓN DE IMPACTOS DE LA INTELIGENCIA ARTIFICIAL ──
    procesarGolpeNemesis(data = {}) {
        if (this.paciente.hp <= 0) return;

        const dañoBaseNemesis = this.nemesis.damage ?? 10;
        const { tipo = 'LATERAL', direccion = 'NINGUNA', dano = dañoBaseNemesis } = data;

        if (tipo === 'ESPECIAL') {
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
                razon   = '¡Esquive perfecto! (IZQ → moviste DER)';
            }
            if (direccion === 'DERECHA' && this.paciente.lastDodgeDirection === 'IZQUIERDA') {
                evadido = true;
                razon   = '¡Esquive perfecto! (DER → moviste IZQ)';
            }
        }

        if (tipo === 'ARRIBA' || tipo === 'ESPECIAL') {
            if (this.paciente.state === 'AGACHADO' || this.paciente.isDucking) {
                evadido = true;
                razon = tipo === 'ARRIBA' ? '¡Pasó por arriba! (te agachaste)' : '¡Esquivaste el letrero!';
            }
        }

        if (!evadido && this.paciente.state === 'BLOQUEANDO') {
            bloqueado = true;
        }
        
        if (evadido) {
            this.infoText.setText(`✓ ${razon}`);
        } else if (bloqueado) {
            const chipDamage = 2;
            this.paciente.hp = Math.max(0, this.paciente.hp - chipDamage);
            this.pacienteHPbar.setSize((this.paciente.hp / 150) * 250, 20);
            this.infoText.setText(`Guardia firme (-${chipDamage} HP)`);
            this.cameras.main.shake(50, 0.005);
        } else {
            let dañoFinal = dano;
            
            if (this.paciente.critDamage > 0) {
                dañoFinal = Math.round(dañoFinal * 1.25); 
                this.infoText.setText(`✗ ¡Impacto amplificado por Vulnerabilidad! (-${dañoFinal} HP)`);
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

            if (this.paciente.state === 'NEUTRAL') {
                this.infoText.setText('Estado: NEUTRAL');
            }

            if (this.paciente.hp <= 0) {
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

        // Flujo B: Victoria parcial -> Diálogo del Coach + Selección de Mejora (Rounds 1 y 2)
        if (this.currentRound === 1 || this.currentRound === 2) {
            this.paciente.state = 'CINEMATIC'; 
            this.buffSystem.tickRound(); 

            // Textos genéricos o dinámicos para cuando acaba el round
            const lineasCoach = [
                { speaker: 'dr', text: `¡Terminó el Round ${this.currentRound}! Tu mente está cansada, Paciente.` },
                { speaker: 'dr', text: 'Escucha con atención y elige una herramienta mental antes de volver al ring...' }
            ];

            this.cameras.main.fade(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('DialogueScene', {
                    lines: lineasCoach,
                    mostrarMenuCoach: true, // 🔥 Esto hará que salgan las opciones al terminar de hablar
                    nextScene: 'CombatScene',
                    
                    // Pasamos las vidas para el HUD superior
                    playerHp: this.paciente.hp,
                    playerMaxHp: this.paciente.maxHp,
                    nemesisHp: this.nemesis.hp,
                    nemesisMaxHp: this.nemesis.maxHp,

                    // Mandamos la info para el siguiente round
                    nextData: {
                        currentRound: this.currentRound + 1, // 🔥 Aumentamos el round aquí
                        savedPatientHp: this.paciente.hp,
                        nemesisRevived: this.nemesisRevived
                    }
                });
            });

        } else if (this.currentRound === 3) {
            // Flujo C: El clímax narrativo del tercer asalto (El "Falso Final")
            if (!this.nemesisRevived) {
                this.paciente.state = 'CINEMATIC';

                const lineasResurreccion = [
                    { speaker: 'patient', text: '¡Se acabó! Pensaba que me iba a tomar de 6 a 7 rounds.' },
                    { speaker: 'dr', text: '¿Eso crees? El servicio al cliente te está llamando.' },
                    { speaker: 'nemesis', text: 'Jajaja... No puedes borrarme con puños. ¡SOY TU PROPIA CULPA!' },
                    { speaker: 'dr', text: '¡Hey! No estudiaste para terminar ahí, puedes vencerlo.' },
                    { speaker: 'patient', text: 'Es verdad... Solo necesito resistir un poco más y vencerme.' }
                ];

                this.cameras.main.fade(500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('DialogueScene', {
                        lines: lineasResurreccion,
                        mostrarMenuCoach: false, // Aquí no hay menú, directo a pelear
                        nextScene: 'CombatScene',
                        
                        // Pasamos las vidas para el HUD superior
                        playerHp: this.paciente.hp,
                        playerMaxHp: this.paciente.maxHp,
                        nemesisHp: this.nemesis.hp,
                        nemesisMaxHp: this.nemesis.maxHp,

                        nextData: {
                            currentRound: 3,
                            nemesisRevived: true, // Forzamos flag de resurrección para el reenganche
                            savedPatientHp: this.paciente.hp
                        }
                    });
                });
            } else {
                // Flujo D: Segundo noqueo del Round 3 -> Redención y Victoria Final
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
                        mostrarMenuCoach: false,
                        nextScene: 'EndScene',
                        
                        // Pasamos las vidas (La hamburguesa tendrá 0HP aquí)
                        playerHp: this.paciente.hp,
                        playerMaxHp: this.paciente.maxHp,
                        nemesisHp: this.nemesis.hp,
                        nemesisMaxHp: this.nemesis.maxHp,

                        nextData: { victoria: true }
                    });
                });
            }
        }
    }
}