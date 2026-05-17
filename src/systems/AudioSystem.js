export class AudioSystem {
    constructor(scene) {
        this.scene = scene;

        // Grupos de sonidos para random
        this.sfxGolpeHamburguesa = [
            'sfx_golpe_hamburguesa_1',
            'sfx_golpe_hamburguesa_2',
            'sfx_golpe_hamburguesa_3',
        ];

        this.sfxGolpePaciente = [
            'sfx_golpe_paciente_1',
            'sfx_golpe_paciente_2',
            'sfx_golpe_paciente_3',
        ];

        this.bgmActual = null;
    }

    // ── Música de fondo ───────────────────────────────────────
    playBGM(key, loop = true, volume = 0.6) {
        if (this.bgmActual) {
            this.bgmActual.stop();
            this.bgmActual.destroy();
        }
        this.bgmActual = this.scene.sound.add(key, { loop, volume });
        this.bgmActual.play();
    }

    stopBGM() {
        if (this.bgmActual) {
            this.bgmActual.stop();
            this.bgmActual = null;
        }
    }

    // ── Efectos de sonido ─────────────────────────────────────
    playSFX(key, volume = 0.8) {
        this.scene.sound.play(key, { volume });
    }

    // ── Golpe del jugador (paciente) — random ─────────────────
    playGolpePaciente() {
        const key = Phaser.Utils.Array.GetRandom(this.sfxGolpePaciente);
        this.playSFX(key);
    }

    // ── Golpe del enemigo (hamburguesa) — random ──────────────
    playGolpeHamburguesa() {
        const key = Phaser.Utils.Array.GetRandom(this.sfxGolpeHamburguesa);
        this.playSFX(key);
    }

    // ── Ataque especial ───────────────────────────────────────
    playEspecial() {
        this.playSFX('sfx_especial');
    }

    // ── Botón de menú ─────────────────────────────────────────
    playMenu() {
        this.playSFX('sfx_menu', 0.6);
    }

    // ── Inicio de pelea ───────────────────────────────────────
    playInicioPelea() {
        this.playSFX('sfx_inicio_pelea');
    }
}