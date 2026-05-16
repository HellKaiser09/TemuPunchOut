
import { BuffSystem } from './BuffSystem.js';

export default class CombatScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CombatScene' });
  }

  create() {
    // ── Stats base del jugador y enemigo ──────────────────
    // "base" sirve para que BuffSystem calcule porcentajes correctamente
    this.playerStats = {
      hp: 650, maxHp: 1000,
      damage: 80, defense: 50, critDamage: 150,
      courage: 0,
      base: { hp: 650, maxHp: 1000, damage: 80, defense: 50, critDamage: 150 },
    };

    this.enemyStats = {
      hp: 800, maxHp: 800,
      damage: 70, defense: 40,
      base: { damage: 70, defense: 40 },
    };

    // ── BuffSystem ────────────────────────────────────────
    this.buffSystem = new BuffSystem(this, this.playerStats, this.enemyStats);

    // Escucha el evento que llega de CoachScene
    this.events.on('coach-buff-chosen', (buffId) => {
      this.buffSystem.apply(buffId);
      this._showBuffAppliedFeedback(buffId);
      this._startNextRound();
    });

    // Escucha ticks de buffs (para actualizar UI de estado)
    this.events.on('buffs-ticked', (activeBuffs) => {
      this._updateBuffHUD(activeBuffs);
    });

    // Tu código de creación de sprites, mapa, etc. sigue aquí...
    this._setupInput();
  }

  // ── Lanza el coach al terminar un round ──────────────────
  _endRound(roundNumber) {
    // 1. Descuenta duración de los buffs activos
    this.buffSystem.tickRound();

    // 2. Evalúa desbloqueos condicionales (ej: 'integracion' si ganaste)
    const pending = this.registry.get('pendingUnlock');
    if (pending?.condition === 'win_round' && this._playerWonRound()) {
      this._unlockAbility(pending.ability);
      this.registry.remove('pendingUnlock');
    }

    // 3. Pausa la lógica de combate y lanza la escena del coach
    this.scene.launch('CoachScene', {
      round:         roundNumber + 1,
      playerHp:      this.playerStats.hp,
      playerMaxHp:   this.playerStats.maxHp,
      playerEnergy:  this.playerEnergy ?? 40,
    });
  }

  // ── Aplica el buff on-hit por cada golpe recibido ─────────
  _onPlayerHitReceived(damage) {
    const onHit = this.registry.get('onHitBuff');
    if (onHit) {
      this.playerStats[onHit.stat] = (this.playerStats[onHit.stat] ?? 0) + onHit.value;
      // Muestra el número flotante de ganancia de Coraje
      this._floatingText(
        this.player.x, this.player.y - 30,
        `+${onHit.value} ${onHit.stat}`, '#378add'
      );
    }

    // Inmunidad a estados (ej: vergüenza)
    if (this.buffSystem.isImmuneTo('vergüenza')) {
      // No apliques el debuff de vergüenza aunque el enemigo lo intente
      return;
    }

    this.playerStats.hp -= damage;
    this._updateHpBar();
  }

  // ── Calcula el daño aplicando modificadores del buff ─────
  _calculateDamage(baseAtk, isCrit = false) {
    const stats = this.playerStats;
    let dmg = baseAtk * (stats.damage / stats.base.damage);

    if (isCrit) {
      dmg *= stats.critDamage / 100;
    }

    return Math.round(dmg);
  }

  _calculateEnemyDamage(baseAtk) {
    // El buff "limites" ya redujo enemyStats.damage; solo aplica el valor actual
    return Math.round(baseAtk * (this.enemyStats.damage / this.enemyStats.base.damage));
  }

  // ── Feedback visual al aplicar un buff ───────────────────
  _showBuffAppliedFeedback(buffId) {
    const catalog = { /* importa BUFF_CATALOG */ };
    const buff = catalog[buffId];
    if (!buff) return;

    // Texto flotante grande centrado
    const txt = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 - 40,
      `${buff.icon}  ${buff.name}`,
      { fontSize: '28px', fontFamily: 'sans-serif', color: '#ffd700' }
    ).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: txt, alpha: 1, y: '-=30', duration: 400, ease: 'Back.Out',
      onComplete: () => {
        this.tweens.add({
          targets: txt, alpha: 0, y: '-=20', delay: 900, duration: 300,
          onComplete: () => txt.destroy(),
        });
      },
    });
  }

  // ── HUD de buffs activos (lista en esquina) ───────────────
  _updateBuffHUD(activeBuffs) {
    // Aquí actualizas tus íconos/textos de buffs en pantalla.
    // activeBuffs es un array de { effect, rounds, delta, target, mode }
    // Ejemplo mínimo:
    if (this.buffHUDTexts) this.buffHUDTexts.forEach(t => t.destroy());
    this.buffHUDTexts = [];

    activeBuffs.forEach((mod, i) => {
      const label = `${mod.effect.stat} (${mod.rounds}r)`;
      const t = this.add.text(12, 80 + i * 18, label, {
        fontSize: '11px', fontFamily: 'monospace', color: '#9fe1cb',
      });
      this.buffHUDTexts.push(t);
    });
  }

  _floatingText(x, y, msg, color = '#ffffff') {
    const t = this.add.text(x, y, msg, {
      fontSize: '16px', fontFamily: 'sans-serif', color,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: t, y: y - 40, alpha: 0, duration: 800,
      onComplete: () => t.destroy(),
    });
  }

  _startNextRound()    { /* reanuda tu lógica de combate */ }
  _playerWonRound()    { return this.enemyStats.hp <= 0; }
  _unlockAbility(name) { console.log(`Habilidad desbloqueada: ${name}`); }
  _updateHpBar()       { /* actualiza tu barra de HP */ }
  _setupInput()        { /* teclado / controles */ }
}