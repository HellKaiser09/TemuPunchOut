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

    // Nueva partida: limpiamos residuos persistidos de runs anteriores.
    if ((this.scene.currentRound ?? 1) <= 1) {
      this.scene.registry.remove('buffState');
      this.scene.registry.set('onHitBuff', []);
    }

    this._restoreFromRegistry();
  }

  apply(buffId) {
    const buff = BUFF_CATALOG[buffId];
    if (!buff) return;

    console.log(`[BUFF SYSTEM] Aplicando ${buff.type.toUpperCase()}: ${buff.name} (${buff.id})`);

    buff.effects.forEach(effect => {
      this._applyEffect(effect, buff.duration, buff);
    });

    this.scene.registry.set('lastBuff', buff.id);
    this._syncRegistry();

    this.scene.events.emit('buff-applied', buff);
  }

  _applyEffect(effect, duration, buff) {
    const effectDuration = typeof effect.rounds === 'number' ? effect.rounds : duration;
    const target = effect.target === 'self' ? this.player : this.enemy;
    const targetKey = effect.target === 'self' ? 'self' : 'enemy';

    switch (effect.op) {

      case 'add_percent': {
        const rawBase = target.base?.[effect.stat] ?? target[effect.stat] ?? 0;
        // Para curación, calcular el porcentaje sobre maxHp si está disponible
        const baseForPercent = (effect.stat === 'hp') ? (target.maxHp ?? rawBase) : rawBase;
        const delta = baseForPercent === 0
          ? effect.value
          : Math.round(baseForPercent * (effect.value / 100));
        if (effect.stat === 'hp') {
          target.hp = Math.min(target.maxHp, target.hp + delta);
          console.log(`[BUFF EFFECT] ${buff?.id} -> ${effect.target}.${effect.stat} +${delta} (curado)`);
        } else {
          this._registerModifier(effect, effectDuration, delta, target, 'add', buff?.tag);
          console.log(`[BUFF EFFECT] ${buff?.id} -> ${effect.target}.${effect.stat} +${delta} (${effectDuration ?? 'inst'} rounds)`);
        }
        break;
      }

      case 'mul_percent': {
        const factor = 1 + effect.value / 100;
        this._registerModifier(effect, effectDuration, factor, target, 'mul', buff?.tag, buff?.id);
        console.log(`[DEBUFF EFFECT] ${buff?.id} -> ${effect.target}.${effect.stat} x${factor.toFixed(2)} (${effectDuration ?? 'inst'} rounds)`);
        break;
      }

      case 'immune':
        this.immunities.add(effect.value);
        console.log(`[BUFF EFFECT] ${buff?.id} -> inmunidad a ${effect.value}`);
        if (typeof effectDuration === 'number') {
          this.activeBuffs.push({
            type: 'immunity',
            value: effect.value,
            rounds: effectDuration,
            target,
            targetKey,
            sourceTag: buff?.tag,
            sourceId: buff?.id,
          });
        }
        break;

      case 'block':
        this.blockedAbilities.add(effect.value);
        console.log(`[DEBUFF EFFECT] ${buff?.id} -> habilidad bloqueada: ${effect.value}`);
        if (typeof effectDuration === 'number') {
          this.activeBuffs.push({
            type: 'block',
            value: effect.value,
            rounds: effectDuration,
            target,
            targetKey,
            sourceTag: buff?.tag,
            sourceId: buff?.id,
          });
        }
        break;

      case 'cleanse':
        console.log(`[BUFF EFFECT] ${buff?.id} -> cleanse x${effect.value}`);
        this._cleanse(target, effect.value);
        break;

      case 'on_hit': {
        const current = this.scene.registry.get('onHitBuff') ?? [];
        const marker = `${effect.stat}:${effect.value}:${targetKey}`;
        const cleaned = current.filter(e => e.marker !== marker);
        cleaned.push({ stat: effect.stat, value: effect.value, targetKey, marker });
        this.scene.registry.set('onHitBuff', cleaned);
        console.log(`[BUFF EFFECT] ${buff?.id} -> on_hit ${effect.stat} +${effect.value}`);

        if (typeof effectDuration === 'number') {
          this.activeBuffs.push({
            type: 'on_hit',
            marker,
            rounds: effectDuration,
            target,
            targetKey,
            sourceTag: buff?.tag,
            sourceId: buff?.id,
          });
        }
        break;
      }

      case 'ability':
        this.scene.registry.set('pendingUnlock', {
          ability:   effect.value,
          condition: effect.condition,
        });
        console.log(`[BUFF EFFECT] ${buff?.id} -> pending ability: ${effect.value}`);
        break;
    }
  }

  _cleanse(target, count) {
    const candidates = this.activeBuffs.filter(mod => mod.target === target && mod.sourceTag === 'debuff');
    const toRemove = candidates.slice(-count);

    if (!toRemove.length) return;

    this.activeBuffs = this.activeBuffs.filter(mod => !toRemove.includes(mod));
    toRemove.forEach(mod => this._revert(mod));
    this._syncRegistry();
  }

  _registerModifier(effect, duration, delta, target, mode = 'add', sourceTag = null, sourceId = null) {
    const targetKey = target === this.player ? 'self' : 'enemy';
    const originalValue = target[effect.stat] ?? (mode === 'mul' ? 1 : 0);
    const mod = { effect, duration, delta, target, targetKey, mode, rounds: duration, sourceTag, sourceId, originalValue };
    this.activeBuffs.push(mod);

    if (mode === 'add') {
      target[effect.stat] = originalValue + delta;
    } else {
      target[effect.stat] = Math.round(originalValue * delta);
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
    this._syncRegistry();
    if (expired.length) {
      console.log(`[BUFF SYSTEM] Expiraron ${expired.length} efecto(s):`, expired);
    }
    this.scene.events.emit('buffs-ticked', this.activeBuffs);
  }

  _revert(mod) {
    if (mod.type === 'immunity')   { this.immunities.delete(mod.value); return; }
    if (mod.type === 'block')      { this.blockedAbilities.delete(mod.value); return; }
    if (mod.type === 'on_hit') {
      const current = this.scene.registry.get('onHitBuff') ?? [];
      this.scene.registry.set('onHitBuff', current.filter(e => e.marker !== mod.marker));
      return;
    }

    mod.target[mod.effect.stat] = mod.originalValue;
  }

  _serializeMod(mod) {
    return {
      type: mod.type,
      effect: mod.effect,
      delta: mod.delta,
      mode: mod.mode,
      rounds: mod.rounds,
      sourceTag: mod.sourceTag,
      sourceId: mod.sourceId,
      value: mod.value,
      marker: mod.marker,
      targetKey: mod.targetKey,
    };
  }

  _syncRegistry() {
    const serializable = this.activeBuffs.map(mod => this._serializeMod(mod));
    this.scene.registry.set('buffState', serializable);
  }

  _restoreFromRegistry() {
    const savedState = this.scene.registry.get('buffState') ?? [];
    const currentOnHit = this.scene.registry.get('onHitBuff') ?? [];

    if (!savedState.length) {
      if (!currentOnHit.length) this.scene.registry.set('onHitBuff', []);
      return;
    }

    console.log(`[BUFF SYSTEM] Rehidratando ${savedState.length} efecto(s) desde registry`);

    this.activeBuffs = [];
    this.immunities.clear();
    this.blockedAbilities.clear();
    this.scene.registry.set('onHitBuff', []);

    savedState.forEach(saved => {
      const target = saved.targetKey === 'self' ? this.player : this.enemy;

      if (saved.type === 'immunity') {
        this.immunities.add(saved.value);
        this.activeBuffs.push({ ...saved, target });
        return;
      }

      if (saved.type === 'block') {
        this.blockedAbilities.add(saved.value);
        this.activeBuffs.push({ ...saved, target });
        return;
      }

      if (saved.type === 'on_hit') {
        const onHit = this.scene.registry.get('onHitBuff') ?? [];
        const [stat, value] = (saved.marker ?? '').split(':');
        onHit.push({ marker: saved.marker, stat, value: Number(value), targetKey: saved.targetKey });
        this.scene.registry.set('onHitBuff', onHit);
        this.activeBuffs.push({ ...saved, target });
        return;
      }

      const originalValue = target[saved.effect.stat] ?? (saved.mode === 'mul' ? 1 : 0);
      if (saved.mode === 'add') {
        target[saved.effect.stat] = originalValue + saved.delta;
      } else {
        target[saved.effect.stat] = Math.round(originalValue * saved.delta);
      }

      this.activeBuffs.push({ ...saved, target, originalValue });
    });

    this._syncRegistry();
  }

  isImmuneTo(status)     { return this.immunities.has(status); }
  isAbilityBlocked(name) { return this.blockedAbilities.has(name); }

  getActiveBuffs() { return [...this.activeBuffs]; }
}