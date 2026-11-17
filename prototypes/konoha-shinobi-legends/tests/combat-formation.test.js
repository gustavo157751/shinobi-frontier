import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle } from '../src/core/combat.js';

const tuning = { globalMultiplier: 1, critMultiplier: 1, defenseConstant: 450, variance: 0, comboBonusPerHit: 0 };
const hooks = {
  log() {},
  render() {},
  async hit() {},
  async actionFlash() {},
};

function makeUnit(side, overrides = {}) {
  return {
    uid: `${side}-unit`,
    name: side,
    side,
    charId: `${side}-test`,
    atk: 100,
    defense: 0,
    maxHp: 1000,
    hp: 1000,
    chakra: 10,
    maxChakra: 100,
    crit: 0,
    statuses: [],
    alive: true,
    guard: false,
    teamBonus: {},
    ...overrides,
  };
}

function createBattle(ally, enemy) {
  return new Battle({ allies: [ally], enemies: [enemy], hooks, tuning });
}

test('ataque básico e perseguição usam o bônus de ataques; jutsu usa o bônus de técnicas', async () => {
  const ally = makeUnit('ally', { teamBonus: { basicDamagePct: 0.1, techniqueDamagePct: 0.2 } });
  const basicTarget = makeUnit('enemy');
  const battle = createBattle(ally, basicTarget);
  assert.equal((await battle.damageUnit(ally, basicTarget, 1, { kind: 'basic' })).damage, 110);

  const jutsuTarget = makeUnit('enemy', { uid: 'enemy-jutsu' });
  assert.equal((await battle.damageUnit(ally, jutsuTarget, 1, { kind: 'jutsu' })).damage, 120);

  const comboTarget = makeUnit('enemy', { uid: 'enemy-combo' });
  assert.equal((await battle.damageUnit(ally, comboTarget, 1, { kind: 'combo' })).damage, 110);
});

test('redução defensiva protege de ataques e dano fixo; Guardar acumula, recuo próprio não', async () => {
  const enemy = makeUnit('enemy');
  const ally = makeUnit('ally', { teamBonus: { damageReduction: 0.2 } });
  const battle = createBattle(ally, enemy);

  const attackTarget = makeUnit('ally', { uid: 'ally-attack', teamBonus: ally.teamBonus });
  assert.equal((await battle.damageUnit(enemy, attackTarget, 1, { kind: 'basic' })).damage, 80);

  const dotTarget = makeUnit('ally', { uid: 'ally-dot', teamBonus: ally.teamBonus });
  assert.equal((await battle.damageUnit(null, dotTarget, 100, { kind: 'dot', flat: true })).damage, 80);

  const guardingTarget = makeUnit('ally', { uid: 'ally-guard', teamBonus: ally.teamBonus, guard: true });
  assert.equal((await battle.damageUnit(enemy, guardingTarget, 1, { kind: 'basic' })).damage, 40);

  const recoilTarget = makeUnit('ally', { uid: 'ally-recoil', teamBonus: ally.teamBonus });
  assert.equal((await battle.damageUnit(null, recoilTarget, 100, { kind: 'recoil', flat: true })).damage, 100);
});

test('sinergia de suporte adiciona chakra ao Guardar sem exceder o máximo', async () => {
  const ally = makeUnit('ally', { chakra: 10, teamBonus: { guardChakra: 6 } });
  const battle = createBattle(ally, makeUnit('enemy'));
  await battle.takeTurn(ally, { type: 'guard' });
  assert.equal(ally.chakra, 44);

  ally.chakra = 90;
  await battle.takeTurn(ally, { type: 'guard' });
  assert.equal(ally.chakra, ally.maxChakra);
});

test('ataque padrão e IA priorizam a linha frontal, mas seleção manual alcança a retaguarda', () => {
  const ally = makeUnit('ally', { uid: 'ally-attacker', slot: 4 });
  const rearEnemy = makeUnit('enemy', { uid: 'enemy-rear', slot: 0, hp: 100 });
  const frontEnemy = makeUnit('enemy', { uid: 'enemy-front', slot: 2, hp: 900 });
  const battle = new Battle({ allies: [ally], enemies: [rearEnemy, frontEnemy], hooks, tuning });

  assert.equal(battle.defaultTargetUid(ally), 'enemy-front');
  assert.equal(battle.resolveTarget(ally, 'enemy-rear'), rearEnemy);

  const enemyAi = makeUnit('enemy', { uid: 'enemy-ai', slot: 4, chakra: 0, def: { jutsu: [] } });
  const rearAlly = makeUnit('ally', { uid: 'ally-rear', slot: 0, hp: 100 });
  const frontAlly = makeUnit('ally', { uid: 'ally-front', slot: 2, hp: 900 });
  const aiBattle = new Battle({ allies: [rearAlly, frontAlly], enemies: [enemyAi], hooks, tuning });
  assert.equal(aiBattle.chooseAiAction(enemyAi).targetUid, 'ally-front');
});
