import test from 'node:test';
import assert from 'node:assert/strict';
import { HERO_TEMPLATES, getCharacter } from '../src/data/characters.js';
import { simulateCombo } from '../src/core/combo-simulator.js';

const members = [
  { id: 'hero', character: { ...HERO_TEMPLATES.ninjutsu, id: 'hero', name: 'Protagonista' }, position: 4, level: 1 },
  { id: 'naruto', character: getCharacter('naruto'), position: 2, level: 1 },
  { id: 'sasuke', character: getCharacter('sasuke'), position: 5, level: 1 },
];

test('simula perseguidores compatíveis em ordem de velocidade e soma os acertos', () => {
  const combo = simulateCombo(members, 'hero', {
    name: 'Disparo de Chakra',
    hits: 1,
    effect: { type: 'float' },
  });
  assert.deepEqual(combo.sequence.map((step) => step.id), ['sasuke', 'naruto']);
  assert.deepEqual(combo.sequence.map((step) => step.hits), [1, 2]);
  assert.equal(combo.pursuitHits, 3);
  assert.equal(combo.totalHits, 4);
  assert.equal(combo.triggerLabel, 'Flutuação');
});

test('não inventa perseguições quando o efeito inicial não abre combo', () => {
  const combo = simulateCombo(members, 'hero', {
    name: 'Prisão dos Espelhos',
    hits: 1,
    effect: { type: 'stun' },
  });
  assert.equal(combo.sequence.length, 0);
  assert.equal(combo.totalHits, 1);
});

test('a cadeia não inclui o iniciador como perseguidor', () => {
  const combo = simulateCombo(members, 'naruto', {
    name: 'Clones das Sombras',
    hits: 2,
    effect: { type: 'knockdown' },
  });
  assert.ok(combo.sequence.every((step) => step.id !== 'naruto'));
  assert.equal(combo.starterHits, 2);
});

function withEqualSpeed(id) {
  const character = getCharacter(id);
  return {
    ...character,
    base: { ...character.base, spd: 100 },
    growth: { ...character.growth, spd: 0 },
  };
}

test('em empate de velocidade, pursuits priorizam frente, meio e retaguarda da grade 3x3', () => {
  const tacticalTeam = [
    { ...members[0], position: 7 },
    { id: 'naruto', character: withEqualSpeed('naruto'), position: 0, level: 1 },
    { id: 'sasuke', character: withEqualSpeed('sasuke'), position: 4, level: 1 },
    { id: 'kakashi', character: withEqualSpeed('kakashi'), position: 2, level: 1 },
    { id: 'lee', character: withEqualSpeed('lee'), position: 5, level: 1 },
  ];
  const combo = simulateCombo(tacticalTeam, 'hero', {
    name: 'Disparo Tático',
    hits: 1,
    effect: { type: 'float' },
  });

  assert.deepEqual(combo.sequence.map((step) => step.id), ['kakashi', 'lee', 'sasuke', 'naruto']);
  assert.deepEqual(combo.sequence.map((step) => step.triggerType), ['float', 'float', 'float', 'float']);
  assert.ok(combo.sequence.every((step) => step.depth === 1));
  assert.deepEqual(combo.sequence.map((step) => step.hits), [1, 1, 1, 2]);
  assert.equal(combo.totalHits, 6);
});
