import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { game } from '../src/core/state.js';
import { ITEM_CATALOG, STARTING_INVENTORY } from '../src/data/items.js';

const STORAGE_KEY = 'konoha-shinobi-legends.save.v1';
const values = new Map();
globalThis.localStorage = {
  getItem(key) { return values.get(key) ?? null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); },
  clear() { values.clear(); },
};

beforeEach(() => {
  game.reset();
  localStorage.clear();
});

test('save antigo sem inventário migra itens padrão sem perder perfil, recursos ou equipe', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    version: 2,
    createdAt: Date.now(),
    lastTick: Date.now(),
    player: { name: 'Herói salvo', gender: 'feminino', style: 'taijutsu', level: 4, exp: 17 },
    resources: { chakra: 9, stamina: 12, ryos: 840, gold: 3 },
    ninjas: ['naruto', 'sakura', 'kakashi'],
    squad: ['hero', 'naruto', 'sakura', 'kakashi'],
    scrolls: { comum: 2, prata: 1, ouro: 0 },
    missions: { treino_inicial: { wins: 1, bestRound: 3 } },
  }));

  assert.equal(game.load(), true);
  assert.equal(game.state.version, 3);
  assert.equal(game.state.player.name, 'Herói salvo');
  assert.equal(game.state.player.level, 4);
  assert.equal(game.state.resources.ryos, 840);
  assert.deepEqual(new Set(game.state.squad), new Set(['hero', 'naruto', 'sakura', 'kakashi']));
  assert.deepEqual(game.state.scrolls, { comum: 2, prata: 1, ouro: 0 });
  assert.deepEqual(game.state.inventory, STARTING_INVENTORY);
  assert.deepEqual(game.state.equipment, {});
});

test('equipar uma peça consome uma unidade, soma atributos reais e persiste no snapshot', () => {
  game.start({ name: 'Ficha de teste', gender: 'masculino', style: 'ninjutsu' });
  const base = game.characterStats('hero');
  const result = game.equipItem('training_kunai', 'hero');

  assert.equal(result.ok, true);
  assert.equal(game.state.inventory.training_kunai, 0);
  assert.equal(game.state.equipment.hero.weapon, 'training_kunai');
  assert.equal(game.characterStats('hero').atk, base.atk + ITEM_CATALOG.training_kunai.bonus.atk);
  assert.equal(game.characterStats('hero').crit, base.crit + ITEM_CATALOG.training_kunai.bonus.crit);
  assert.equal(game.squadUnits().find((unit) => unit.charId === 'hero').atk, base.atk + ITEM_CATALOG.training_kunai.bonus.atk);

  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  assert.equal(saved.equipment.hero.weapon, 'training_kunai');
  assert.equal(saved.inventory.training_kunai, 0);

  assert.equal(game.load(), true);
  assert.equal(game.equipmentFor('hero').weapon, 'training_kunai');
  assert.equal(game.characterStats('hero').atk, base.atk + ITEM_CATALOG.training_kunai.bonus.atk);
});

test('remover equipamento devolve uma unidade e não concede atributos depois do retorno à mochila', () => {
  game.start({ name: 'Ficha de teste', gender: 'masculino', style: 'taijutsu' });
  const before = game.characterStats('hero');
  assert.equal(game.equipItem('leaf_vest', 'hero').ok, true);
  assert.equal(game.characterStats('hero').maxHp, before.maxHp + ITEM_CATALOG.leaf_vest.bonus.hp);
  assert.equal(game.characterStats('hero').defense, before.defense + ITEM_CATALOG.leaf_vest.bonus.def);

  const removed = game.unequipItem('hero', 'armor');
  assert.equal(removed.ok, true);
  assert.equal(game.state.inventory.leaf_vest, 1);
  assert.deepEqual(game.equipmentFor('hero'), {});
  assert.equal(game.characterStats('hero').maxHp, before.maxHp);
});

test('consumível restaura somente até o limite e não gasta item quando o recurso já está cheio', () => {
  game.start({ name: 'Ficha de teste', gender: 'masculino', style: 'ninjutsu' });
  const initialCount = game.state.inventory.chakra_tonic;
  game.state.resources.chakra = game.chakraMax;

  const fullResult = game.useItem('chakra_tonic');
  assert.equal(fullResult.ok, false);
  assert.equal(game.state.inventory.chakra_tonic, initialCount);

  game.state.resources.chakra = game.chakraMax - 7;
  const restored = game.useItem('chakra_tonic');
  assert.equal(restored.ok, true);
  assert.equal(restored.restored, 7);
  assert.equal(game.state.resources.chakra, game.chakraMax);
  assert.equal(game.state.inventory.chakra_tonic, initialCount - 1);
  assert.equal(JSON.parse(localStorage.getItem(STORAGE_KEY)).inventory.chakra_tonic, initialCount - 1);
});

test('materiais, itens desconhecidos e personagens não recrutados não podem ser usados como equipamento', () => {
  game.start({ name: 'Ficha de teste', gender: 'masculino', style: 'genjutsu' });
  assert.equal(game.equipItem('blank_tag', 'hero').ok, false);
  assert.equal(game.equipItem('missing_item', 'hero').ok, false);
  assert.equal(game.equipItem('training_kunai', 'orochimaru').ok, false);
  assert.equal(game.useItem('blank_tag').ok, false);
  assert.equal(game.state.inventory.training_kunai, 1);
  assert.equal(game.state.equipment.hero, undefined);
});
