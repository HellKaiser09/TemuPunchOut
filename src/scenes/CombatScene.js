export class CombatScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CombatScene' });
    }

    create() {
        console.log('La CombatScene ya esta cargando::::::');
        this.cameras.main.fadeIn(500, 0, 0, 0);


        // Primero vamos a cargar las dimensiones que se sacaron del config
        const width = this.sys.game.config.width;
        const height = this.sys.game.config.height;

        //Creamos los sprites provisionales para probar que sirven las cosas
        this.nemesis = this.add.rectangle(width / 2, height / 2 - 50, 200, 250, 0x882222);
        this.paciente = this.add.rectangle(width / 2, height - 120, 120, 180, 0x224488);

        //ESTO ES LA INTERFAZ DEL JUEGO(TEMPORAL)
        this.add.text(50, 30, "Diseñador: ", { font: "16px Arial", fill: "#fff" });
        this.pacienteHPbar = this.add.rectangle(50, 55, 250, 20, 0x00ff00).setOrigin(0, 0.5);

        this.add.text(width - 300, 30, 'nemesis', { font: '16px Arial', fill: '#fff' });
        this.nemesisHPBar = this.add.rectangle(width - 300, 55, 250, 20, 0xff0000).setOrigin(0, 0.5);

        // Configuracion de los inputs (aqui aun lo podemos modificar... checalo tu jesus para cambiarlo )
        // Por ahora usamos las Flechas para esquivar/bloquear y Espacio para golpear
        this.controls = this.input.keyboard.createCursorKeys();
        // Tecla extra para el golpe por si quieren testearla
        this.punchKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        //ESTADOS LOGICOS DE LOS PERSONAJES
        this.pacienteState = "NEUTRAL"; // Estados posibles: NEUTRAL, ESQUIVE_IZQ, ESQUIVE_DER, BLOQUEO, ATACANDO
        this.nemesisState = "IDLE"; // El ritmo del nemesis que cambia segun los dialogos

        // Texto informativo en pantalla
        this.infoText = this.add.text(width / 2, 20, 'Estado: NEUTRAL', { font: '18px monospace', fill: '#ffff00' }).setOrigin(0.5);

        // Contador de esquiva
        this.countdownText = this.add.text(width / 2, 60, '', { font: '48px Arial', fill: '#00ff00', fontStyle: 'bold' }).setOrigin(0.5);
        this.countdownText.setVisible(false);

        this.pacienteHP = 150;
        this.nemesisHP = 100; 
        this.nemesisAttackDirection = "NINGUNA"; 
        this.pacienteBaseY = this.paciente.y;

        this.nemesisTimer = this.time.addEvent({
            delay: 4500,
            callback: this.startNemesisAttack,
            callbackScope: this,
            loop: true
        });
    }

    update() {
        //Manejos de los inputs y los estados del jugador osea la logica de los golpes y asi 
        if (this.pacienteState === "NEUTRAL") {
            if (this.controls.left.isDown) {
                this.executeDodge("IZQUIERDA");
            } else if (this.controls.right.isDown) {
                this.executeDodge("DERECHA");
            } else if (this.controls.down.isDown) {
                this.executeBlock();
            } else if (Phaser.Input.Keyboard.JustDown(this.punchKey)) {
                this.executePunch();
            }
        }
    }

    executeDodge(direction) {
        this.pacienteState = direction === "IZQUIERDA" ? "ESQUIVE_IZQ" : "ESQUIVE_DER";
        this.infoText.setText(`Estado: ESQUIVE ${direction}`);

        const offset = direction === "IZQUIERDA" ? -60 : 60;

        this.tweens.add({
            targets: this.paciente,
            x: (this.sys.game.config.width / 2) + offset,
            duration: 150,
            yoyo: true,
            hold: 100,
            onComplete: () => {
                this.pacienteState = "NEUTRAL";
                this.infoText.setText("Estado: NEUTRAL");
            }
        }); 
    }

    executeBlock() {
        this.pacienteState = 'BLOQUEANDO';
        this.infoText.setText('Estado: BLOQUEO');
        this.paciente.setScale(1, 0.8); // Se "agacha" o encoge temporalmente

        // Volver a neutral cuando suelte la tecla de flecha abajo
        this.input.keyboard.once('keyup-DOWN', () => {
            this.paciente.setScale(1, 1);
            this.pacienteState = 'NEUTRAL';
            this.infoText.setText('Estado: NEUTRAL');
        });
    }

    executePunch() {
    if (this.tweens.isTweening(this.paciente) || this.nemesisHP <= 0) return;

    this.pacienteState = 'ATACANDO';
    const damageDealt = 10;
    this.infoText.setText(`Golpe lanzado (-${damageDealt} HP al nemesis)`);

    // LÓGICA DE DAÑO AL NEMESIS
    this.nemesisHP -= damageDealt;
    const clampedEnemyHP = Math.max(0, this.nemesisHP);
    this.nemesisHPBar.setSize((clampedEnemyHP / 100) * 250, 20);

    // 🔥 NUEVO: FEEDBACK VISUAL EN EL ENEMIGO (Efecto de impacto)
    this.cameras.main.shake(100, 0.01); // Agita la cámara (duración ms, intensidad)
    this.nemesis.setFillStyle(0xffffff); // Se pone blanco un instante por el impacto
    
    this.tweens.add({
        targets: this.nemesis,
        scaleX: 1.1, // Se deforma lateralmente
        scaleY: 0.9,
        duration: 50,
        yoyo: true,
        onComplete: () => { if(this.nemesisHP > 0) this.nemesis.setFillStyle(0x882222); }
    });

    this.tweens.add({
        targets: this.paciente,
        y: this.pacienteBaseY - 40, 
        duration: 80,
        yoyo: true,
        onComplete: () => {
            this.pacienteState = 'NEUTRAL';
            this.infoText.setText('Estado: NEUTRAL');
            this.paciente.y = this.pacienteBaseY;

            // 🎬 NUEVO: CHECK DE VICTORIA CON TRANSICIÓN SUAVE (FADE OUT)
            if (this.nemesisHP <= 0) {
                this.nemesisTimer.destroy(); 
                this.infoText.setText('¡Demonio derrotado! Yendo a descansar...');
                
                // Iniciamos fade out a negro (800ms)
                this.cameras.main.fade(800, 0, 0, 0);
                
                // Esperamos a que la cámara termine de oscurecerse para cambiar de escena
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('DialogueScene');
                });
            }
        }
    });
}

    startNemesisAttack() {
        if (this.nemesisState !== 'IDLE' || this.nemesisHP <= 0) return;

        this.nemesisState = 'ATACANDO';
        // Elige al azar si ataca por la izquierda o derecha
        this.nemesisAttackDirection = Math.random() > 0.5 ? 'IZQUIERDA' : 'DERECHA';

        // TELEGRAFO: Cambia a Amarillo (Cuidado)
        this.nemesis.setFillStyle(0xeeee22);
        this.infoText.setText(`¡ALERTA! Ataque por la ${this.nemesisAttackDirection}`);

        // Mostrar contador regresivo de esquiva
        this.countdownText.setVisible(true);
        let timeRemaining = 1500; // 1.5 segundos en ms
        const countdownInterval = this.time.addEvent({
            delay: 100,
            repeat: 14,
            callback: () => {
                timeRemaining -= 100;
                const seconds = (timeRemaining / 1000).toFixed(1);
                this.countdownText.setText(`⏱ ${seconds}s`);
                
                // Cambiar color según el tiempo
                if (timeRemaining <= 300) {
                    this.countdownText.setFill('#ff0000'); // Rojo si quedan menos de 0.3s
                } else if (timeRemaining <= 600) {
                    this.countdownText.setFill('#ffaa00'); // Naranja si quedan menos de 0.6s
                } else {
                    this.countdownText.setFill('#00ff00'); // Verde
                }
            }
        });

        // Ventana de reacción: en 1500ms se ejecuta el golpe físico
        this.time.delayedCall(1500, () => {
            this.countdownText.setVisible(false);
            this.executeNemesisHit();
        }, [], this);
    }

    executeNemesisHit() {
        if (this.nemesisHP <= 0) return;

        // COLORES DIFERENTES SEGÚN DIRECCIÓN DEL ATAQUE
        const colorIzquierda = 0xff2200; // Rojo puro (izquierda)
        const colorDerecha = 0x2200ff;   // Azul puro (derecha)
        const colorAtaque = this.nemesisAttackDirection === 'IZQUIERDA' ? colorIzquierda : colorDerecha;
        
        this.nemesis.setFillStyle(colorAtaque);

        // LÓGICA DE ESQUIVE MEJORADA CON ESTADOS LÓGICOS
        let evadido = false;
        let razonEvasion = "";
        
        // Si ataca por la IZQUIERDA, el paciente debió esquivar a la DERECHA
        if (this.nemesisAttackDirection === 'IZQUIERDA' && this.pacienteState === 'ESQUIVE_DER') {
            evadido = true;
            razonEvasion = "Esquive correcto (ataque IZQ → esquivó DER)";
        }
        // Si ataca por la DERECHA, el paciente debió esquivar a la IZQUIERDA
        if (this.nemesisAttackDirection === 'DERECHA' && this.pacienteState === 'ESQUIVE_IZQ') {
            evadido = true;
            razonEvasion = "Esquive correcto (ataque DER → esquivó IZQ)";
        }
        if (this.pacienteState === 'BLOQUEANDO') {
            evadido = true;
            razonEvasion = "Bloqueó el ataque";
        }

        if (evadido) {
            this.infoText.setText(`✓ ${razonEvasion}`);
            console.log(`[ESQUIVA EXITOSA] ${razonEvasion} | Paciente HP: ${this.pacienteHP}/150`);
        } else {
            // ¡Se comió el golpe!
            const damageDealt = 10;
            this.pacienteHP -= damageDealt;
            this.infoText.setText(`✗ ¡Golpe recibido! (-${damageDealt} HP)`);
            console.log(`[GOLPE RECIBIDO] Daño: ${damageDealt} | Paciente HP: ${this.pacienteHP}/150`);
            
            // Actualizar barra de vida visual (Dividido entre 150 que es su HP Máximo real)
            const clampedHP = Math.max(0, this.pacienteHP);
            this.pacienteHPbar.setSize((clampedHP / 150) * 250, 20);
            
            // Flash rojo en la pantalla para dar feedback de daño
            this.cameras.main.flash(100, 255, 0, 0);
        }

        // Resetear al nemesis a su estado normal después de 300ms del golpe
        this.time.delayedCall(300, () => {
            this.nemesis.setFillStyle(0x882222); // Vuelve a su color base
            this.nemesisState = 'IDLE';
            this.nemesisAttackDirection = 'NINGUNA';
            if (this.pacienteState === 'NEUTRAL') this.infoText.setText('Estado: NEUTRAL');
            
            // Check de derrota
            if (this.pacienteHP <= 0) {
                console.log('[DERROTA] Paciente derrotado');
                this.scene.start('EndScene');
            }
        }, [], this);
    }
}