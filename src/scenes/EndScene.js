export class EndScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EndScene' });
    }

    init(data) {
        this.victoria = data?.victoria ?? false; // Por defecto muestra derrota
    }

    create() {
        const width = this.sys.game.config.width;
        const height = this.sys.game.config.height;

        // 🎬 TRANSICIÓN DE ENTRADA: La pantalla emerge del negro en 1 segundo
        this.cameras.main.fadeIn(1000, 0, 0, 0);

        if (!this.victoria) {
            // ============ PANTALLA DE DERROTA ============
            // Fondo oscuro con un sutil toque rojizo de derrota
            this.add.rectangle(width / 2, height / 2, width, height, 0x140505);

            // Mensaje principal de KO
            this.add.text(width / 2, height / 2 - 60, 'K. O.', { 
                font: '80px Impact', 
                fill: '#ff2222',
                stroke: '#000',
                strokeThickness: 6
            }).setOrigin(0.5);

            // Subtexto psicológico del juego
            this.add.text(width / 2, height / 2 + 30, 'Tus inseguridades te han noqueado...', { 
                font: '20px Arial', 
                fill: '#aaaaaa',
                fontStyle: 'italic'
            }).setOrigin(0.5);

            // Instrucción de reinicio
            this.add.text(width / 2, height / 2 + 130, 'Presiona [ESPACIO] para volver a intentarlo', { 
                font: '16px monospace', 
                fill: '#00ffff' 
            }).setOrigin(0.5);
        } else {
            // ============ PANTALLA DE VICTORIA ============
            // Fondo dorado/azul de victoria
            this.add.rectangle(width / 2, height / 2, width, height, 0x001a4d);

            // Mensaje principal de VICTORIA
            this.add.text(width / 2, height / 2 - 80, '✦ VICTORIA ✦', { 
                font: '80px Impact', 
                fill: '#ffdd00',
                stroke: '#000',
                strokeThickness: 6
            }).setOrigin(0.5);

            // Subtexto inspiracional
            this.add.text(width / 2, height / 2 - 10, '¡Has conquistado tus demonios internos!', { 
                font: '20px Arial', 
                fill: '#00ffff',
                fontStyle: 'italic'
            }).setOrigin(0.5);

            // Mensaje de progreso
            this.add.text(width / 2, height / 2 + 50, '🏆 Has avanzado en tu camino de sanación 🏆', { 
                font: '18px Arial', 
                fill: '#ffaa00'
            }).setOrigin(0.5);

            // Instrucción de continuar
            this.add.text(width / 2, height / 2 + 140, 'Presiona [ESPACIO] para continuar', { 
                font: '16px monospace', 
                fill: '#00ff88' 
            }).setOrigin(0.5);
        }

        // 🔄 TRANSICIÓN DE SALIDA: Captura el espacio para reiniciar o continuar
        this.input.keyboard.once('keydown-SPACE', () => {
            // Desvanecer la pantalla a negro en 800ms
            this.cameras.main.fade(800, 0, 0, 0);
            
            // Al terminar el fade, destroyers el estado anterior e iniciamos el ring desde cero
            this.cameras.main.once('camerafadeoutcomplete', () => {
                if (!this.victoria) {
                    // En derrota, reinicia el combate
                    this.scene.start('CombatScene');
                } else {
                    // En victoria, podría ir a otra escena (menú, siguiente nivel, etc.)
                    // Por ahora reinicia desde 0
                    this.scene.start('BootScene');
                }
            });
        });
    }
}