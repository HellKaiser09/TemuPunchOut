import { Paciente } from '../entities/Paciente.js';
import { Nemesis } from '../entities/Nemesis.js';
import { BuffSystem } from '../systems/BuffSystem.js';

export class CombatScene extends Phaser.Scene {
/* ---------------------------------------------
¿Qué hace?
Registra formalmente la escena de pelea en el núcleo del motor Phaser bajo el identificador único 'CombatScene'.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
La clave string de acceso interno (`key`).

¿Qué controla?
La declaración del archivo dentro del config global.

Importancia
BAJA. Firma estructural requerida por Phaser.
------------------------------------------- */
    constructor() {
        super({ key: 'CombatScene' });
    }

/* ---------------------------------------------
¿Qué hace?
Recupera y empaqueta las variables de persistencia cuando la escena se reinicia o se cambia desde un diálogo (round actual, vida previa del jugador, si el enemigo ya mutó y mejoras por aplicar).

¿Qué podemos cambiar osea tamaños, espaciados, etc?
Los valores de respaldo por defecto (ej. iniciar la partida con menos vida base cambiando el `?? 150`).

¿Qué controla?
La memoria lógica transicional entre asaltos.

Importancia
ALTA. Si se rompe, el juego olvidará en qué round iba el jugador.
------------------------------------------- */
    init(data) {
        this.currentRound   = data?.currentRound   ?? 1;
        this.nemesisRevived = data?.nemesisRevived ?? false;
        this.savedPatientHp = data?.savedPatientHp ?? 150;
        this.pendingBuff    = data?.pendingBuff    ?? null;
    }

/* ---------------------------------------------
¿Qué hace?
Arma todo el campo de batalla: instancia los objetos invisibles de lógica (`Paciente` y `Nemesis`), fabrica los sprites visuales animados, inyecta el sistema de mejoras, inicializa las barras de vida/súper y lee las directrices del registro global para aplicar habilidades especiales.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- Escalas de los personajes (`setScale(0.70)`, `setScale(0.60)`).
- Profundidad de renderizado de capas (`setDepth(10)`).
- Medidas y coordenadas de la UI de vida (anchos de 250, posiciones X, Y).
- Configuración del Nerf/Buff del jefe final en modo furia (`this.nemesis.hp = 60`).
- Estilos de tipografías y colores de las alertas rojas o texto cyan del Súper.

¿Qué controla?
El renderizado inicial absoluto de los componentes del ring y el mapeo de animaciones en la lona.

Importancia
CRÍTICA. Es el constructor visual completo de la pelea.
------------------------------------------- */
    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.add.image(W / 2, H / 2, 'fondo_pelea').setDisplaySize(W, H);
        this.cameras.main.fadeIn(500, 0, 0, 0);

        // Animaciones del enemigo registradas en BootScene (se crean una vez al iniciar)

        this.nemesis  = new Nemesis(this, W / 2, H / 2 - 50);
        this.paciente = new Paciente(this, W / 2, H - 120);
        this.paciente.hp = this.savedPatientHp;
        this.nemesis.setVisible(false);
        this.paciente.setVisible(false);

        this.enemigo = this.add.sprite(this.nemesis.x, this.nemesis.y + 60, 'hamburguesa_golpe_izq_1');
        this.enemigo.setScale(0.70).setDepth(10).setVisible(true);

        this.enemigo.on('animationcomplete', (anim) => {
            if (anim.key === 'enemigo_batazo_izq' || anim.key === 'enemigo_batazo_der') {
                this.enemigo.setTexture('hamburguesa_golpe_izq_1');
            }
        });

        this.jugador = this.add.sprite(this.paciente.x, this.paciente.y, 'paciente_iddle');
        this.jugador.setScale(0.60).setDepth(5).setVisible(true);
        this.lastPacienteState = this.paciente.state;

        this.events.on('nemesis-atacar', (direccion) => {
            if (direccion === 'IZQUIERDA') this.enemigo.play('enemigo_batazo_izq', true);
            else if (direccion === 'DERECHA') this.enemigo.play('enemigo_batazo_der', true);
        });

        this.nemesis.base   = { ...(this.nemesis.base ?? {}), damage: 10 };
        this.nemesis.damage = this.nemesis.damage ?? this.nemesis.base.damage;

        this.buffSystem = new BuffSystem(this, this.paciente, this.nemesis);

