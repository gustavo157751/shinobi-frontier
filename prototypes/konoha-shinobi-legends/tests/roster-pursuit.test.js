import test from 'node:test';
import assert from 'node:assert/strict';
import { ELEMENTS, HERO_TEMPLATES, RARITIES, ROSTER, getCharacter, statsFor } from '../src/data/characters.js';
import { JUTSUS, jutsusOf } from '../src/data/jutsus.js';
import { SCROLLS } from '../src/data/scrolls.js';
import { COMBO_STATUSES, STATUS_META } from '../src/data/statuses.js';
import { simulateCombo } from '../src/core/combo-simulator.js';
import { roleFor } from '../src/core/formation.js';

const additions = [
  { id: 'neji', role: 'vanguard' },
  { id: 'choji', role: 'vanguard' },
  { id: 'temari', role: 'control' },
  { id: 'kankuro', role: 'control' },
  { id: 'zabuza', role: 'striker' },
  { id: 'haku', role: 'control' },
];

const characters = additions.map(({ id }) => getCharacter(id));

test('seis ninjas clássicos novos têm dados completos e IDs únicos no elenco', () => {
  assert.equal(characters.length, additions.length);
  assert.ok(characters.every(Boolean));
  assert.equal(new Set(ROSTER.map((character) => character.id)).size, ROSTER.length);

  for (const character of characters) {
    assert.ok(RARITIES[character.rarity], `${character.id} tem raridade válida`);
    assert.ok(ELEMENTS[character.element], `${character.id} tem elemento válido`);
    assert.ok(Object.values(character.base).every((value) => Number.isFinite(value) && value > 0));
    assert.equal(jutsusOf(character).length, 2, `${character.id} tem dois jutsus válidos`);
    assert.ok(statsFor(character, 10).hp > character.base.hp);
  }
});

test('cada personagem novo tem uma perseguição compatível com os estados existentes', () => {
  for (const character of characters) {
    const { pursuit } = character;
    assert.ok(pursuit?.name, `${character.id} tem nome de perseguição`);
    assert.ok(Number.isFinite(pursuit.mult) && pursuit.mult > 0 && pursuit.mult <= 1);
    assert.ok(Number.isInteger(pursuit.hits) && pursuit.hits >= 1 && pursuit.hits <= 4);
    assert.ok(pursuit.triggers.length > 0);
    assert.ok(pursuit.triggers.every((trigger) => COMBO_STATUSES.includes(trigger)), `${character.id} usa gatilhos de combo válidos`);
    if (pursuit.effect) assert.ok(STATUS_META[pursuit.effect.type], `${character.id} usa efeito existente`);
  }
});

test('jutsus cadastrados e papéis de formação correspondem a cada novo personagem', () => {
  for (const { id, role } of additions) {
    const character = getCharacter(id);
    assert.ok(character.jutsu.every((jutsuId) => JUTSUS[jutsuId]), `${id} não aponta para jutsu ausente`);
    assert.equal(roleFor(character), role);
  }
});

test('raridade de cada ninja novo pode ser sorteada por algum pergaminho', () => {
  for (const character of characters) {
    assert.ok(
      Object.values(SCROLLS).some((scroll) => (scroll.weights[character.rarity] ?? 0) > 0),
      `${character.id} tem raridade acessível por invocação`,
    );
  }
});

test('cada perseguição nova aparece numa cadeia simulada ao receber um de seus gatilhos', () => {
  for (const character of characters) {
    const team = [
      { id: 'hero', character: HERO_TEMPLATES.ninjutsu, position: 4, level: 1 },
      { id: character.id, character, position: 2, level: 1 },
    ];
    const combo = simulateCombo(team, 'hero', {
      name: 'Técnica de teste',
      hits: 1,
      effect: { type: character.pursuit.triggers[0] },
    });
    assert.ok(combo.sequence.some((step) => step.id === character.id), `${character.id} precisa aparecer na sequência`);
    assert.ok(combo.totalHits > combo.starterHits);
  }
});
