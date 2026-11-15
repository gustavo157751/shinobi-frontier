import test from 'node:test';
import assert from 'node:assert/strict';
import { applyFormationBonus, emptyFormationBonus, formationBonuses, roleFor } from '../src/core/formation.js';

const member = (role, position, rarity = 'raro', level = 1) => ({ role, position, level, character: { rarity } });

test('formação vazia ou sem posições válidas não concede bônus', () => {
  assert.deepEqual(formationBonuses([]), emptyFormationBonus());
  assert.deepEqual(formationBonuses([member('vanguard', null), member('vanguard', 5)]), emptyFormationBonus());
});

test('vanguarda protege a frente e aumenta a vida do esquadrão', () => {
  const front = formationBonuses([member('vanguard', 0, 'epico')]);
  const back = formationBonuses([member('vanguard', 3, 'epico')]);
  assert.ok(Math.abs(front.damageReduction - 0.036) < 1e-9);
  assert.equal(back.damageReduction, 0);
  assert.ok(front.hpPct > 0);
});

test('atacantes causam mais dano básico na retaguarda', () => {
  const front = formationBonuses([member('striker', 1, 'raro')]);
  const back = formationBonuses([member('striker', 2, 'raro')]);
  assert.ok(back.basicDamagePct > front.basicDamagePct);
});

test('suporte expande chakra e melhora Guardar, com bônus maior na retaguarda', () => {
  const front = formationBonuses([member('support', 0, 'lendario')]);
  const back = formationBonuses([member('support', 4, 'lendario')]);
  assert.ok(front.chakraPct > 0);
  assert.ok(back.guardChakra > front.guardChakra);
});

test('controle amplia técnicas e ajuda a defender a linha de frente', () => {
  const front = formationBonuses([member('control', 1, 'raro')]);
  const back = formationBonuses([member('control', 3, 'raro')]);
  assert.ok(front.techniqueDamagePct > 0);
  assert.ok(front.damageReduction > back.damageReduction);
});

test('limites impedem bônus excessivos com cinco integrantes da mesma função', () => {
  const full = formationBonuses(Array.from({ length: 5 }, (_, position) => member('vanguard', position, 'lendario', 50)));
  assert.ok(full.hpPct <= 0.15);
  assert.ok(full.damageReduction <= 0.25);
});

test('papéis do protagonista variam pelo estilo e o elenco tem função definida', () => {
  assert.equal(roleFor({ id: 'hero', style: 'taijutsu' }), 'vanguard');
  assert.equal(roleFor({ id: 'hero', style: 'ninjutsu' }), 'striker');
  assert.equal(roleFor({ id: 'hero', style: 'genjutsu' }), 'control');
  assert.equal(roleFor({ id: 'sakura' }), 'support');
});

test('bônus ajusta HP/chakra no snapshot sem alterar o objeto original', () => {
  const unit = { maxHp: 1000, hp: 900, maxChakra: 100, chakra: 35 };
  const bonus = formationBonuses([member('vanguard', 0), member('support', 2)]);
  const enhanced = applyFormationBonus(unit, bonus);
  assert.ok(enhanced.maxHp > unit.maxHp);
  assert.ok(enhanced.maxChakra > unit.maxChakra);
  assert.equal(unit.maxHp, 1000);
  assert.equal(enhanced.hp, enhanced.maxHp);
});