        // El listener 'coach-buff-chosen' se eliminó para evitar listeners acumulados.
        // Ahora el flujo pasa por DialogueScene; cuando ésta termine emitirá
        // 'dialogue-next-coach' y arrancaremos la escena de Coach de forma limpia.
        this.events.off('dialogue-next-coach');
        this.events.on('dialogue-next-coach', () => {
            if (!this.pendingCoachData) return;
            const data = this.pendingCoachData;
            this.pendingCoachData = null;
            this.scene.start('CoachScene', data);
        });

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
            fontFamily: 'Arial, sans-serif', fontSize: '26px', color: '#ffd700', fontStyle: 'italic', align: 'center',
        }).setOrigin(0.5).setDepth(20);

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
Corre síncronamente amarrando la posición del cuadro de físicas con la posición visual del Sprite. Detecta si el estado interno del Paciente mutó para ordenar de inmediato un cambio de pose en la textura del dibujo.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
Los desfases de renderizado (como el `this.nemesis.y + 60` para centrar verticalmente a la hamburguesa).

¿Qué controla?
La sincronización exacta de posiciones físicas/gráficas fotograma a fotograma y el refresco continuo de la UI.

Importancia
CRÍTICA. Es el motor de actualización recurrente de la escena.
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
Consulta el catálogo lúdico-psicológico del juego para ver qué Buff seleccionó el usuario y escribe un recordatorio de apoyo emocional flotante abajo en el ring.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
Los textos, emojis y strings literales de los consejos de salud mental (`hints`).

¿Qué controla?
El despliegue de recordatorios informativos de las habilidades en la UI inferior.

Importancia
MEDIA. Aporta valor de feedback narrativo y refuerzo conceptual al proyecto.
------------------------------------------- */
    _refreshCombatUI() {
        if (!this.buffSystem || !this.paciente || !this.nemesis) return;
        if (!this.buffHintText) return;

        const active   = this.buffSystem.getActiveBuffs();
        const lastBuff = this.registry.get('lastBuff');

        const hints = {
            'autoestima':     '💚 Recuerda por qué elegiste el diseño.',
            'limites':        '🚧 Tu miedo solo tiene el poder que tú le das.',
            'vulnerabilidad': '🔥 Mostrarte es tu mayor fortaleza ahora.',
            'perdonarte':     '🕊️ Suelta el peso. Estás más ligero.',
        };

        this.buffHintText.setText(
            active.length > 0 && lastBuff ? (hints[lastBuff] || '') : ''
        );
    }

