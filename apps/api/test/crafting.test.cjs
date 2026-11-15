const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');

const { RECIPE_CATALOGUE, findRecipe } = require('../dist/crafting/recipe-catalogue');
const { CraftingService } = require('../dist/crafting/crafting.service');
const { ITEM_CATALOGUE, findItem } = require('../dist/inventory/item-catalogue');
const { MAX_ENERGY } = require('../dist/character/energy');

function expectStatus(promise, status) {
  return assert.rejects(promise, (error) => {
    assert.equal(error.getStatus?.(), status, `esperava HTTP ${status}, veio ${error.getStatus?.()} (${error.message})`);
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
      level: 1,
      energy: 50,
      energyUpdatedAt: new Date(),
      gold: 100,
    },
    items: new Map(),
  };

  prisma = {
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
    characterItem: {
      findMany: async () => [...state.items.values()].map((row) => ({ ...row })),
      findUnique: async ({ where }) => {
        const row = state.items.get(where.characterId_itemCode.itemCode);
        return row ? { ...row } : null;
      },
      delete: async ({ where }) => {
        for (const [code, row] of state.items) {
          if (row.id === where.id) state.items.delete(code);
        }
      },
      update: async ({ where, data }) => {
        const row = [...state.items.values()].find((entry) => entry.id === where.id);
        row.quantity -= data.quantity.decrement;
        return { ...row };
      },
      upsert: async ({ where, update, create }) => {
        const code = where.characterId_itemCode.itemCode;
        const existing = state.items.get(code);
        if (existing) {
          existing.quantity += update.quantity.increment;
          return { ...existing };
        }
        const next = { id: `item-${code}`, ...create };
        state.items.set(code, next);
        return { ...next };
      },
    },
  };

  service = new CraftingService(prisma);
});

test('recipe catalogue is original and references real items', () => {
  assert.ok(RECIPE_CATALOGUE.length >= 4);
  const codes = new Set();
  for (const recipe of RECIPE_CATALOGUE) {
    assert.match(recipe.code, /^[A-Z][A-Z_]{2,39}$/);
    assert.ok(!codes.has(recipe.code));
    codes.add(recipe.code);
    assert.ok(recipe.description.length > 20);
    assert.ok(recipe.inputs.length > 0);
    assert.ok(recipe.output.quantity >= 1);
    for (const input of recipe.inputs) {
      assert.ok(findItem(input.itemCode), `insumo fora do catálogo: ${input.itemCode}`);
      assert.ok(input.quantity >= 1);
    }
    assert.ok(findItem(recipe.output.itemCode), `resultado fora do catálogo: ${recipe.output.itemCode}`);
  }
  assert.equal(findRecipe('NAO_EXISTE'), undefined);
});

test('crafting consumes materials and credits the result', async () => {
  state.character.level = 3;
  state.items.set('RIVER_PEARL', itemRow('RIVER_PEARL', 2));

  const result = await service.craft('user-1', 'RIVER_DRAUGHT');
  assert.equal(result.recipe.code, 'RIVER_DRAUGHT');
  assert.equal(result.output.code, 'RIVER_DRAUGHT');
  assert.equal(result.output.quantity, 1);
  assert.equal(result.character.gold, 80);
  assert.equal(state.items.has('RIVER_PEARL'), false, 'materiais consumidos');
  assert.equal(state.items.get('RIVER_DRAUGHT').quantity, 1, 'resultado creditado');
});

test('crafting is rejected for unknown, locked, unaffordable and missing materials', async () => {
  await expectStatus(service.craft('user-1', 'NAO_EXISTE'), 400);

  state.character.level = 1;
  state.items.set('STONE_CHARM', itemRow('STONE_CHARM', 3));
  await expectStatus(service.craft('user-1', 'STONE_BREW'), 400);
  state.character.level = 5;

  state.character.gold = 0;
  state.items.set('VEIL_SHARD', itemRow('VEIL_SHARD', 2));
  await expectStatus(service.craft('user-1', 'VEIL_ELIXIR'), 400);
  state.character.gold = 100;

  state.items.clear();
  await expectStatus(service.craft('user-1', 'VEIL_ELIXIR'), 400);

  state.items.set('VEIL_SHARD', itemRow('VEIL_SHARD', 1));
  await expectStatus(service.craft('user-1', 'VEIL_ELIXIR'), 400);
  assert.equal(state.items.get('VEIL_SHARD').quantity, 1, 'nada é consumido em falha');
});

test('overview reports affordable state from server stock', async () => {
  state.character.level = 2;
  state.items.set('VEIL_SHARD', itemRow('VEIL_SHARD', 2));

  const overview = await service.overview('user-1');
  const veil = overview.recipes.find((recipe) => recipe.code === 'VEIL_ELIXIR');
  assert.equal(veil.locked, false);
  assert.equal(veil.affordable, true);
  assert.equal(veil.inputs[0].owned, 2);

  const stone = overview.recipes.find((recipe) => recipe.code === 'STONE_BREW');
  assert.equal(stone.locked, true);
  assert.equal(stone.affordable, false);
});
