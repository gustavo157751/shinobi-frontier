/**
 * combat.js — MOTOR DE COMBATE POR TURNOS
 * ======================================
 *
 * Fluxo de uma rodada:
 *  1. Início da rodada: queimadura causa dano, perseguições são recarregadas
 *     e todos ganham chakra (`chakraRegen`).
 *  2. Ordem de ação: maior `spd` primeiro (empate resolvido por sorteio).
 *  3. Cada unidade executa uma ação: ataque básico, jutsu ou guarda.
 *  4. Sempre que um alvo recebe Flutuação ou Derrubar, os aliados com
 *     `pursuit.triggers` compatível atacam automaticamente (combo em cadeia).
 *  5. A rodada termina, efeitos expiram e a próxima começa.
 *
 * O motor não conhece o DOM: toda a apresentação é feita pelos `hooks`
 * fornecidos pela tela de combate (src/ui/screens/battle.js).
 */

import { BASIC_ATTACKS, DAMAGE_TUNING } from '../data/characters.js';
import { getJutsu, jutsusOf } from '../data/jutsus.js';
import { STATUS_META, statusMeta } from '../data/statuses.js';
import { sleep, randInt } from './utils.js';
import { formationColumn } from './formation.js';

const MAX_ROUNDS = 24;

export class Battle {
  /**
   * @param {object} options
   * @param {Array} options.allies unidades do jogador
   * @param {Array} options.enemies unidades inimigas
   * @param {object} options.hooks callbacks de apresentação
   */
  constructor({ allies, enemies, hooks, tuning = DAMAGE_TUNING }) {
    this.allies = allies;
    this.enemies = enemies;
    this.units = [...allies, ...enemies];
    this.hooks = hooks;
    this.tuning = tuning;
    this.round = 0;
    this.comboCount = 0;
    this.bestCombo = 0;
    this.finished = false;
    this.fled = false;
    this.kakashiStacks = 0;

    // Barreira inicial do Gaara.
    for (const unit of this.units) {
      if (unit.charId === 'gaara') {
        this.giveShield(unit, unit.maxHp * 0.12, 99);
      }
    }
  }

  /* ------------------------------- helpers ------------------------------- */

  log(text, kind = 'info') {
    return this.hooks.log(text, kind);
  }

  aliveOf(side) {
    return this.units.filter((unit) => unit.side === side && unit.alive);
  }

  enemiesOf(unit) {
    return this.aliveOf(unit.side === 'ally' ? 'enemy' : 'ally');
  }

  frontlineTargets(pool) {
    const frontline = pool.filter((target) => formationColumn(target.slot) === 2);
    return frontline.length ? frontline : pool;
  }

  defaultTargetUid(unit) {
    return this.frontlineTargets(this.enemiesOf(unit))[0]?.uid ?? null;
  }

  alliesOf(unit) {
    return this.aliveOf(unit.side);
  }

  unitByUid(uid) {
    return this.units.find((unit) => unit.uid === uid) ?? null;
  }

  passiveOf(unit) {
    return unit.def?.passive ?? '';
  }

  /** Velocidade efetiva (considera Lentidão e passiva do Minato). */
  speedOf(unit) {
    let speed = unit.spd;
    for (const status of unit.statuses) {
      const meta = statusMeta(status.type);
      if (meta.spdMod) speed *= 1 + meta.spdMod;
    }
    if (unit.charId === 'minato') speed += 0.5;
    return speed;
  }

  /* ------------------------------ ciclo geral ---------------------------- */

  async start() {
    await this.hooks.message('BATALHA INICIADA', 'A equipe avança');
    while (!this.finished && this.round < MAX_ROUNDS) {
      this.round += 1;
      await this.hooks.message(`RODADA ${this.round}`, this.round === 1 ? 'Escolham seus alvos' : '');
      await this.roundStart();
      if (this.checkEnd()) break;

      const order = [...this.aliveOf('ally'), ...this.aliveOf('enemy')].sort((a, b) => {
        const diff = this.speedOf(b) - this.speedOf(a);
        if (diff !== 0) return diff;
        const lane = formationColumn(b.slot) - formationColumn(a.slot);
        if (lane !== 0) return lane;
        const row = Math.floor(a.slot / 3) - Math.floor(b.slot / 3);
        return row !== 0 ? row : Math.random() - 0.5;
      });

      for (const unit of order) {
        if (this.finished || this.fled) break;
        if (!unit.alive) continue;

        if (this.consumeStun(unit)) continue;

        unit.guard = false;
        await this.hooks.highlight(unit.uid);
        const action = unit.side === 'ally' ? await this.hooks.askAction(unit) : this.chooseAiAction(unit);
        if (this.fled) break;
        if (!action) continue;

        await this.takeTurn(unit, action);
        this.checkEnd();
        await this.hooks.settle();
      }

      if (this.checkEnd()) break;
      await this.roundEnd();
    }

    if (!this.finished) {
      // Limite de rodadas: considera derrota (a missão falhou por demora).
      this.finished = true;
      await this.log('O tempo esgotou. A missão foi abortada.', 'warn');
    }
    return {
      victory: this.victory,
      fled: this.fled,
      rounds: this.round,
      combos: this.comboCount,
      bestCombo: this.bestCombo,
    };
  }

