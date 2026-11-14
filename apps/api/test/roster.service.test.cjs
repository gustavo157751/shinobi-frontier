const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');

const { RosterService } = require('../dist/roster/roster.service');
const { NINJA_CATALOGUE } = require('../dist/roster/ninja-catalogue');

const NINJAS = new Map(NINJA_CATALOGUE.map((ninja) => [ninja.code, { id: `ninja-${ninja.code}`, ...ninja }]));

function rosterRow(code, position = null) {
  const ninja = NINJAS.get(code);
  return {
    id: `roster-${code}`,
    characterId: 'character-1',
    ninjaId: ninja.id,
    level: 1,
    stars: 1,
    position,
    ninja: {
      code: ninja.code,
      name: ninja.name,
      role: ninja.role,
      rarity: ninja.rarity,
      description: ninja.description,
    },
  };
}

let state;
let prisma;
let service;

function expectStatus(promise, status) {
  return assert.rejects(promise, (error) => {
    assert.equal(error.getStatus?.(), status, `esperava HTTP ${status}, veio ${error.getStatus?.()} (${error.message})`);
    return true;
  });
}

beforeEach(() => {
  state = {
    character: { id: 'character-1', userId: 'user-1', level: 1, gold: 150, roster: [] },
    created: [],
  };

  prisma = {
    character: {
      findFirst: async () => state.character,
      update: async ({ data }) => {
        if (data.gold?.decrement) state.character.gold -= data.gold.decrement;
        return state.character;
      },
    },
    ninja: {
      findUnique: async ({ where }) => NINJAS.get(where.code) ?? null,
    },
    characterNinja: {
      findFirst: async ({ where }) =>
        state.character.roster.find((row) => row.ninjaId === where.ninjaId) ?? null,
      findMany: async () => state.character.roster,
      create: async ({ data }) => {
        const ninja = [...NINJAS.values()].find((entry) => entry.id === data.ninjaId);
        const row = rosterRow(ninja.code);
        state.character.roster.push(row);
        state.created.push(data);
        return row;
      },
      updateMany: async () => {
        for (const row of state.character.roster) row.position = null;
      },
      update: async ({ where, data }) => {
        const row = state.character.roster.find((entry) => entry.id === where.id);
        row.position = data.position;
        return row;
      },
    },
    $transaction: async (operation) => operation(prisma),
  };

  service = new RosterService(prisma);
});

test('recruit rejects an unknown ninja code', async () => {
  await expectStatus(service.recruit('user-1', 'NOT_A_NINJA'), 400);
});

test('recruit enforces the required level', async () => {
  const locked = NINJA_CATALOGUE.find((ninja) => ninja.requiredLevel > 1);
  await expectStatus(service.recruit('user-1', locked.code), 400);
  assert.equal(state.character.gold, 150);
});

test('recruit enforces the gold cost', async () => {
  state.character.gold = 0;
  const affordable = NINJA_CATALOGUE.find((ninja) => ninja.requiredLevel === 1);
  await expectStatus(service.recruit('user-1', affordable.code), 400);
  assert.equal(state.created.length, 0);
});

test('recruit charges gold and stores ownership once', async () => {
  const ninja = NINJA_CATALOGUE.find((entry) => entry.requiredLevel === 1);
  state.character.gold = ninja.recruitCost * 2 + 25;

  const result = await service.recruit('user-1', ninja.code);

  assert.equal(result.ninja.code, ninja.code);
  assert.equal(result.ninja.owned, true);
  assert.equal(result.ninja.position, null);
  assert.equal(state.character.gold, ninja.recruitCost + 25);
  assert.equal(state.created.length, 1);

  await expectStatus(service.recruit('user-1', ninja.code), 409);
  assert.equal(state.created.length, 1, 'duplicata não pode criar outra posse');
});