/* ---------------------------------------------
¿Qué hace?
Procesa matemáticamente los puñetazos QWER del jugador. Evalúa si el rival bloquea; si entra el golpe, calcula probabilidades de daño crítico, resta vida al Némesis, suma medidor de Súper, sacude la cámara (screenshake), genera un destello visual de impacto estirando el sprite del rival y revisa si el jefe murió.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- Las probabilidades de bloqueo (`0.70` en ataque, `0.32` en neutral).
- El daño base (`8` para bajos, `12` para altos).
- La probabilidad de asestar crítico (`0.35`) y la fuerza de sacudida de la pantalla (`shake(80, 0.01)`).
- La deformación del Sprite del enemigo al ser impactado (`scaleX: 1.6`, duración 50 ms).

¿Qué controla?
La resolución completa de las ofensivas físicas del jugador y las barras de interfaz enemigas.

Importancia
CRÍTICA. Es el núcleo reactivo de ataque del gameplay loop.
------------------------------------------- */
    procesarGolpeJugador(tipo) {
        const bloqueandoPorVentana = this.nemesis.state === 'ATACANDO';
        const blockChance = bloqueandoPorVentana ? 0.70 : 0.32;

        if (Math.random() < blockChance) {
            this.infoText.setText('¡Bloqueado por el Némesis!');
            this.alertText.setText('¡BLOQUEO!');
            this.enemigo.setTint(0x555555);
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

/* ---------------------------------------------
¿Qué hace?
Resuelve el poder especial de la barra de espacio. Tiñe al enemigo de cyan, flashea la pantalla entera, sacude violentamente la cámara, descuenta 50 HP fijos de vida al rival y desplaza verticalmente el cuerpo del Paciente simulando un golpe aplastante.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- El daño del súper (`50` HP).
- La intensidad del destello (`300, 0, 255, 255`) y de la vibración (`500, 0.03`).
- La altura del brinco del Paciente (`this.paciente.baseY - 80`).

¿Qué controla?
La activación del ataque definitivo de recompensa del usuario.

Importancia
ALTA. Es la recompensa mecánica más poderosa del bucle de combate.
------------------------------------------- */
    procesarSuperJugador() {
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

/* ---------------------------------------------
¿Qué hace?
Calcula la efectividad de la defensa del jugador frente a los ganchos de la IA. Si es el ataque especial, inflige daño directo continuo (ticks). Si es lateral o vertical, evalúa si la dirección de esquive del Paciente coincide de forma opuesta al golpe para decretar un esquive perfecto, una guardia mitigada (50% de daño) o un golpe limpio devastador.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- El daño por defecto de la IA (`10`).
- El daño residual de la guardia firme (`chipDamage = 2`).
- El multiplicador por penalización de debilidad crítica (`dañoFinal * 1.25`).
- Los tiempos de sacudidas de pantalla y flasheos rojos de daño directo.

¿Qué controla?
Los sistemas relacionales de impacto y mitigación de daño sufridos por el avatar del usuario.

Importancia
CRÍTICA. Es el árbitro matemático que decide si el jugador se protegió a tiempo.
------------------------------------------- */
    procesarGolpeNemesis(data = {}) {
        if (this.paciente.hp <= 0) return;

        const dañoBase = this.nemesis.damage ?? 10;
        const { tipo = 'LATERAL', direccion = 'NINGUNA', dano = dañoBase } = data;

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
            this.paciente.hp = Math.max(0, this.paciente.hp - chipDamage);
            this.pacienteHPbar.setSize((this.paciente.hp / 150) * 250, 20);
            this.infoText.setText(`Guardia firme (-${chipDamage} HP)`);
            this.cameras.main.shake(50, 0.005);
        } else {
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

/* ---------------------------------------------
¿Qué hace?
Clausura la pelea y gestiona el flujo de escenas. En derrota, te manda a fundido a negro directo a `EndScene`. En victoria parcial (Rounds 1 y 2), congela la IA y gatilla el intermedio de mejoras. En Round 3, despliega las novelas visuales cinemáticas del "Falso Final" o la victoria absoluta.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
- Tiempos de transiciones y cortinas negras (`500`, `800`, `1000` ms).
- Los strings de los textos narrativos de los personajes del Round 3.

¿Qué controla?
El enrutamiento macro y el finiquito del bucle principal de combate.

Importancia
CRÍTICA. Es el timón de flujo del juego.
------------------------------------------- */
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

            // Flujo redirigido: mostrar diálogo corto y luego abrir CoachScene
            this.pendingCoachData = {
                currentRound: this.currentRound + 1,
                playerHp: this.paciente.hp,
                playerMaxHp: this.paciente.maxHp,
                playerEnergy: this.paciente.superMeter
            };

            const lineasIntermedio = [
                { speaker: 'dr', text: 'Buen trabajo. Vamos a revisar tus opciones de mejora.' },
                { speaker: 'patient', text: '¿Qué debo escoger, doctor?' }
            ];

            this.cameras.main.fade(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('DialogueScene', {
                    lines: lineasIntermedio,
                    onFinishEvent: 'dialogue-next-coach'
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
Funciona como el director de arte de poses del jugador. Lee el estado lógico de `Paciente.js` y, mediante diccionarios asociativos, intercambia en caliente la textura de la imagen en pantalla para renderizar esquives o impactos específicos.

¿Qué podemos cambiar osea tamaños, espaciados, etc?
Los nombres de las claves de los assets cargados en memoria (ej. 'paciente_esquive_izq').

¿Qué controla?
La concordancia visual del avatar con las acciones del teclado del jugador.

Importancia
ALTA. Es el proveedor directo de feedback de posicionamiento en el ring.
------------------------------------------- */
    _updateJugadorTextura(estado) {
        if (!this.jugador) return;

        let textura = 'paciente_iddle';

        if (estado === 'ATACANDO' && this.paciente.lastPunchType) {
            const punchMap = {
                'ALTO_IZQ': 'paciente_arriba_izq',
                'ALTO_DER': 'paciente_arriba_der',
                'BAJO_IZQ': 'paciente_abajo_izq',
                'BAJO_DER': 'paciente_abajo_der',
            };
            textura = punchMap[this.paciente.lastPunchType] || 'paciente_iddle';
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
            textura = texturaMap[estado] || 'paciente_iddle';
        }

        this.jugador.setTexture(textura);
    }
}