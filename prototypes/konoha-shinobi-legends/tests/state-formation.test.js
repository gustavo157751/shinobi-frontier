import test from 'node:test';
import assert from 'node:assert/strict';
import { ROSTER } from '../src/data/characters.js';
import { game } from '../src/core/state.js';

const entries = new Map();
globalThis.localStorage = {
  getItem(key) { return entries.get(key) ?? null; },
  setItem(key, value) { entries.set(key, String(value)); },
  removeItem(key) { entries.delete(key); },
};
const STORAGE_KEY = 'konoha-shinobi-legends.save.v1';

test('save antigo sem grade recebe posições válidas sem perder a equipe', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    version: 1,
    player: { name: 'Teste', gender: 'feminino', style: 'ninjutsu', level: 3, exp: 12 },
    ninjas: ['naruto', 'sakura', 'kakashi'],
    squad: ['hero', 'naruto', 'sakura'],
    resources: { ryos: 777 },
  }));
  assert.equal(game.load(), true);
  assert.deepEqual(new Set(game.state.squad), new Set(['hero', 'naruto', 'sakura']));
  const positions = game.state.squad.map((id) => game.formationSlot(id));
  assert.ok(positions.every((position) => Number.isInteger(position) && position >= 0 && position <= 8));
  assert.equal(new Set(positions).size, positions.length);
  assert.equal(game.state.resources.ryos, 777);
});

test('troca duas unidades e mantém a formação única e persistida', () => {
  const first = game.state.squad[0];
  const second = game.state.squad[1];
  const firstSlot = game.formationSlot(first);
  const secondSlot = game.formationSlot(second);
  assert.equal(game.placeSquadMember(first, secondSlot).action, 'swapped');
  assert.equal(game.formationSlot(first), secondSlot);
  assert.equal(game.formationSlot(second), firstSlot);
  const positions = game.state.squad.map((id) => game.formationSlot(id));
  assert.equal(new Set(positions).size, positions.length);
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  assert.deepEqual(saved.formationSlots, game.state.formationSlots);
});

test('ninja recém-invocado recebe célula única e continua na formação após recarregar', () => {
  const common = ROSTER.find((character) => character.rarity === 'comum' && !game.isOwned(character.id));
  assert.ok(common, 'o teste precisa de ao menos um ninja comum ainda não invocado');
  game.state.scrolls.comum = 1;

  const originalRandom = Math.random;
  let result;
  try {
    Math.random = () => 0;
    result = game.summon('comum');
  } finally {
    Math.random = originalRandom;
  }

  assert.equal(result.ok, true);
  assert.equal(result.duplicate, false);
  const id = result.character.id;
  assert.ok(game.state.squad.includes(id));
  assert.ok(Number.isInteger(game.formationSlot(id)));
  let positions = game.state.squad.map((memberId) => game.formationSlot(memberId));
  assert.equal(new Set(positions).size, positions.length);

  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  assert.ok(Number.isInteger(saved.formationSlots[id]));
  assert.equal(game.load(), true);
  assert.ok(game.state.squad.includes(id));
  assert.equal(game.formationSlot(id), saved.formationSlots[id]);
  positions = game.state.squad.map((memberId) => game.formationSlot(memberId));
  assert.equal(new Set(positions).size, positions.length);
});

test('mover Suporte da retaguarda para a frente recalcula o bônus de Guarda no snapshot e no save', () => {
  game.start({ name: 'Teste Tático', gender: 'feminino', style: 'ninjutsu' });
  game.setSquad(['hero', 'naruto', 'sakura', 'kakashi']);
  assert.equal(game.placeSquadMember('sakura', 3).ok, true);
  assert.equal(game.placeSquadMember('kakashi', 8).ok, true);

  const rearUnits = game.squadUnits();
  const rearBonus = rearUnits[0].teamBonus;
  assert.equal(rearBonus.chakraPct, 0.03);
  assert.equal(rearBonus.guardChakra, 6);
  assert.ok(rearUnits.every((unit) => unit.teamBonus.guardChakra === rearBonus.guardChakra));

  assert.equal(game.placeSquadMember('sakura', 5).ok, true);
  const frontUnits = game.squadUnits();
  const frontBonus = frontUnits[0].teamBonus;
  assert.equal(frontBonus.chakraPct, rearBonus.chakraPct);
  assert.equal(frontBonus.guardChakra, 4);
  assert.equal(frontBonus.basicDamagePct, rearBonus.basicDamagePct);
  assert.equal(frontBonus.techniqueDamagePct, rearBonus.techniqueDamagePct);
  assert.ok(frontUnits.every((unit) => unit.teamBonus.guardChakra === frontBonus.guardChakra));

  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  assert.equal(saved.formationSlots.sakura, 5);
  assert.equal(new Set(game.state.squad.map((id) => game.formationSlot(id))).size, game.state.squad.length);
});
