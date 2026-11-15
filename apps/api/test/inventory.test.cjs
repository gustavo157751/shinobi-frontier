const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');

const { InventoryService } = require('../dist/inventory/inventory.service');
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

function itemRow(itemCode, quantity) {
  return { id: `item-${itemCode}`, characterId: 'character-1', itemCode, quantity };
}

let state;
let prisma;
let service;

beforeEach(() => {
  state = {
    character: {
      id: 'character-1',
      userId: 'user-1',
      energy: 50,
      energyUpdatedAt: new Date(),
    },
    items: new Map(),
  };

  prisma = {
    $transaction: async (callback) => callback(prisma),
    character: {
      findFirst: async () => state.character,
      update: async ({ data }) => {
        state.character = { ...state.character, ...data };
        return state.character;
      },
    },
    characterItem: {
      findMany: async () => [...state.items.values()],
      findUnique: async ({ where }) =>
        state.items.get(where.characterId_itemCode.itemCode)
          ? { ...state.items.get(where.characterId_itemCode.itemCode) }
          : null,
      delete: async ({ where }) => {
        for (const [code, row] of state.items) {
          if (row.id === where.id) state.items.delete(code);
        }
      },
      update: async ({ where, data }) => {
        const row = [...state.items.values()].find((entry) => entry.id === where.id);
        row.quantity -= data.quantity.decrement;
        // O Prisma real devolve uma linha nova; a cópia evita que o chamador
        // veja a quantidade já decrementada ao calcular o restante.
        return { ...row };
      },
    },
  };

  service = new InventoryService(prisma);
});

test('overview lists owned items in catalogue order and hides empties', async () => {
  state.items.set('RIVER_PEARL', itemRow('RIVER_PEARL', 2));
  state.items.set('HERBAL_TONIC', itemRow('HERBAL_TONIC', 1));
  state.items.set('VEIL_SHARD', itemRow('VEIL_SHARD', 0));
  state.items.set('UNKNOWN_ITEM', itemRow('UNKNOWN_ITEM', 3));

  const overview = await service.overview('user-1');
  assert.equal(overview.energy, 50);
  assert.equal(overview.maxEnergy, MAX_ENERGY);
  assert.deepEqual(overview.items.map((item) => item.code), ['HERBAL_TONIC', 'RIVER_PEARL']);
  assert.equal(overview.items[0].quantity, 1);
  assert.equal(overview.items[0].usable, true);
  assert.equal(overview.items[1].usable, false);
  assert.equal(overview.items[1].kind, 'MATERIAL');
});

test('overview applies pending energy regeneration lazily', async () => {
  state.character.energy = 40;
  state.character.energyUpdatedAt = new Date(Date.now() - 5 * 60_000);

  const overview = await service.overview('user-1');
  assert.equal(overview.energy, 45);
  assert.equal(state.character.energy, 45, 'a leitura persiste a regeneração');
});

test('using a tonic restores energy, caps at the maximum and consumes the item', async () => {
  state.character.energy = 90;
  state.items.set('HERBAL_TONIC', itemRow('HERBAL_TONIC', 1));

  const result = await service.use('user-1', 'HERBAL_TONIC');
  assert.equal(result.restored, 10);
  assert.equal(result.character.energy, MAX_ENERGY);
  assert.equal(result.item.name, 'Tônico de Ervas');
  assert.equal(result.item.remaining, 0);
  assert.equal(state.items.has('HERBAL_TONIC'), false);
  assert.ok(result.character.energyUpdatedAt instanceof Date);
});

test('using one of several items only decrements the quantity', async () => {
  state.character.energy = 10;
  state.items.set('EMBER_RATION', itemRow('EMBER_RATION', 2));

  const result = await service.use('user-1', 'EMBER_RATION');
  assert.equal(result.restored, 35);
  assert.equal(result.character.energy, 45);
  assert.equal(result.item.remaining, 1);
  assert.equal(state.items.get('EMBER_RATION').quantity, 1);
});

test('items that cannot be used are refused with a clear error', async () => {
  state.items.set('VEIL_SHARD', itemRow('VEIL_SHARD', 1));
  await expectStatus(service.use('user-1', 'VEIL_SHARD'), 400);
  assert.equal(state.items.get('VEIL_SHARD').quantity, 1, 'material não some ao ser recusado');

  await expectStatus(service.use('user-1', 'NAO_EXISTE'), 400);
  await expectStatus(service.use('user-1', 'ASH_SIGIL'), 400);
});

test('a tonic cannot be used with full energy or without owning it', async () => {
  state.character.energy = MAX_ENERGY;
  state.items.set('HERBAL_TONIC', itemRow('HERBAL_TONIC', 1));
  await expectStatus(service.use('user-1', 'HERBAL_TONIC'), 400);
  assert.equal(state.items.get('HERBAL_TONIC').quantity, 1);

  state.character.energy = 10;
  state.items.clear();
  await expectStatus(service.use('user-1', 'HERBAL_TONIC'), 400);
});

test('the catalogue keeps original codes and consumables declare their effect', () => {
  const codes = ITEM_CATALOGUE.map((item) => item.code);
  assert.equal(new Set(codes).size, codes.length);
  assert.equal(findItem('HERBAL_TONIC').effect.energy, 20);
  assert.equal(findItem('EMBER_RATION').effect.energy, 35);
});