  flee() {
    this.fled = true;
  }

  checkEnd() {
    if (this.finished) return true;
    const alliesAlive = this.aliveOf('ally').length > 0;
    const enemiesAlive = this.aliveOf('enemy').length > 0;
    if (alliesAlive && enemiesAlive) return false;
    this.finished = true;
    this.victory = enemiesAlive === false && alliesAlive;
    return true;
  }

  async roundStart() {
    // Passivas de chakra no início da rodada.
    for (const unit of this.units) {
      if (!unit.alive) continue;
      unit.pursuitUsed = false;
      unit.chakra = Math.min(unit.maxChakra, unit.chakra + unit.def.base.chakraRegen);

      if (unit.charId === 'shikamaru') unit.chakra = Math.min(unit.maxChakra, unit.chakra + 8);
      if (unit.charId === 'naruto' && unit.hp < unit.maxHp * 0.45) {
        unit.chakra = Math.min(unit.maxChakra, unit.chakra + 10);
      }
    }

    // Dano contínuo (queimadura) e expiração de efeitos.
    for (const unit of [...this.units]) {
      if (!unit.alive) continue;
      for (const status of [...unit.statuses]) {
        const meta = statusMeta(status.type);
        if (meta.dot) {
          const damage = Math.round(unit.maxHp * meta.dot);
          await this.damageUnit(null, unit, damage, { kind: 'dot', label: meta.label, flat: true });
        }
      }
    }
    this.cleanupStatuses();
    this.hooks.render();
  }

  async roundEnd() {
    for (const unit of this.units) {
      for (const status of unit.statuses) {
        if (status.expiresAt <= this.round) status.expired = true;
      }
      unit.statuses = unit.statuses.filter((status) => !status.expired);
    }
    this.comboCount = 0;
    this.hooks.render();
    await sleep(220);
  }

  cleanupStatuses() {
    for (const unit of this.units) {
      if (unit.hp <= 0 && unit.alive) {
        unit.alive = false;
        unit.hp = 0;
      }
      unit.statuses = unit.statuses.filter((status) => !status.expired);
    }
  }

  /* ------------------------------- turnos -------------------------------- */

  consumeStun(unit) {
    if (unit.charId === 'itachi') return false; // passiva: imune a atordoamento
    const stun = unit.statuses.find((status) => statusMeta(status.type).skipTurn);
    if (!stun) return false;
    unit.statuses = unit.statuses.filter((status) => status !== stun);
    this.log(`${unit.name} está atordoado e perde a ação.`, 'warn');
    this.hooks.render();
    return true;
  }

  async takeTurn(unit, action) {
    if (action.type === 'guard') {
      unit.guard = true;
      const guardGain = 28 + (unit.teamBonus?.guardChakra ?? 0);
      unit.chakra = Math.min(unit.maxChakra, unit.chakra + guardGain);
      await this.hooks.actionFlash(unit, 'Guarda');
      this.log(`${unit.name} assume postura defensiva e recupera ${guardGain} de chakra.`, 'info');
      this.hooks.render();
      return;
    }

    if (action.type === 'basic') {
      const basic = BASIC_ATTACKS[unit.style] ?? BASIC_ATTACKS.ninjutsu;
      const target = this.resolveTarget(unit, action.targetUid);
      if (!target) return;
      unit.chakra = Math.min(unit.maxChakra, unit.chakra + basic.chakraGain);
      await this.hooks.actionFlash(unit, basic.name);
      this.log(`${unit.name} usa ${basic.name} em ${target.name}.`, 'basic');
      if (unit.isHero && unit.style === 'taijutsu') this.heroTaiRally(unit);
      await this.hit(unit, target, basic.mult, {
        label: basic.name,
        effect: basic.effect,
        kanji: basic.kanji,
        kind: 'basic',
      });
      this.hooks.render();
      return;
    }

    if (action.type === 'jutsu') {
      const jutsu = getJutsu(action.jutsuId);
      if (!jutsu) return;
      const cost = this.jutsuCost(unit, jutsu);
      if (unit.chakra < cost) {
        this.log(`${unit.name} não tem chakra suficiente para ${jutsu.name}.`, 'warn');
        return;
      }
      unit.chakra -= cost;
      await this.hooks.actionFlash(unit, jutsu.name);
      this.log(`${unit.name} usa ${jutsu.name}!`, 'jutsu');

      if (unit.side === 'enemy' && this.allies.some((ally) => ally.charId === 'kakashi' && ally.alive)) {
        this.kakashiCopy();
      }
      if (unit.isHero && unit.style === 'ninjutsu' && jutsu.target === 'allEnemies') {
        unit.chakra = Math.min(unit.maxChakra, unit.chakra + Math.round(cost * 0.1));
      }

      await this.resolveJutsu(unit, jutsu, action.targetUid);
      this.hooks.render();
    }
  }

