import test from 'node:test';
import assert from 'node:assert/strict';
import { applyFormationBonus, emptyFormationBonus, formationBonuses, formationColumn, formationLane, roleFor } from '../src/core/formation.js';

const member = (role, position, rarity = 'raro', level = 1) => ({ role, position, level, character: { rarity } });

test('formação vazia ou com coordenadas inválidas não concede bônus', () => {
  assert.deepEqual(formationBonuses([]), emptyFormationBonus());
  assert.deepEqual(formationBonuses([member('vanguard', null), member('vanguard', 9), member('vanguard', -1)]), emptyFormationBonus());
});

test('colunas da grade são retaguarda, meio e frente', () => {
  assert.equal(formationColumn(0), 0);
  assert.equal(formationColumn(4), 1);
  assert.equal(formationColumn(8), 2);
  assert.equal(formationLane(0), 'Retaguarda');
  assert.equal(formationLane(4), 'Meio');
  assert.equal(formationLane(8), 'Frente');
});

test('vanguarda fortalece vida e protege quando posicionada na frente', () => {
  const front = formationBonuses([member('vanguard', 5, 'epico')]);
  const rear = formationBonuses([member('vanguard', 3, 'epico')]);
  assert.ok(Math.abs(front.damageReduction - 0.036) < 1e-9);
  assert.equal(rear.damageReduction, 0);
  assert.ok(front.hpPct > 0);
});

test('atacante recebe bônus de ataque básico maior na retaguarda', () => {
  const front = formationBonuses([member('striker', 2, 'raro')]);
  const rear = formationBonuses([member('striker', 0, 'raro')]);
  assert.ok(rear.basicDamagePct > front.basicDamagePct);
});

test('suporte expande chakra e melhora Guardar, com bônus maior na retaguarda', () => {
  const front = formationBonuses([member('support', 5, 'lendario')]);
  const rear = formationBonuses([member('support', 3, 'lendario')]);
  assert.ok(front.chakraPct > 0);
  assert.ok(rear.guardChakra > front.guardChakra);
});

test('controle amplia técnicas e ajuda a defender a linha de frente', () => {
  const front = formationBonuses([member('control', 2, 'raro')]);
  const middle = formationBonuses([member('control', 1, 'raro')]);
  assert.ok(front.techniqueDamagePct > 0);
  assert.ok(front.damageReduction > middle.damageReduction);
});

test('limites impedem bônus excessivos com cinco integrantes lendários', () => {
  const slots = [2, 5, 8, 1, 4];
  const full = formationBonuses(slots.map((position) => member('vanguard', position, 'lendario', 50)));
  assert.ok(full.hpPct <= 0.15);
  assert.ok(full.damageReduction <= 0.25);
});

test('papéis do protagonista variam pelo estilo e o elenco tem função definida', () => {
  assert.equal(roleFor({ id: 'hero', style: 'taijutsu' }), 'vanguard');
  assert.equal(roleFor({ id: 'hero', style: 'ninjutsu' }), 'striker');
  assert.equal(roleFor({ id: 'hero', style: 'genjutsu' }), 'control');
  assert.equal(roleFor({ id: 'sakura' }), 'support');
});

test('bônus ajusta HP/chakra no snapshot sem alterar os dados-base', () => {
  const unit = { maxHp: 1000, hp: 900, maxChakra: 100, chakra: 35 };
  const bonus = formationBonuses([member('vanguard', 0), member('support', 2)]);
  const enhanced = applyFormationBonus(unit, bonus);
  assert.ok(enhanced.maxHp > unit.maxHp);
  assert.ok(enhanced.maxChakra > unit.maxChakra);
  assert.equal(unit.maxHp, 1000);
  assert.equal(enhanced.hp, enhanced.maxHp);
});