test('recruit fails cleanly when the catalogue row is missing from the database', async () => {
  state.character.gold = 100000;
  const original = prisma.ninja.findUnique;
  prisma.ninja.findUnique = async () => null;

  await expectStatus(service.recruit('user-1', NINJA_CATALOGUE[0].code), 400);

  prisma.ninja.findUnique = original;
  assert.equal(state.character.gold, 100000);
});

test('formation rejects duplicated positions', async () => {
  state.character.roster = [rosterRow('MIST_LANCER'), rosterRow('STONE_WARDEN')];
  await expectStatus(service.setFormation('user-1', [
    { ninjaCode: 'MIST_LANCER', position: 1 },
    { ninjaCode: 'STONE_WARDEN', position: 1 },
  ]), 400);
});

test('formation rejects the same ninja twice', async () => {
  state.character.roster = [rosterRow('MIST_LANCER')];
  await expectStatus(service.setFormation('user-1', [
    { ninjaCode: 'MIST_LANCER', position: 1 },
    { ninjaCode: 'MIST_LANCER', position: 2 },
  ]), 400);
});

test('formation rejects positions outside the board', async () => {
  state.character.roster = [rosterRow('MIST_LANCER')];
  await expectStatus(service.setFormation('user-1', [{ ninjaCode: 'MIST_LANCER', position: 5 }]), 400);
  await expectStatus(service.setFormation('user-1', [{ ninjaCode: 'MIST_LANCER', position: 0 }]), 400);
});

test('formation rejects ninjas the player does not own', async () => {
  state.character.roster = [];
  await expectStatus(service.setFormation('user-1', [{ ninjaCode: 'MIST_LANCER', position: 1 }]), 400);
});

test('formation replaces previous positions instead of accumulating', async () => {
  state.character.roster = [
    rosterRow('MIST_LANCER', 1),
    rosterRow('STONE_WARDEN', 2),
  ];

  const overview = await service.setFormation('user-1', [{ ninjaCode: 'STONE_WARDEN', position: 4 }]);

  const positions = Object.fromEntries(state.character.roster.map((row) => [row.ninja.code, row.position]));
  assert.equal(positions.MIST_LANCER, null, 'ninja removido volta para a reserva');
  assert.equal(positions.STONE_WARDEN, 4);

  assert.equal(overview.slots.length, 4);
  assert.equal(overview.slots[2].ninja, null);
  assert.equal(overview.slots[3].ninja.code, 'STONE_WARDEN');
  assert.equal(overview.slots[3].line, 'back');
});

test('battle bonus mirrors the formation for an ongoing fight', async () => {
  state.character.roster = [
    rosterRow('STONE_WARDEN', 1),
    rosterRow('MIST_LANCER', 3),
  ];

  const bonus = await service.battleBonus('character-1');

  assert.equal(bonus.maxHp, 24 * 3 + 4);
  assert.equal(bonus.damageBonus, 2 * 3 + 1 + 2 * 3);
  assert.ok(bonus.power > 0);
});

test('battle bonus is empty for a character with no placed ninjas', async () => {
  state.character.roster = [rosterRow('MIST_LANCER', null)];
  const bonus = await service.battleBonus('character-1');
  assert.equal(bonus.power, 0);
  assert.equal(bonus.maxHp, 0);
});

test('overview separates owned roster from the recruiting catalogue', async () => {
  state.character.roster = [rosterRow('STONE_WARDEN', 1)];
  state.character.gold = 500;
  state.character.level = 3;

  const overview = await service.overview('user-1');

  assert.equal(overview.roster.length, 1);
  assert.equal(overview.catalog.length, NINJA_CATALOGUE.length - 1);
  assert.ok(overview.catalog.every((ninja) => ninja.owned === false));
  assert.ok(overview.power > 0);
  assert.equal(overview.gold, 500);
});

test('overview refuses to build for an account without a character', async () => {
  state.character = null;
  await expectStatus(service.overview('user-1'), 404);
  await expectStatus(service.catalog('user-1'), 404);
});
