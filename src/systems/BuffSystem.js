// BuffSystem.js
// Gestiona los datos, aplicación y expiración de buffs/debuffs
// Terapia de Choque — sistema de coach entre rounds

export const BUFF_CATALOG = {
  autoestima: {
    id: 'autoestima',
    name: 'Autoestima',
    type: 'self',          // 'self' | 'enemy' | 'mixed'
    tag: 'buff',
    desc: 'Reconoces tu valor. Eso sana.',
    coachQuote: 'No necesitas ganar su aprobación.',
    statLabel: '+20% vida al inicio del round',
    duration: 'instant',   // 'instant' | number de rounds
    effects: [
      { stat: 'hp',      op: 'add_percent', value: 20, target: 'self'  },
      { stat: 'status',  op: 'immune',      value: 'vergüenza', target: 'self', rounds: 3 },
    ],
  },

  limites: {
    id: 'limites',
    name: 'Poner Límites',
    type: 'enemy',
    tag: 'debuff',
    desc: 'Defines lo que no tolerarás.',
    coachQuote: 'Un "no" dicho a tiempo vale más que mil disculpas.',
    statLabel: '−15% daño del enemigo este round',
    duration: 1,
    effects: [
      { stat: 'damage',  op: 'mul_percent', value: -15, target: 'enemy' },
      { stat: 'ability', op: 'block',       value: 'manipulacion', target: 'enemy', rounds: 1 },
    ],
  },

  vulnerabilidad: {
    id: 'vulnerabilidad',
    name: 'Vulnerabilidad',
    type: 'self',
    tag: 'buff',
    desc: 'Mostrar tus heridas es fuerza, no debilidad.',
    coachQuote: 'Mostrar tus cicatrices no te hace débil.',
    statLabel: 'Puedes recibir mas daño, pero puedes asestar golpes críticos',
    duration: 1,
    effects: [
      { stat: 'critDamage', op: 'add_percent', value: 35,  target: 'self' },
      { stat: 'courage',    op: 'on_hit',      value: 5,   target: 'self', perHit: true },
    ],
  },

  perdonarte: {
    id: 'perdonarte',
    name: 'Perdonarte',
    type: 'self',
    tag: 'buff',
    desc: 'Sueltas el peso que cargabas.',
    coachQuote: 'El perdón no es para ellos. Es para ti.',
    statLabel: 'Elimina 1 debuff activo',
    duration: 'instant',
    effects: [
      { stat: 'debuff', op: 'cleanse', value: 1, target: 'self' },
    ],
  },
};

// ─────────────────────────────────────────────
// BuffSystem — clase que vive en la escena de combate
// Uso: this.buffSystem = new BuffSystem(this, playerStats, enemyStats)
// ─────────────────────────────────────────────
export class BuffSystem {
  constructor(scene, playerStats, enemyStats) {
    this.scene       = scene;
    this.player      = playerStats;   // objeto reactivo con hp, damage, defense, etc.
    this.enemy       = enemyStats;
    this.activeBuffs = [];            // buffs con rounds restantes
    this.immunities  = new Set();
    this.blockedAbilities = new Set();
  }

  apply(buffId) {
    const buff = BUFF_CATALOG[buffId];
    if (!buff) return;

    buff.effects.forEach(effect => {
      this._applyEffect(effect, buff.duration, buff);
    });

    this.scene.registry.set('lastBuff', buff.id);

    this.scene.events.emit('buff-applied', buff);
  }

  _applyEffect(effect, duration, buff) {
    const effectDuration = typeof effect.rounds === 'number' ? effect.rounds : duration;
    const target = effect.target === 'self' ? this.player : this.enemy;

    switch (effect.op) {

      case 'add_percent': {
        const base  = target.base?.[effect.stat] ?? target[effect.stat];
        const delta = Math.round(base * (effect.value / 100));
        if (effect.stat === 'hp') {
          target.hp = Math.min(target.maxHp, target.hp + delta);
        } else {
          this._registerModifier(effect, effectDuration, delta, target, 'add', buff?.tag);
        }
        break;
      }

      case 'mul_percent': {
        const factor = 1 + effect.value / 100;
        this._registerModifier(effect, effectDuration, factor, target, 'mul', buff?.tag);
        break;
      }

      case 'immune':
        this.immunities.add(effect.value);
        if (typeof effectDuration === 'number') {
          this.activeBuffs.push({
            type: 'immunity',
            value: effect.value,
            rounds: effectDuration,
            target,
            sourceTag: buff?.tag,
          });
        }
        break;

      case 'block':
        this.blockedAbilities.add(effect.value);
        if (typeof effectDuration === 'number') {
          this.activeBuffs.push({
            type: 'block',
            value: effect.value,
            rounds: effectDuration,
            target,
            sourceTag: buff?.tag,
          });
        }
        break;

      case 'cleanse':
        this._cleanse(target, effect.value);
        break;

      case 'on_hit': {
        const current = this.scene.registry.get('onHitBuff') ?? [];
        current.push({ stat: effect.stat, value: effect.value, target });
        this.scene.registry.set('onHitBuff', current);
        break;
      }

      case 'ability':
        this.scene.registry.set('pendingUnlock', {
          ability:   effect.value,
          condition: effect.condition,
        });
        break;
    }
  }

  _cleanse(target, count) {
    const candidates = this.activeBuffs.filter(mod => mod.target === target && mod.sourceTag === 'debuff');
    const toRemove = candidates.slice(-count);

    if (!toRemove.length) return;

    this.activeBuffs = this.activeBuffs.filter(mod => !toRemove.includes(mod));
    toRemove.forEach(mod => this._revert(mod));
  }

  _registerModifier(effect, duration, delta, target, mode = 'add', sourceTag = null) {
    const mod = { effect, duration, delta, target, mode, rounds: duration, sourceTag };
    this.activeBuffs.push(mod);

    if (mode === 'add') {
      target[effect.stat] = (target[effect.stat] ?? 0) + delta;
    } else {
      target[effect.stat] = Math.round((target[effect.stat] ?? 1) * delta);
    }
  }

  // Llama al final de cada round para descontar duración
  tickRound() {
    const expired = [];

    this.activeBuffs = this.activeBuffs.filter(mod => {
      if (typeof mod.rounds !== 'number') return true;
      mod.rounds--;
      if (mod.rounds <= 0) { expired.push(mod); return false; }
      return true;
    });

    expired.forEach(mod => this._revert(mod));
    this.scene.events.emit('buffs-ticked', this.activeBuffs);
  }

  _revert(mod) {
    if (mod.type === 'immunity')   { this.immunities.delete(mod.value); return; }
    if (mod.type === 'block')      { this.blockedAbilities.delete(mod.value); return; }

    if (mod.mode === 'add') {
      mod.target[mod.effect.stat] -= mod.delta;
    } else {
      mod.target[mod.effect.stat] = Math.round(mod.target[mod.effect.stat] / mod.delta);
    }
  }

  isImmuneTo(status)     { return this.immunities.has(status); }
  isAbilityBlocked(name) { return this.blockedAbilities.has(name); }

  getActiveBuffs() { return [...this.activeBuffs]; }
}