  jutsuCost(unit, jutsu) {
    let cost = jutsu.cost;
    if (unit.charId === 'jiraiya') cost = Math.max(10, cost - 5);
    return cost;
  }

  heroTaiRally(unit) {
    for (const ally of this.alliesOf(unit)) {
      ally.chakra = Math.min(ally.maxChakra, ally.chakra + 6);
    }
  }

  kakashiCopy() {
    this.kakashiStacks = Math.min(3, this.kakashiStacks + 1);
    for (const ally of this.allies) {
      if (ally.charId === 'kakashi' && ally.alive) {
        ally.atk = Math.round(ally.atk * 1.02);
      }
    }
  }

  resolveTarget(unit, targetUid) {
    const pool = this.enemiesOf(unit);
    if (!pool.length) return null;
    const chosen = targetUid ? this.unitByUid(targetUid) : null;
    if (chosen && chosen.alive && chosen.side !== unit.side) return chosen;
    const candidates = this.frontlineTargets(pool);
    return candidates[randInt(0, candidates.length - 1)];
  }

  /* ------------------------------- jutsus -------------------------------- */

  async resolveJutsu(unit, jutsu, targetUid) {
    if (jutsu.heal && jutsu.target !== 'enemy' && jutsu.target !== 'allEnemies') {
      const targets =
        jutsu.target === 'allAllies'
          ? this.alliesOf(unit)
          : jutsu.target === 'self'
            ? [unit]
            : [this.allyTarget(unit, targetUid)];

      for (const target of targets.filter(Boolean)) {
        let amount = Math.round(target.maxHp * jutsu.heal);
        if (target.charId === 'tsunade') amount = Math.round(amount * 1.3);
        await this.healUnit(unit, target, amount, jutsu.name);
        if (jutsu.cleanse) this.cleanse(target);
        if (jutsu.shield) this.giveShield(target, Math.round(target.maxHp * jutsu.shield), 2);
      }
    }

    if (jutsu.shield) {
      const targets =
        jutsu.target === 'allAllies' ? this.alliesOf(unit) : jutsu.target === 'self' ? [unit] : [];
      for (const target of targets) {
        this.giveShield(target, Math.round(target.maxHp * jutsu.shield), 2);
        this.log(`${target.name} recebe uma barreira de ${Math.round(target.maxHp * jutsu.shield)}.`, 'buff');
      }
    }

    if (jutsu.power) {
      const isAoe = jutsu.target === 'allEnemies';
      const targets = isAoe ? this.enemiesOf(unit) : [this.resolveTarget(unit, targetUid)].filter(Boolean);
      const hits = jutsu.hits ?? 1;
      for (const target of targets) {
        if (!target?.alive) continue;
        for (let index = 0; index < hits; index += 1) {
          if (!target.alive) break;
          await this.hit(unit, target, jutsu.power / hits, {
            label: jutsu.name,
            kanji: jutsu.kanji,
            critBonus: jutsu.critBonus ?? 0,
            effect: jutsu.effect,
            effectBoost: unit.charId === 'itachi' ? 0.1 : 0,
            kind: 'jutsu',
          });
        }
      }
      if (jutsu.recoil) {
        const recoil = Math.round(unit.maxHp * jutsu.recoil);
        await this.damageUnit(null, unit, recoil, { kind: 'recoil', label: 'Esforço', flat: true });
      }
    }
  }

