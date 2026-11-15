const assert = require('node:assert/strict');
const { test } = require('node:test');

const { applyExperience, EXPERIENCE_PER_LEVEL } = require('../dist/character/progression');
const {
  ENERGY_REGEN_INTERVAL_MS,
  MAX_ENERGY,
  regenerateEnergy,
  refreshEnergy,
} = require('../dist/character/energy');

const baseCharacter = (overrides) => ({
  level: 1,
  experience: 0,
  strength: 10,
  vitality: 10,
  agility: 10,
  intelligence: 10,
  ...overrides,
});

test('experience below the level threshold keeps the character unchanged', () => {
  const stats = baseCharacter();
  const after = applyExperience(stats, EXPERIENCE_PER_LEVEL - 1);
  assert.equal(after.experience, 99);
  assert.equal(after.level, 1);
  assert.deepEqual(
    [after.strength, after.vitality, after.agility, after.intelligence],
    [stats.strength, stats.vitality, stats.agility, stats.intelligence],
  );
});

test('reaching the threshold levels up and raises every attribute', () => {
  const after = applyExperience(baseCharacter({ experience: 90 }), 10);
  assert.equal(after.level, 2);
  assert.equal(after.experience, 100);
  assert.deepEqual(
    [after.strength, after.vitality, after.agility, after.intelligence],
    [12, 12, 11, 11],
  );
});

test('a large reward can level multiple times without losing experience', () => {
  const after = applyExperience(baseCharacter(), 1250);
  assert.equal(after.experience, 1250);
  assert.equal(after.level, 13);
  assert.equal(after.strength, 34);
  assert.equal(after.vitality, 34);
  assert.equal(after.agility, 22);
  assert.equal(after.intelligence, 22);
  // Sobra sempre menos que o custo do próximo nível, nunca mais.
  assert.ok(after.experience < (after.level + 1) * EXPERIENCE_PER_LEVEL);
});

test('full energy never regenerates or moves its timestamp', () => {
  const anchor = new Date('2026-01-01T00:00:00.000Z');
  const tick = regenerateEnergy(MAX_ENERGY, anchor, new Date('2026-01-01T02:00:00.000Z'));
  assert.equal(tick.energy, MAX_ENERGY);
  assert.equal(tick.gained, 0);
  assert.equal(tick.energyUpdatedAt, anchor);
});

test('energy regenerates one point per minute and preserves the leftover fraction', () => {
  const anchor = new Date('2026-01-01T00:00:00.000Z');
  const now = new Date(anchor.getTime() + ENERGY_REGEN_INTERVAL_MS * 3 + 20_000);
  const tick = regenerateEnergy(40, anchor, now);
  assert.equal(tick.gained, 3);
  assert.equal(tick.energy, 43);
  assert.equal(tick.energyUpdatedAt.getTime(), anchor.getTime() + ENERGY_REGEN_INTERVAL_MS * 3);
});

test('a partial minute does not regenerate anything', () => {
  const anchor = new Date('2026-01-01T00:00:00.000Z');
  const tick = regenerateEnergy(40, anchor, new Date(anchor.getTime() + 59_000));
  assert.equal(tick.gained, 0);
  assert.equal(tick.energy, 40);
  assert.equal(tick.energyUpdatedAt, anchor);
});

test('regeneration stops at the cap and discards the excess', () => {
  const anchor = new Date('2026-01-01T00:00:00.000Z');
  const now = new Date(anchor.getTime() + ENERGY_REGEN_INTERVAL_MS * 300);
  const tick = regenerateEnergy(95, anchor, now);
  assert.equal(tick.energy, MAX_ENERGY);
  assert.equal(tick.gained, 5);
  assert.equal(tick.energyUpdatedAt, now);
});

test('refreshEnergy only writes to the database when energy actually changes', async () => {
  const anchor = new Date('2026-01-01T00:00:00.000Z');
  let updates = 0;
  const client = {
    character: {
      update: async ({ data }) => {
        updates += 1;
        return { id: 'character-1', ...data };
      },
    },
  };

  const idle = await refreshEnergy(
    client,
    { id: 'character-1', energy: 30, energyUpdatedAt: anchor },
    new Date(anchor.getTime() + 30_000),
  );
  assert.equal(idle.energy, 30);
  assert.equal(updates, 0);

  const regenerated = await refreshEnergy(
    client,
    { id: 'character-1', energy: 30, energyUpdatedAt: anchor },
    new Date(anchor.getTime() + ENERGY_REGEN_INTERVAL_MS * 2),
  );
  assert.equal(regenerated.energy, 32);
  assert.equal(updates, 1);
});
