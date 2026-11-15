/**
 * state.js — ESTADO DO JOGO E SALVAMENTO (localStorage)
 * ====================================================
 * Todo o progresso vive em `game.state`. Sempre que algo muda chamamos
 * `game.commit()`, que grava no localStorage e avisa a interface.
 *
 * Chave usada no navegador: "konoha-shinobi-legends.save.v1".
 * Para zerar: botão "Apagar progresso" nas configurações ou
 * localStorage.removeItem('konoha-shinobi-legends.save.v1').
 */

import { HERO_TEMPLATES, ROSTER, getCharacter, statsFor, buildUnit } from '../data/characters.js';
import { SCROLLS, DUPLICATE_REWARD, STARTER_NINJAS, STARTING_SCROLLS } from '../data/scrolls.js';
import { weightedPick, randInt, clamp, shuffle } from './utils.js';
import { applyFormationBonus, formationBonuses } from './formation.js';

const STORAGE_KEY = 'konoha-shinobi-legends.save.v1';
const SAVE_VERSION = 1;

/* ------------------------- CURVAS DE PROGRESSÃO ------------------------- */

/** EXP necessária para passar do nível atual para o próximo. */
export const expToNext = (level) => Math.round(120 + (level - 1) * 140);

/** Limite de stamina por nível (entra nas missões). */
export const staminaMaxFor = (level) => 22 + level * 2;

/** Limite de chakra por nível (usado em treino e meditação). */
export const chakraMaxFor = (level) => 90 + level * 6;

/** Segundos para recuperar 1 ponto de stamina / chakra. */
export const STAMINA_REGEN_SECONDS = 6 * 60;
export const CHAKRA_REGEN_SECONDS = 2 * 60;

/** Custos das ações da vila (em Chakra). */
export const TRAIN_COST = 25;
export const MEDITATE_COST = 40;
export const MEDITATE_STAMINA = 6;

/* ----------------------------- ESTADO NOVO ----------------------------- */

function newState({ name, gender, style }) {
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    createdAt: now,
    lastTick: now,
    player: {
      name,
      gender,
      style,
      level: 1,
      exp: 0,
      title: HERO_TEMPLATES[style].title,
    },
    resources: {
      chakra: chakraMaxFor(1),
      stamina: staminaMaxFor(1),
      ryos: 1200,
      gold: 5,
    },
    tips: { chakraSpent: 0, staminaSpent: 0 },
    ninjas: [...STARTER_NINJAS], // heróis clássicos desbloqueados
    squad: ['hero', ...STARTER_NINJAS.slice(0, 4)],
    scrolls: { ...STARTING_SCROLLS },
    missions: {}, // { [missionId]: { wins: n, bestRound: n } }
    stats: { battles: 0, victories: 0, combos: 0, damage: 0 },
    settings: { sfx: true },
    introSeen: false,
  };
}

/* ------------------------------- LOADER -------------------------------- */

function migrate(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const base = newState({
    name: raw.player?.name ?? 'Shinobi',
    gender: raw.player?.gender ?? 'masculino',
    style: HERO_TEMPLATES[raw.player?.style] ? raw.player.style : 'ninjutsu',
  });
  const merged = {
    ...base,
    ...raw,
    player: { ...base.player, ...(raw.player ?? {}) },
    resources: { ...base.resources, ...(raw.resources ?? {}) },
    scrolls: { ...base.scrolls, ...(raw.scrolls ?? {}) },
    stats: { ...base.stats, ...(raw.stats ?? {}) },
    settings: { ...base.settings, ...(raw.settings ?? {}) },
    missions: raw.missions ?? {},
    ninjas: Array.isArray(raw.ninjas) ? raw.ninjas.filter((id) => getCharacter(id)) : base.ninjas,
    squad: Array.isArray(raw.squad) ? raw.squad : base.squad,
  };
  merged.version = SAVE_VERSION;
  return merged;
}

export function readSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch (error) {
    console.warn('Save corrompido, começando um novo jogo.', error);
    return null;
  }
}

export function hasSave() {
  return Boolean(readSave());
}

/* ------------------------------ GAME STORE ------------------------------ */

class GameStore {
  constructor() {
    this.state = null;
    this.listeners = new Set();
  }

  /* ----- infraestrutura ----- */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit() {
    for (const listener of this.listeners) listener(this.state);
  }

