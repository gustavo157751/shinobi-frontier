const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  formationBonuses,
  isFrontLine,
  memberPower,
  EMPTY_FORMATION,
} = require('../dist/roster/formation');
const {
  MAX_FORMATION_SIZE,
  NINJA_CATALOGUE,
  findNinja,
} = require('../dist/roster/ninja-catalogue');

const member = (overrides) => ({
  code: 'TEST',
  role: 'STRIKER',
  rarity: 3,
  level: 1,
  stars: 1,
  position: null,
  ...overrides,
});

test('catalogue is original content with unique codes and sane costs', () => {
  assert.ok(NINJA_CATALOGUE.length >= 8, 'catálogo precisa de ninjas suficientes para formar equipes');

  const codes = new Set();
  const names = new Set();
  for (const ninja of NINJA_CATALOGUE) {
    assert.match(ninja.code, /^[A-Z][A-Z_]+$/, `código inválido: ${ninja.code}`);
    assert.ok(!codes.has(ninja.code), `código duplicado: ${ninja.code}`);
    assert.ok(!names.has(ninja.name), `nome duplicado: ${ninja.name}`);
    codes.add(ninja.code);
    names.add(ninja.name);

    assert.ok(['VANGUARD', 'STRIKER', 'SUPPORT', 'CONTROL'].includes(ninja.role));
    assert.ok(ninja.rarity >= 3 && ninja.rarity <= 5, 'raridade fora da faixa 3-5');
    assert.ok(ninja.recruitCost > 0);
    assert.ok(ninja.requiredLevel >= 1);
    assert.ok(ninja.description.length > 20, 'todo ninja precisa de descrição própria');
  }

  assert.equal(findNinja(NINJA_CATALOGUE[0].code)?.code, NINJA_CATALOGUE[0].code);
  assert.equal(findNinja('NAO_EXISTE'), undefined);
});

test('empty or unplaced formation gives no bonus', () => {
  assert.deepEqual(formationBonuses([]), EMPTY_FORMATION);
  const bench = formationBonuses([
    member({ code: 'A', role: 'VANGUARD', position: null }),
    member({ code: 'B', role: 'STRIKER', position: null }),
  ]);
  assert.deepEqual(bench, EMPTY_FORMATION);
});

test('positions outside 1..4 are ignored', () => {
  const bonus = formationBonuses([
    member({ code: 'A', role: 'VANGUARD', position: 0 }),
    member({ code: 'B', role: 'VANGUARD', position: 5 }),
    member({ code: 'C', role: 'VANGUARD', position: 2.5 }),
  ]);
  assert.deepEqual(bonus, EMPTY_FORMATION);
});

test('front line is positions 1 and 2', () => {
  assert.equal(isFrontLine(1), true);
  assert.equal(isFrontLine(2), true);
  assert.equal(isFrontLine(3), false);
  assert.equal(isFrontLine(4), false);
  assert.equal(isFrontLine(null), false);
});

test('vanguard in front adds health and damage reduction', () => {
  const bonus = formationBonuses([member({ role: 'VANGUARD', rarity: 3, level: 1, position: 1 })]);
  assert.equal(bonus.maxHp, 24 * 3 + 4);
  assert.equal(bonus.damageReduction, 0.09);
  assert.ok(bonus.power > 0);
});

test('damage reduction is capped so a full team cannot become immune', () => {
  const bonus = formationBonuses([
    member({ code: 'A', role: 'VANGUARD', rarity: 5, position: 1 }),
    member({ code: 'B', role: 'VANGUARD', rarity: 5, position: 2 }),
    member({ code: 'C', role: 'CONTROL', rarity: 5, position: 3 }),
    member({ code: 'D', role: 'CONTROL', rarity: 5, position: 4 }),
  ]);
  assert.ok(bonus.damageReduction > 0.25, 'formação defensiva precisa reduzir dano');
  assert.ok(bonus.damageReduction <= 0.4, `redução excessiva: ${bonus.damageReduction}`);
});

test('strikers deal more damage from the back line', () => {
  const front = formationBonuses([member({ role: 'STRIKER', rarity: 4, level: 3, position: 1 })]);
  const back = formationBonuses([member({ role: 'STRIKER', rarity: 4, level: 3, position: 3 })]);
  assert.ok(back.damageBonus > front.damageBonus);
  assert.equal(front.damageBonus, 2 * 4 + 3);
  assert.equal(back.damageBonus, 2 * 4 + 3 + 2 * 4);
});

test('support restores more chakra from the back line', () => {
  const front = formationBonuses([member({ role: 'SUPPORT', rarity: 3, position: 1 })]);
  const back = formationBonuses([member({ role: 'SUPPORT', rarity: 3, position: 3 })]);
  assert.equal(front.maxChakra, 5 * 3);
  assert.equal(back.maxChakra, 5 * 3);
  assert.ok(back.guardChakra > front.guardChakra);
  assert.equal(front.guardChakra, 3 + 2 * 3);
  assert.equal(back.guardChakra, 3 + 2 * 3 + 3);
});

test('control adds technique damage and slight front-line resistance', () => {
  const back = formationBonuses([member({ role: 'CONTROL', rarity: 4, level: 2, position: 3 })]);
  assert.equal(back.techniqueBonus, 3 * 4 + 2);
  assert.equal(back.damageReduction, 0);

  const front = formationBonuses([member({ role: 'CONTROL', rarity: 4, level: 2, position: 1 })]);
  assert.ok(front.damageReduction > 0);
});

test('power grows with rarity, level and stars', () => {
  assert.equal(memberPower({ rarity: 3, level: 1, stars: 1 }), 66);
  assert.ok(memberPower({ rarity: 5, level: 1, stars: 1 }) > memberPower({ rarity: 3, level: 1, stars: 1 }));
  assert.ok(memberPower({ rarity: 3, level: 2, stars: 1 }) > memberPower({ rarity: 3, level: 1, stars: 1 }));
  assert.ok(memberPower({ rarity: 3, level: 1, stars: 2 }) > memberPower({ rarity: 3, level: 1, stars: 1 }));
});

test('a full formation sums the power of every placed ninja', () => {
  const team = [
    member({ code: 'A', role: 'VANGUARD', rarity: 3, position: 1 }),
    member({ code: 'B', role: 'STRIKER', rarity: 4, position: 2 }),
    member({ code: 'C', role: 'SUPPORT', rarity: 5, position: 3 }),
    member({ code: 'D', role: 'CONTROL', rarity: 3, position: 4 }),
  ];
  const bonus = formationBonuses(team);
  const expected = team.reduce((total, entry) => total + memberPower(entry), 0);
  assert.equal(bonus.power, expected);
  assert.equal(team.length, MAX_FORMATION_SIZE);
});
