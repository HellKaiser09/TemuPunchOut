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
            this.buffSystem.apply(buffId); // Aplica el buff lógicamente
            
            // Avanzamos de round y reiniciamos el ring
            this.currentRound++;
            this.scene.restart({
                currentRound: this.currentRound,
                savedPatientHp: this.paciente.hp,
                nemesisRevived: this.nemesisRevived
            });
        });

        // ── INTERFAZ DE USUARIO (UI) ──────────────────────────────
        // Barra de Vida del Paciente
        this.add.text(50, 30, `Paciente (Round ${this.currentRound}): `, { font: "16px Arial", fill: "#fff" });
        this.pacienteHPbar = this.add.rectangle(50, 55, 250, 20, 0x00ff00).setOrigin(0, 0.5);
        this.pacienteHPbar.setSize((this.paciente.hp / 150) * 250, 20);

        // 🔥 LA SOLUCIÓN ACÁ: Se volvió a agregar la barra de Súper que se había borrado
        this.add.text(50, 85, "SÚPER:", { font: "12px monospace", fill: "#00ffff" });
        this.superBar = this.add.rectangle(100, 92, 0, 10, 0x00ffff).setOrigin(0, 0.5);
        // Inicializamos el tamaño visual del súper acumulado
        this.superBar.setSize((this.paciente.superMeter / 100) * 150, 10);

        // Barra de Vida del Némesis
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
    }

    update() {
        // Ejecuta el bucle de inputs del prota
        this.paciente.update();
    }

    procesarGolpeJugador(tipo) {
        if (Math.random() < 0.20) {
            this.infoText.setText('¡Bloqueado por el Némesis!');
            this.alertText.setText('🛡️ ¡BLOQUEO!');
            this.nemesis.setFillStyle(0x555555);
            this.time.delayedCall(150, () => {
                if (this.nemesis.hp > 0 && this.nemesis.state !== 'ATACANDO') this.nemesis.setFillStyle(0x882222);
                this.alertText.setText('');
            });
        } else {
            const damage = (tipo.includes('BAJO')) ? 8 : 12;
            this.nemesis.hp -= damage;
            this.infoText.setText(`¡Golpe ${tipo}! (-${damage} HP)`);
            
            // Incrementa y redimensiona la barra de Súper perfectamente
            this.paciente.superMeter = Math.min(100, this.paciente.superMeter + 10);
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

    procesarGolpeNemesis() {
        if (this.nemesis.hp <= 0) return;

        const colorAtaque = this.nemesis.attackDirection === 'IZQUIERDA' ? 0xff2200 : 0x2200ff;
        this.nemesis.setFillStyle(colorAtaque);

        let evadido = false;
        let bloqueado = false;
        let razonEvasion = "";

        if (this.nemesis.attackDirection === 'IZQUIERDA' && this.paciente.lastDodgeDirection === 'DERECHA') {
            evadido = true;
            razonEvasion = "¡Esquive Perfecto! (Ataque IZQ → Moviste DER)";
        }
        if (this.nemesis.attackDirection === 'DERECHA' && this.paciente.lastDodgeDirection === 'IZQUIERDA') {
            evadido = true;
            razonEvasion = "¡Esquive Perfecto! (Ataque DER → Moviste IZQ)";
        }

        if (this.paciente.state === 'AGACHADO') {
            if (this.nemesis.attackType === 'ALTO') {
                evadido = true;
                razonEvasion = "¡Pasó por arriba! (Te agachaste de un golpe ALTO)";
            } else {
                evadido = false; 
                console.log("[¡PUM!] El paciente se agachó ante un golpe bajo.");
            }
        }

        if (this.paciente.state === 'BLOQUEANDO') {
            bloqueado = true;
        }

        if (evadido) {
            this.infoText.setText(`✓ ${razonEvasion}`);
            console.log(`[EVADIDO] ${razonEvasion}`);
        } else if (bloqueado) {
            const chipDamage = 2;
            this.paciente.hp -= chipDamage;
            this.infoText.setText(`🛡️ Guardia firme (-${chipDamage} HP - Daño mitigado)`);
            this.pacienteHPbar.setSize((Math.max(0, this.paciente.hp) / 150) * 250, 20);
            this.cameras.main.shake(50, 0.005);
        } else {
            const fullDamage = 10;
            this.paciente.hp -= fullDamage;
            this.infoText.setText(`✗ ¡Golpe directo! (-${fullDamage} HP)`);
            this.pacienteHPbar.setSize((Math.max(0, this.paciente.hp) / 150) * 250, 20);
            this.cameras.main.shake(250, 0.025);
            this.cameras.main.flash(100, 255, 0, 0);
        }

        this.time.delayedCall(300, () => {
            this.nemesis.setFillStyle(0x882222);
            this.nemesis.state = 'IDLE';
            this.nemesis.attackDirection = 'NINGUNA';
            this.paciente.lastDodgeDirection = 'NINGUNA';
            this.alertText.setText('');
            
            if (this.paciente.state === 'NEUTRAL') this.infoText.setText('Estado: NEUTRAL');
            
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
                    { speaker: 'patient', text: '¡Se acabó! Caíste... por fin saldrás de mi cabeza.' },
                    { speaker: 'dr', text: '¿Eso crees? Míralo... no se está desvaneciendo. ¡Se está levantando con más fuerza!' },
                    { speaker: 'nemesis', text: 'Jajaja... No puedes borrarme con puños. ¡SOY TU PROPIA CULPA!' },
                    { speaker: 'dr', text: '¡Paciente, escúchame! No lo niegues, acéptalo como parte de tu historia, ¡pero quítale el control de tu vida!' },
                    { speaker: 'patient', text: 'Es verdad... eres mi pasado. Te acepto, pero ya NO me vas a dominar. ¡ÚLTIMO ASALTO!' }
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
                    { speaker: 'nemesis', text: 'No... puede... ser... Te estás... perdonando...' },
                    { speaker: 'patient', text: 'Adiós, viejo fantasma. Hoy decido avanzar.' },
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