  commit() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn('Não foi possível salvar o progresso.', error);
    }
    this.emit();
  }

  start({ name, gender, style }) {
    this.state = newState({ name, gender, style });
    this.commit();
    return this.state;
  }

  load() {
    const save = readSave();
    if (!save) return false;
    this.state = save;
    this.tick();
    return true;
  }

  reset() {
    localStorage.removeItem(STORAGE_KEY);
    this.state = null;
    this.emit();
  }

  /* ----- derivados ----- */
  get hero() {
    return this.state ? HERO_TEMPLATES[this.state.player.style] : null;
  }

  get level() {
    return this.state?.player.level ?? 1;
  }

  get expNeeded() {
    return expToNext(this.level);
  }

  get staminaMax() {
    return staminaMaxFor(this.level);
  }

  get chakraMax() {
    return chakraMaxFor(this.level);
  }

  ownedCharacterIds() {
    return this.state?.ninjas ?? [];
  }

  isOwned(id) {
    return id === 'hero' || this.ownedCharacterIds().includes(id);
  }

  /** Formação pronta para a batalha (até 5 unidades: protagonista + 4 ninjas). */
  squadUnits() {
    if (!this.state) return [];
    const ids = this.state.squad.filter((id) => this.isOwned(id));
    // O protagonista nunca pode ficar fora da formação (protege saves antigos/editados).
    if (!ids.includes('hero')) ids.unshift('hero');
    ids.splice(5);
    const members = ids.map((id, position) => {
      const character = id === 'hero'
        ? { ...this.hero, id: 'hero', rarity: 'lendario' }
        : getCharacter(id);
      return { character, position, level: this.level };
    });
    const bonus = formationBonuses(members);
    return ids.map((id, index) => {
      if (id === 'hero') {
        const hero = this.hero;
        return applyFormationBonus(buildUnit(hero, {
          level: this.level,
          side: 'ally',
          slot: index,
          isHero: true,
          displayName: this.state.player.name,
        }), bonus);
      }
      const character = getCharacter(id);
      return applyFormationBonus(buildUnit(character, { level: this.level, side: 'ally', slot: index }), bonus);
    });
  }

  squadCharacters() {
    if (!this.state) return [];
    return this.state.squad
      .filter((id) => this.isOwned(id))
      .map((id) => (id === 'hero' ? { ...this.hero, isHero: true, name: this.state.player.name } : getCharacter(id)))
      .filter(Boolean);
  }

  heroStats() {
    return this.state ? statsFor(this.hero, this.level) : null;
  }

  missionRecord(id) {
    return this.state?.missions?.[id] ?? { wins: 0, bestRound: null };
  }

  isMissionUnlocked(mission) {
    return this.level >= mission.minLevel;
  }

  /* ----- regeneração de recursos ----- */
  tick() {
    if (!this.state) return;
    const now = Date.now();
    const elapsed = Math.max(0, (now - (this.state.lastTick ?? now)) / 1000);
    if (elapsed < 1) {
      this.state.lastTick = now;
      return;
    }
    const res = this.state.resources;
    const capChakra = this.chakraMax;
    const capStamina = this.staminaMax;

    res.chakra = Math.min(capChakra, res.chakra + elapsed / CHAKRA_REGEN_SECONDS);
    res.stamina = Math.min(capStamina, res.stamina + elapsed / STAMINA_REGEN_SECONDS);
    this.state.lastTick = now;

    // Atualiza o último tick sem emitir (evita re-render a cada segundo;
    // a interface se atualiza por conta própria com game.resourceSnapshot()).
    this.persistQuiet();
  }

  persistQuiet() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn('Falha ao persistir recursos.', error);
    }
  }

  resourceSnapshot() {
    if (!this.state) return { chakra: 0, stamina: 0, ryos: 0, gold: 0, chakraMax: 0, staminaMax: 0 };
    const res = this.state.resources;
    return {
      chakra: Math.floor(res.chakra),
      stamina: Math.floor(res.stamina),
      ryos: Math.floor(res.ryos),
      gold: Math.floor(res.gold),
      chakraMax: this.chakraMax,
      staminaMax: this.staminaMax,
    };
  }

  secondsToNext(kind) {
    if (!this.state) return 0;
    const res = this.state.resources;
    const step = kind === 'chakra' ? CHAKRA_REGEN_SECONDS : STAMINA_REGEN_SECONDS;
    const value = kind === 'chakra' ? res.chakra : res.stamina;
    const cap = kind === 'chakra' ? this.chakraMax : this.staminaMax;
    if (value >= cap) return 0;
    return Math.ceil((1 - (value % 1)) * step);
  }

  /* ----- recursos / recompensas ----- */
  canAfford(cost = {}) {
    if (!this.state) return false;
    const res = this.state.resources;
    if (cost.ryos && res.ryos < cost.ryos) return false;
    if (cost.gold && res.gold < cost.gold) return false;
    if (cost.chakra && res.chakra < cost.chakra) return false;
    if (cost.stamina && res.stamina < cost.stamina) return false;
    return true;
  }

  pay(cost = {}) {
    if (!this.canAfford(cost)) return false;
    const res = this.state.resources;
    if (cost.ryos) res.ryos -= cost.ryos;
    if (cost.gold) res.gold -= cost.gold;
    if (cost.chakra) res.chakra = Math.max(0, res.chakra - cost.chakra);
    if (cost.stamina) res.stamina = Math.max(0, res.stamina - cost.stamina);
    this.commit();
    return true;
  }

  addRyos(amount) {
    this.state.resources.ryos += Math.max(0, Math.round(amount));
    this.commit();
  }

  addGold(amount) {
    this.state.resources.gold += Math.max(0, Math.round(amount));
    this.commit();
  }

  addScroll(type, amount = 1) {
    if (!this.state.scrolls[type]) this.state.scrolls[type] = 0;
    this.state.scrolls[type] += amount;
    this.commit();
  }

  /**
   * Adiciona EXP e trata subida de nível.
   * @returns {{leveledUp: boolean, levels: number, newLevel: number}}
   */
  addExp(amount) {
    let leveledUp = false;
    let levels = 0;
    this.state.player.exp += Math.max(0, Math.round(amount));
    while (this.state.player.exp >= expToNext(this.level)) {
      this.state.player.exp -= expToNext(this.level);
      this.state.player.level += 1;
      levels += 1;
      leveledUp = true;
      // Recompensa ao subir de nível: recursos cheios.
      this.state.resources.chakra = this.chakraMax;
      this.state.resources.stamina = this.staminaMax;
    }
    this.commit();
    return { leveledUp, levels, newLevel: this.level };
  }

  /* ----- formação ----- */
  setSquad(ids) {
    const unique = [];
    for (const id of ids) {
      if (!id || unique.includes(id)) continue;
      if (!this.isOwned(id)) continue;
      unique.push(id);
    }
    if (!unique.includes('hero')) unique.unshift('hero');
    this.state.squad = unique.slice(0, 5);
    this.commit();
    return this.state.squad;
  }

  toggleSquadMember(id) {
    if (id === 'hero') return { ok: false, reason: 'O protagonista é obrigatório na formação.' };
    const squad = [...this.state.squad];
    const index = squad.indexOf(id);
    if (index >= 0) {
      squad.splice(index, 1);
      this.setSquad(squad);
      return { ok: true, action: 'removed' };
    }
    if (squad.length >= 5) return { ok: false, reason: 'A formação já tem 5 integrantes (protagonista + 4 ninjas).' };
    if (!this.isOwned(id)) return { ok: false, reason: 'Você ainda não invocou esse ninja.' };
    squad.push(id);
    this.setSquad(squad);
    return { ok: true, action: 'added' };
  }

  /** Troca um integrante de posição na formação (ordem exibida na arena). */
  moveSquadMember(id, direction) {
    const squad = [...this.state.squad];
    const index = squad.indexOf(id);
    const target = index + direction;
    if (index < 0) return { ok: false, reason: 'Integrante não está na formação.' };
    if (target < 0 || target >= squad.length) return { ok: false, reason: 'Já está na ponta da formação.' };
    [squad[index], squad[target]] = [squad[target], squad[index]];
    this.setSquad(squad);
    return { ok: true };
  }

  /* ----- invocação (pergaminhos) ----- */
  summon(scrollId) {
    const scroll = SCROLLS[scrollId];
    if (!scroll) return { ok: false, reason: 'Pergaminho inválido.' };
    if ((this.state.scrolls[scrollId] ?? 0) <= 0) return { ok: false, reason: 'Você não tem esse pergaminho.' };

    const rarity = weightedPick(Object.entries(scroll.weights));
    const poolAll = ROSTER.filter((character) => character.rarity === rarity);
    const poolNew = poolAll.filter((character) => !this.isOwned(character.id));
    const isDuplicate = poolNew.length === 0;
    const pool = isDuplicate ? poolAll : poolNew;
    const character = shuffle(pool)[0];

    this.state.scrolls[scrollId] -= 1;

    if (!character) {
      this.commit();
      return { ok: false, reason: 'Nenhum ninja encontrado nessa raridade.' };
    }

    if (isDuplicate) {
      const reward = DUPLICATE_REWARD[rarity] ?? { ryo: 400, exp: 100 };
      this.state.resources.ryos += reward.ryo;
      this.commit();
      this.addExp(reward.exp);
      return { ok: true, duplicate: true, character, reward, rarity, scroll };
    }

    this.state.ninjas.push(character.id);
    // Preenche automaticamente uma vaga livre na formação.
    if (this.state.squad.length < 5) this.state.squad.push(character.id);
    this.commit();
    return { ok: true, duplicate: false, character, rarity, scroll };
  }

  buyScroll(scrollId, currency = 'ryos') {
    const scroll = SCROLLS[scrollId];
    if (!scroll) return { ok: false, reason: 'Pergaminho inválido.' };
    const price = currency === 'gold' ? scroll.costGold : scroll.costRyo;
    const cost = currency === 'gold' ? { gold: price } : { ryos: price };
    if (!this.canAfford(cost)) {
      return { ok: false, reason: currency === 'gold' ? 'Ouro insuficiente.' : 'Ryos insuficientes.' };
    }
    this.state.resources[currency === 'gold' ? 'gold' : 'ryos'] -= price;
    this.state.scrolls[scrollId] = (this.state.scrolls[scrollId] ?? 0) + 1;
    this.commit();
    return { ok: true, scroll };
  }

  /* ----- ações da vila ----- */
  train() {
    if (!this.canAfford({ chakra: TRAIN_COST })) return { ok: false, reason: 'Chakra insuficiente. Medite ou aguarde a regeneração.' };
    this.state.resources.chakra -= TRAIN_COST;
    const gain = 60 + this.level * 22 + randInt(0, 30);
    const result = this.addExp(gain);
    return { ok: true, exp: gain, ...result };
  }

  meditate() {
    if (!this.canAfford({ chakra: MEDITATE_COST })) return { ok: false, reason: 'Chakra insuficiente.' };
    this.state.resources.chakra -= MEDITATE_COST;
    const staminaBefore = this.state.resources.stamina;
    this.state.resources.stamina = clamp(
      this.state.resources.stamina + MEDITATE_STAMINA,
      0,
      this.staminaMax,
    );
    const gained = Math.floor(this.state.resources.stamina - staminaBefore);
    this.commit();
    return { ok: true, stamina: gained };
  }

  /* ----- resultado da missão ----- */
  startMission(mission) {
    if (!this.canAfford({ stamina: mission.stamina })) {
      return { ok: false, reason: 'Stamina insuficiente para esta missão.' };
    }
    this.state.resources.stamina -= mission.stamina;
    this.commit();
    return { ok: true };
  }

  finishMission(mission, { victory, rounds = 0 }) {
    this.state.stats.battles += 1;
    if (!victory) {
      this.commit();
      return { rewards: null };
    }
    this.state.stats.victories += 1;
    const record = this.missionRecord(mission.id);
    this.state.missions[mission.id] = {
      wins: record.wins + 1,
      bestRound: record.bestRound ? Math.min(record.bestRound, rounds) : rounds,
    };

    const rewards = mission.rewards ?? {};
    this.state.resources.ryos += rewards.ryo ?? 0;
    if (rewards.gold) this.state.resources.gold += rewards.gold;
    for (const [type, amount] of Object.entries(rewards.scrolls ?? {})) {
      this.state.scrolls[type] = (this.state.scrolls[type] ?? 0) + amount;
    }
    // Primeira vitória rende um bônus extra de Ryos.
    const firstClear = record.wins === 0;
    if (firstClear) this.state.resources.ryos += Math.round((rewards.ryo ?? 0) * 0.5);

    const levelResult = this.addExp(rewards.exp ?? 0); // já commita
    return { rewards, firstClear, levelResult };
  }

  registerCombo(count) {
    this.state.stats.combos += count;
  }

  registerDamage(amount) {
    this.state.stats.damage += Math.round(amount);
  }

  toggleSfx() {
    this.state.settings.sfx = !this.state.settings.sfx;
    this.commit();
    return this.state.settings.sfx;
  }

  markIntroSeen() {
    this.state.introSeen = true;
    this.commit();
  }
}

/** Instância única usada por toda a aplicação. */
export const game = new GameStore();

/** Helper de UI: cria batalha a partir de uma missão. */
export function enemyUnitsFor(mission) {
  return mission.enemies.map((entry, index) => {
    const character = getCharacter(entry.id);
    return buildUnit(character, {
      level: entry.level ?? mission.minLevel,
      side: 'enemy',
      slot: index,
      displayName: entry.name ?? character.name,
    });
  });
}
