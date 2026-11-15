const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');

const { TALENT_CATALOGUE, findTalent, talentsForPath } = require('../dist/talents/talent-catalogue');
const { TalentsService } = require('../dist/talents/talents.service');

function expectStatus(promise, status) {
  return assert.rejects(promise, (error) => {
    assert.equal(error.getStatus?.(), status, `esperava HTTP ${status}, veio ${error.getStatus?.()} (${error.message})`);
    return true;
  });
}

const PATHS = ['SHADOW_BLADE', 'FLAME_EYE', 'WIND_DANCER', 'WATER_CLAW', 'STONE_FIST'];

let state;
let prisma;
let service;

beforeEach(() => {
  state = {
    character: {
      id: 'character-1',
      userId: 'user-1',
      level: 1,
      path: 'SHADOW_BLADE',
      strength: 10,
      vitality: 10,
      agility: 10,
      intelligence: 10,
    },
    talents: [],
  };

  prisma = {
    $transaction: async (callback) => callback(prisma),
    character: {
      findFirst: async () => state.character,
      update: async ({ data }) => {
        const next = { ...state.character };
        for (const [key, value] of Object.entries(data)) {
          if (value && typeof value === 'object' && 'increment' in value) next[key] += value.increment;
          else next[key] = value;
        }
        state.character = next;
        return next;
      },
    },
    characterTalent: {
      findMany: async ({ where }) => state.talents
        .filter((row) => row.characterId === where.characterId)
        .map((row) => ({ ...row })),
      create: async ({ data }) => {
        const row = { id: `talent-${data.talentCode}`, ...data, learnedAt: new Date() };
        state.talents.push(row);
        return { ...row };
      },
    },
  };

  service = new TalentsService(prisma);
});

test('talent catalogue is original, grouped by path and well formed', () => {
  assert.ok(TALENT_CATALOGUE.length >= 20);
  const codes = new Set();
  for (const talent of TALENT_CATALOGUE) {
    assert.match(talent.code, /^[A-Z][A-Z_0-9]{2,39}$/);
    assert.ok(!codes.has(talent.code));
    codes.add(talent.code);
    assert.ok(PATHS.includes(talent.path));
    assert.ok(talent.description.length > 10);
    assert.ok(talent.requiredLevel >= 3);
    assert.ok(talent.cost >= 1);
    for (const prerequisite of talent.prerequisites) {
      assert.ok(findTalent(prerequisite), `pré-requisito fora do catálogo: ${prerequisite}`);
    }
  }
  for (const path of PATHS) {
    assert.ok(talentsForPath(path).length >= 4, `caminho sem talentos suficientes: ${path}`);
  }
  assert.equal(findTalent('NAO_EXISTE'), undefined);
});

test('learning a talent spends a point and raises stats', async () => {
  state.character.level = 3;
  const result = await service.learn('user-1', 'SB_EDGE_1');
  assert.equal(result.talent.code, 'SB_EDGE_1');
  assert.equal(state.character.strength, 12);
  assert.equal(state.character.agility, 11);
  assert.equal(state.talents.length, 1);

  const overview = await service.overview('user-1');
  assert.equal(overview.earned, 2);
  assert.equal(overview.spent, 1);
  assert.equal(overview.available, 1);
  assert.ok(overview.learned.includes('SB_EDGE_1'));
});

test('learning is rejected for unknown, wrong path, low level, missing prerequisite, duplicate and insufficient points', async () => {
  await expectStatus(service.learn('user-1', 'NAO_EXISTE'), 400);

  state.character.path = 'FLAME_EYE';
  await expectStatus(service.learn('user-1', 'SB_EDGE_1'), 400);
  state.character.path = 'SHADOW_BLADE';

  state.character.level = 1;
  await expectStatus(service.learn('user-1', 'SB_EDGE_1'), 400);
  state.character.level = 3;

  await expectStatus(service.learn('user-1', 'SB_EDGE_2'), 400);

  await service.learn('user-1', 'SB_EDGE_1');
  await expectStatus(service.learn('user-1', 'SB_EDGE_1'), 400);

  state.character.level = 2;
  await expectStatus(service.learn('user-1', 'SB_EDGE_2'), 400);
});

test('capstones are mutually exclusive within the same group', async () => {
  state.character.level = 8;
  await service.learn('user-1', 'SB_EDGE_1');
  await service.learn('user-1', 'SB_EDGE_2');
  await service.learn('user-1', 'SB_CAPSTONE_A');
  await expectStatus(service.learn('user-1', 'SB_CAPSTONE_B'), 400);
});

test('overview reports path, points and per-talent availability', async () => {
  state.character.level = 5;
  const overview = await service.overview('user-1');
  assert.equal(overview.path, 'SHADOW_BLADE');
  assert.equal(overview.earned, 4);
  assert.equal(overview.available, 4);
  const tier2 = overview.talents.find((talent) => talent.code === 'SB_EDGE_2');
  assert.equal(tier2.locked, false);
  assert.equal(tier2.available, false, 'pré-requisito não atendido');
  const tier1 = overview.talents.find((talent) => talent.code === 'SB_EDGE_1');
  assert.equal(tier1.available, true);
});