  allyTarget(unit, targetUid) {
    const pool = this.alliesOf(unit);
    const chosen = targetUid ? this.unitByUid(targetUid) : null;
    if (chosen && chosen.alive && chosen.side === unit.side) return chosen;
    // Padrão: aliado com menor proporção de vida.
    return pool.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] ?? unit;
  }

  cleanse(unit) {
    const before = unit.statuses.length;
    unit.statuses = unit.statuses.filter((status) => status.type !== 'burn');
    if (before !== unit.statuses.length) this.log(`Queimadura removida de ${unit.name}.`, 'buff');
  }

  giveShield(unit, amount, turns) {
    unit.statuses.push({
      type: 'shield',
      turns,
      expiresAt: this.round + turns + 1,
      value: amount,
      meta: STATUS_META.shield,
    });
  }

  /* -------------------------------- dano --------------------------------- */

  /** Ataque padrão: dano + aplicação de efeito + perseguições. */
  async hit(attacker, target, power, options = {}) {
    if (!target?.alive) return;
    const result = await this.damageUnit(attacker, target, power, options);
    if (!result) return;

    if (options.effect) {
      const chance = (options.effect.chance ?? 0) + (options.effectBoost ?? 0);
      if (Math.random() < chance) {
        await this.applyStatus(target, options.effect, attacker);
      }
    }

    if (attacker?.charId === 'sasuke' && result.crit && target.alive) {
      await this.applyStatus(target, { type: 'burn', chance: 1, turns: 2 }, attacker, true);
    }
  }

  /**
   * Aplica dano e devolve detalhes. `power` é multiplicador de ataque;
   * quando `options.flat` é verdadeiro, `power` já é o dano final.
   */
  async damageUnit(attacker, target, power, options = {}) {
    if (!target.alive) return null;

    let raw;
    if (options.flat) {
      raw = power;
    } else {
      const attackerAtk = attacker?.atk ?? 0;
      let defense = target.defense;
      for (const status of target.statuses) {
        const meta = statusMeta(status.type);
        if (meta.defMod) defense *= 1 + meta.defMod;
      }
      const reduction = defense / (defense + this.tuning.defenseConstant);
      raw = attackerAtk * power * (1 - reduction);
      raw *= this.tuning.globalMultiplier;
      raw *= 1 + (Math.random() * 2 - 1) * this.tuning.variance;
      if (attacker?.side === 'ally') {
        const teamBonus = attacker.teamBonus ?? {};
        const damageBonus = options.kind === 'jutsu'
          ? teamBonus.techniqueDamagePct ?? 0
          : options.kind === 'basic' || options.kind === 'combo'
            ? teamBonus.basicDamagePct ?? 0
            : 0;
        raw *= 1 + damageBonus;
      }
      if (attacker?.charId === 'lee') {
        const missing = 1 - attacker.hp / attacker.maxHp;
        raw *= 1 + missing * 0.25;
      }
      if (attacker?.isHero && attacker.style === 'genjutsu' && target.statuses.some((s) => s.type === 'stun')) {
        raw *= 1.15;
      }
      if (attacker?.charId === 'hinata' && target.statuses.some((s) => s.type === 'defDown')) {
        raw *= 1.1;
      }
    }

    // Bônus defensivo também vale para dano fixo, como queimadura, mas não para recuo próprio.
    if (target.side === 'ally' && options.kind !== 'recoil') {
      raw *= 1 - (target.teamBonus?.damageReduction ?? 0);
    }

    const critChance = attacker ? (attacker.crit ?? 0.05) + (options.critBonus ?? 0) : 0;
    const crit = target.side === 'enemy' ? Math.random() < critChance : Math.random() < critChance;
    if (crit) raw *= this.tuning.critMultiplier;
    if (target.guard) raw *= 0.5;

    let damage = Math.max(1, Math.round(raw));

    // Barreira absorve primeiro.
    const shield = target.statuses.find((status) => status.type === 'shield' && status.value > 0);
    let absorbed = 0;
    if (shield) {
      absorbed = Math.min(shield.value, damage);
      shield.value -= absorbed;
      damage -= absorbed;
      if (shield.value <= 0) target.statuses = target.statuses.filter((status) => status !== shield);
    }

    target.hp = Math.max(0, target.hp - damage);
    if (attacker?.side === 'ally') this.hooks.trackDamage?.(damage);

    await this.hooks.hit(target, {
      amount: damage,
      absorbed,
      crit,
      kind: options.kind ?? 'basic',
      label: options.label,
      kanji: options.kanji,
      sourceSide: attacker?.side,
    });

    if (target.hp <= 0 && target.alive) {
      target.alive = false;
      target.statuses = [];
      this.log(`${target.name} foi derrotado.`, 'defeat');
      await this.hooks.defeat?.(target);
    }

    this.hooks.render();
    return { damage, crit, absorbed };
  }

  async healUnit(source, target, amount, label = 'Cura') {
    if (!target.alive) return;
    target.hp = Math.min(target.maxHp, target.hp + amount);
    await this.hooks.heal(target, amount, label);
    this.log(`${target.name} recupera ${amount} de vida.`, 'buff');
    this.hooks.render();
  }

  /* ------------------------------- efeitos ------------------------------- */

  async applyStatus(target, effect, source, silentCombo = false, depth = 0) {
    if (!target.alive) return false;
    const meta = statusMeta(effect.type);
    if (effect.type === 'stun' && target.charId === 'itachi') return false;

    // Renova a duração se o efeito já existir.
    const existing = target.statuses.find((status) => status.type === effect.type);
    const turns = effect.turns ?? meta.turns;
    if (existing) {
      existing.turns = turns;
      existing.expiresAt = this.round + turns + 1;
    } else {
      target.statuses.push({
        type: effect.type,
        turns,
        expiresAt: this.round + turns + 1,
        meta,
      });
    }

    this.log(`${target.name} sofre ${meta.label}!`, 'status');
    await this.hooks.statusApplied?.(target, meta);
    this.hooks.render();

    if (meta.combo && !silentCombo) {
      await this.triggerPursuit(effect.type, target, source, depth);
    }
    return true;
  }

  /**
   * COMBO EM CADEIA: cada aliado vivo com perseguição compatível ataca
   * automaticamente. A própria perseguição pode aplicar outro efeito e
   * continuar a cadeia (limite de profundidade 3 para não travar).
   */
  async triggerPursuit(statusType, target, source, depth) {
    if (depth > 3 || !source) return;
    const pursuers = this.alliesOf(source)
      .filter(
        (ally) =>
          ally.uid !== source.uid &&
          ally.alive &&
          !ally.pursuitUsed &&
          Array.isArray(ally.def.pursuit?.triggers) &&
          ally.def.pursuit.triggers.includes(statusType),
      )
      .sort((a, b) => {
        const speed = this.speedOf(b) - this.speedOf(a);
        if (speed !== 0) return speed;
        const lane = formationColumn(b.slot) - formationColumn(a.slot);
        return lane !== 0 ? lane : a.slot - b.slot;
      });

    for (const pursuer of pursuers) {
      if (!target.alive) break;
      pursuer.pursuitUsed = true;
      this.comboCount += 1;
      this.bestCombo = Math.max(this.bestCombo, this.comboCount);
      const pursuit = pursuer.def.pursuit;

      await this.hooks.combo({
        count: this.comboCount,
        attacker: pursuer,
        target,
        name: pursuit.name,
      });
      this.log(`Perseguição: ${pursuer.name} usa ${pursuit.name}! (combo x${this.comboCount})`, 'combo');

      const hits = pursuit.hits ?? 1;
      for (let index = 0; index < hits; index += 1) {
        if (!target.alive) break;
        await this.hit(pursuer, target, (pursuit.mult ?? 0.5) / hits, {
          label: pursuit.name,
          kind: 'combo',
        });
      }

      if (pursuit.effect && target.alive && Math.random() < (pursuit.effect.chance ?? 0.3)) {
        // Recursão: mantém a cadeia viva, mas com profundidade limitada.
        await this.applyStatus(target, pursuit.effect, pursuer, depth + 1 > 3, depth + 1);
      }
    }
  }

  /* ------------------------------- IA ----------------------------------- */

  chooseAiAction(unit) {
    const targets = this.enemiesOf(unit);
    if (!targets.length) return { type: 'guard' };
    const reachableTargets = this.frontlineTargets(targets);
    const jutsus = jutsusOf(unit.def).filter((jutsu) => jutsu.cost <= unit.chakra);

    // Se está com pouca vida e tem cura/escudo, prioriza sobreviver.
    const lowHp = unit.hp / unit.maxHp < 0.35;
    const support = jutsus.find((jutsu) => jutsu.heal || jutsu.shield);

    if (lowHp && support && Math.random() < 0.7) {
      return { type: 'jutsu', jutsuId: support.id, targetUid: unit.uid };
    }
    if (jutsus.length && Math.random() < 0.72) {
      const jutsu = jutsus[randInt(0, jutsus.length - 1)];
      const target = supportsAnyone(jutsu) ? unit : pickWeakest(reachableTargets);
      return { type: 'jutsu', jutsuId: jutsu.id, targetUid: target.uid };
    }
    return { type: 'basic', targetUid: pickWeakest(reachableTargets).uid };
  }
}

function supportsAnyone(jutsu) {
  return jutsu.target === 'self' || jutsu.target === 'allAllies' || jutsu.target === 'ally';
}

function pickWeakest(list) {
  return list.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] ?? list[0];
}
