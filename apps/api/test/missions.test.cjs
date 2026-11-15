const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');

const { MISSION_CATALOGUE, findMission } = require('../dist/missions/mission-catalogue');
const {
  completeMission,
  describeRewards,
  failMission,
} = require('../dist/missions/mission-rewards');
const { MissionsService } = require('../dist/missions/missions.service');
const { ITEM_CATALOGUE, findItem } = require('../dist/inventory/item-catalogue');
const { MAX_ENERGY } = require('../dist/character/energy');

function expectStatus(promise, status) {
  return assert.rejects(promise, (error) => {
    assert.equal(
      error.getStatus?.(),
      status,
      `esperava HTTP ${status}, veio ${error.getStatus?.()} (${error.message})`,
    );
    return true;
  });
}

/** Prisma mínimo em memória: cobre exatamente o que missões e recompensas usam. */
function createStore(overrides = {}) {
  const state = {
    character: {
      id: 'character-1',
      userId: 'user-1',
      level: 1,
      experience: 0,
      strength: 10,
      vitality: 10,
      agility: 10,
      intelligence: 10,
      energy: MAX_ENERGY,
      energyUpdatedAt: new Date(),
      gold: 0,
      ...overrides.character,
    },
    missions: overrides.missions ?? new Map(),
    items: overrides.items ?? new Map(),
    battles: overrides.battles ?? [],
  };

  const prisma = {
    $transaction: async (callback) => callback(prisma),
    character: {
      findFirst: async () => state.character,
      update: async ({ data }) => {
        const next = { ...state.character };
        for (const [key, value] of Object.entries(data)) {
          if (value && typeof value === 'object' && 'increment' in value) next[key] += value.increment;
          else if (value && typeof value === 'object' && 'decrement' in value) next[key] -= value.decrement;
          else next[key] = value;
        }
        state.character = next;
        return next;
      },
    },
    characterMission: {
      findUnique: async ({ where }) =>
        state.missions.get(where.characterId_missionCode.missionCode) ?? null,
      findMany: async () => [...state.missions.values()],
      upsert: async ({ where, update, create }) => {
        const code = where.characterId_missionCode.missionCode;
        const existing = state.missions.get(code);
        const next = existing
          ? Object.assign(existing, update)
          : { id: `mission-${code}`, ...create };
        state.missions.set(code, next);
        return next;
      },
      update: async ({ where, data }) => {
        const record = [...state.missions.values()].find((row) => row.id === where.id);
        Object.assign(record, data);
        return record;
      },
    },
    characterItem: {
      findMany: async () => [...state.items.values()],
      findUnique: async ({ where }) =>
        state.items.get(where.characterId_itemCode.itemCode) ?? null,
      upsert: async ({ where, update, create }) => {
        const code = where.characterId_itemCode.itemCode;
        const existing = state.items.get(code);
        if (existing) {
          existing.quantity += update.quantity.increment;
          return existing;
        }
        const next = { id: `item-${code}`, ...create };
        state.items.set(code, next);
        return next;
      },
      delete: async ({ where }) => {
        for (const [code, row] of state.items) {
          if (row.id === where.id) state.items.delete(code);
        }
      },
      update: async ({ where, data }) => {
        const row = [...state.items.values()].find((entry) => entry.id === where.id);
        row.quantity -= data.quantity.decrement;
        return row;
      },
    },
    combatBattle: {
      findFirst: async ({ where }) =>
        state.battles.filter((battle) => battle.status === where.status).at(-1) ?? null,
      create: async ({ data }) => {
        const battle = {
          id: `battle-${state.battles.length + 1}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        state.battles.push(battle);
        return battle;
      },
    },
    characterNinja: { findMany: async () => [] },
  };

  return { state, prisma };
}

let state;
let prisma;
let service;

beforeEach(() => {
  ({ state, prisma } = createStore());
  service = new MissionsService(prisma);
});

test('mission catalogue is original, ordered by level and rewards real items', () => {
  assert.ok(MISSION_CATALOGUE.length >= 6, 'a trilha precisa de missões suficientes');

  const codes = new Set();
  const names = new Set();
  let previousLevel = 0;
  for (const mission of MISSION_CATALOGUE) {
    assert.match(mission.code, /^[A-Z][A-Z_]{2,39}$/, `código inválido: ${mission.code}`);
    assert.ok(!codes.has(mission.code), `código duplicado: ${mission.code}`);
    assert.ok(!names.has(mission.name), `nome duplicado: ${mission.name}`);
    codes.add(mission.code);
    names.add(mission.name);

    assert.ok(mission.description.length > 20, 'toda missão precisa de descrição própria');
    assert.ok(mission.requiredLevel >= previousLevel, 'a trilha deve abrir em ordem de nível');
    previousLevel = mission.requiredLevel;
    assert.ok(mission.energyCost > 0);
    assert.ok(mission.enemy.maxHp > 0 && mission.enemy.attack > 0);
    assert.equal(mission.enemy.level, mission.requiredLevel);
    assert.ok(mission.rewards.experience > 0 && mission.rewards.gold > 0);
    assert.ok(mission.rewards.items.length > 0, 'toda missão entrega ao menos um item');

    for (const reward of mission.rewards.items) {
      assert.ok(findItem(reward.code), `item de recompensa fora do catálogo: ${reward.code}`);
      assert.ok(reward.quantity >= 1);
    }
  }

  assert.equal(MISSION_CATALOGUE[0].requiredLevel, 1, 'a primeira missão precisa estar aberta');
  assert.equal(findMission('NAO_EXISTE'), undefined);
});

test('every item in the catalogue has a valid kind and unique code', () => {
  const codes = new Set(ITEM_CATALOGUE.map((item) => item.code));
  assert.equal(codes.size, ITEM_CATALOGUE.length);
  for (const item of ITEM_CATALOGUE) {
    assert.ok(['CONSUMABLE', 'MATERIAL'].includes(item.kind));
    assert.ok(item.description.length > 20);
    if (item.kind === 'CONSUMABLE') assert.ok(item.effect?.energy > 0);
    else assert.equal(item.effect, undefined);
  }
});

test('overview shows available, locked and affordable states from the server', async () => {
  state.character.level = 1;
  state.character.energy = 10;

  const overview = await service.overview('user-1');
  const first = overview.missions.find((mission) => mission.code === 'TRAIL_OF_ASHES');
  const second = overview.missions.find((mission) => mission.code === 'WHISPERING_REEDS');

  assert.equal(overview.level, 1);
  assert.equal(overview.energy, 10);
  assert.equal(first.status, 'AVAILABLE');
  assert.equal(first.locked, false);
  assert.equal(first.affordable, false, '12 de energia contra 10 disponíveis');
  assert.equal(second.status, 'AVAILABLE');
  assert.equal(second.locked, true);
  assert.equal(second.rewards.items[0].name, findItem('EMBER_RATION').name);
});

test('a mission only reads as ACTIVE when its battle is the active one', async () => {
  state.missions.set('TRAIL_OF_ASHES', { id: 'm1', characterId: 'character-1', missionCode: 'TRAIL_OF_ASHES', status: 'ACTIVE' });
  state.missions.set('WHISPERING_REEDS', { id: 'm2', characterId: 'character-1', missionCode: 'WHISPERING_REEDS', status: 'ACTIVE' });
  state.battles.push({
    id: 'battle-1',
    status: 'ACTIVE',
    state: { mission: { code: 'TRAIL_OF_ASHES', name: 'Rastro de Cinzas' } },
  });

  const overview = await service.overview('user-1');
  assert.equal(overview.activeMission, 'TRAIL_OF_ASHES');
  assert.equal(overview.missions.find((m) => m.code === 'TRAIL_OF_ASHES').status, 'ACTIVE');
  assert.equal(
    overview.missions.find((m) => m.code === 'WHISPERING_REEDS').status,
    'AVAILABLE',
    'registro órfão sem batalha ativa volta a ficar disponível',
  );
});

test('accepting a mission spends energy and opens a battle with the mission frozen', async () => {
  const result = await service.accept('user-1', 'TRAIL_OF_ASHES');

  assert.equal(result.mission.code, 'TRAIL_OF_ASHES');
  assert.equal(result.mission.energyCost, 12);
  assert.equal(result.character.energy, MAX_ENERGY - 12);
  assert.equal(state.missions.get('TRAIL_OF_ASHES').status, 'ACTIVE');
  assert.equal(state.battles.length, 1);
  assert.equal(state.battles[0].status, 'ACTIVE');
  assert.deepEqual(state.battles[0].state.mission, { code: 'TRAIL_OF_ASHES', name: 'Rastro de Cinzas' });
  assert.equal(state.battles[0].state.enemy.code, 'ASH_HOUND');
  assert.ok(state.battles[0].state.logs.some((entry) => entry.text.includes('Cão de Cinzas')));
});

test('accepting is rejected for unknown, active, completed, locked and unaffordable missions', async () => {
  await expectStatus(service.accept('user-1', 'NAO_EXISTE'), 400);

  state.battles.push({ id: 'battle-1', status: 'ACTIVE', state: {} });
  await expectStatus(service.accept('user-1', 'TRAIL_OF_ASHES'), 409);
  state.battles.length = 0;

  state.missions.set('TRAIL_OF_ASHES', { id: 'm1', characterId: 'character-1', missionCode: 'TRAIL_OF_ASHES', status: 'COMPLETED' });
  await expectStatus(service.accept('user-1', 'TRAIL_OF_ASHES'), 409);
  state.missions.clear();

  await expectStatus(service.accept('user-1', 'WHISPERING_REEDS'), 400);

  state.character.energy = 5;
  await expectStatus(service.accept('user-1', 'TRAIL_OF_ASHES'), 400);
  assert.equal(state.battles.length, 0, 'nenhuma batalha pode nascer de um aceite inválido');
});

test('completing a mission credits the reward exactly once', async () => {
  state.missions.set('TRAIL_OF_ASHES', { id: 'm1', characterId: 'character-1', missionCode: 'TRAIL_OF_ASHES', status: 'ACTIVE' });
  const mission = findMission('TRAIL_OF_ASHES');

  const completed = await completeMission(prisma, state.character, 'TRAIL_OF_ASHES');
  assert.ok(completed);
  assert.equal(completed.rewards.experience, mission.rewards.experience);
  assert.equal(completed.rewards.gold, mission.rewards.gold);
  assert.equal(completed.rewards.items[0].code, 'HERBAL_TONIC');
  assert.equal(state.character.experience, mission.rewards.experience);
  assert.equal(state.character.gold, mission.rewards.gold);
  assert.equal(state.missions.get('TRAIL_OF_ASHES').status, 'COMPLETED');
  assert.equal(state.missions.get('TRAIL_OF_ASHES').progress, 100);
  assert.equal(state.items.get('HERBAL_TONIC').quantity, 1);

  const repeated = await completeMission(prisma, state.character, 'TRAIL_OF_ASHES');
  assert.equal(repeated, null, 'vitória repetida não pode pagar de novo');
  assert.equal(state.character.gold, mission.rewards.gold);
  assert.equal(state.character.experience, mission.rewards.experience);
  assert.equal(state.items.get('HERBAL_TONIC').quantity, 1);
});

test('completing without an active record does nothing', async () => {
  assert.equal(await completeMission(prisma, state.character, 'TRAIL_OF_ASHES'), null);
  assert.equal(state.character.gold, 0);
  assert.equal(state.items.size, 0);
});

test('a defeat returns the mission to the board without paying', async () => {
  state.missions.set('TRAIL_OF_ASHES', { id: 'm1', characterId: 'character-1', missionCode: 'TRAIL_OF_ASHES', status: 'ACTIVE', progress: 40 });
  assert.equal(await failMission(prisma, 'character-1', 'TRAIL_OF_ASHES'), true);
  assert.equal(state.missions.get('TRAIL_OF_ASHES').status, 'AVAILABLE');
  assert.equal(state.missions.get('TRAIL_OF_ASHES').progress, 0);
  assert.equal(state.character.gold, 0);

  assert.equal(await failMission(prisma, 'character-1', 'TRAIL_OF_ASHES'), false);
  assert.equal(await failMission(prisma, 'character-1', 'NAO_EXISTE'), false);
});

test('describeRewards names the mission, experience, ryō and items', () => {
  const mission = findMission('TRAIL_OF_ASHES');
  const text = describeRewards({
    mission,
    character: state.character,
    rewards: {
      experience: mission.rewards.experience,
      gold: mission.rewards.gold,
      items: [{ code: 'HERBAL_TONIC', name: 'Tônico de Ervas', quantity: 1 }],
    },
  });
  assert.ok(text.includes(mission.name));
  assert.ok(text.includes(String(mission.rewards.experience)));
  assert.ok(text.includes(String(mission.rewards.gold)));
  assert.ok(text.includes('Tônico de Ervas x1'));
});
