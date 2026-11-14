const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');

const { PresenceService } = require('../dist/realtime/presence.service');
const { MemoryPresenceStore, RedisPresenceStore, PRESENCE_KEY } = require('../dist/realtime/presence.store');
const { RedisService } = require('../dist/redis/redis.service');

const offlineRedis = {
  isAvailable: () => false,
  getStatus: () => 'disabled',
  withClient: async () => null,
};

let service;

beforeEach(() => {
  service = new PresenceService(offlineRedis);
});

test('counts a player once even with multiple open tabs', async () => {
  await service.join('user-1', 'socket-a');
  let snapshot = await service.join('user-1', 'socket-b');

  assert.equal(snapshot.online, 1);
  assert.equal(service.localPlayers(), 1);

  snapshot = await service.leave('user-1', 'socket-a');
  assert.equal(snapshot.online, 1, 'a segunda aba ainda está conectada');

  snapshot = await service.leave('user-1', 'socket-b');
  assert.equal(snapshot.online, 0);
  assert.equal(service.localPlayers(), 0);
});

test('keeps distinct players counted separately', async () => {
  await service.join('user-1', 'socket-a');
  const snapshot = await service.join('user-2', 'socket-b');

  assert.equal(snapshot.online, 2);
  assert.equal(service.localPlayers(), 2);
});

test('ignores disconnects for sockets that were never registered', async () => {
  await service.join('user-1', 'socket-a');

  const snapshot = await service.leave('user-1', 'socket-unknown');
  assert.equal(snapshot.online, 1);

  const unknownUser = await service.leave('user-9', 'socket-x');
  assert.equal(unknownUser.online, 1);
});

test('reports the memory store while Redis is unavailable', async () => {
  const snapshot = await service.join('user-1', 'socket-a');
  assert.equal(snapshot.store, 'memory');
  assert.match(snapshot.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('uses Redis for presence when it is available', async () => {
  const written = [];
  const redis = {
    isAvailable: () => true,
    getStatus: () => 'connected',
    withClient: async (operation) => operation({
      sadd: async (key, value) => { written.push(['sadd', key, value]); return 1; },
      srem: async (key, value) => { written.push(['srem', key, value]); return 1; },
      scard: async (key) => { written.push(['scard', key]); return 7; },
    }),
  };
  const shared = new PresenceService(redis);

  const snapshot = await shared.join('user-1', 'socket-a');
  assert.equal(snapshot.store, 'redis');
  assert.equal(snapshot.online, 7);
  assert.deepEqual(written[0], ['sadd', PRESENCE_KEY, 'user-1']);
  assert.deepEqual(written[1], ['scard', PRESENCE_KEY]);
});

test('drops the player from both stores so a failover does not leave ghosts', async () => {
  const calls = [];
  const redis = {
    isAvailable: () => true,
    withClient: async (operation) => operation({
      sadd: async () => 1,
      srem: async (key, value) => { calls.push(['srem', key, value]); return 1; },
      scard: async () => 0,
    }),
  };
  const shared = new PresenceService(redis);
  await shared.join('user-1', 'socket-a');
  await shared.leave('user-1', 'socket-a');

  assert.deepEqual(calls[0], ['srem', PRESENCE_KEY, 'user-1']);
});

test('memory store deduplicates repeated adds', async () => {
  const store = new MemoryPresenceStore();
  await store.add('user-1');
  await store.add('user-1');
  assert.equal(await store.count(), 1);

  await store.remove('user-1');
  await store.remove('user-1');
  assert.equal(await store.count(), 0);
});

test('redis presence store degrades to zero instead of throwing when Redis fails', async () => {
  const store = new RedisPresenceStore({ withClient: async () => null });
  await store.add('user-1');
  await store.remove('user-1');
  assert.equal(await store.count(), 0);
});

test('RedisService stays disabled and skipped when REDIS_URL is not configured', async () => {
  const previous = process.env.REDIS_URL;
  delete process.env.REDIS_URL;
  try {
    const redis = new RedisService();
    await redis.onModuleInit();

    assert.equal(redis.isAvailable(), false);
    assert.equal(redis.getStatus(), 'disabled');
    assert.deepEqual(await redis.health(), { status: 'disabled' });
    assert.equal(await redis.withClient(async () => 'never'), null);

    await redis.onModuleDestroy();
  } finally {
    if (previous !== undefined) process.env.REDIS_URL = previous;
  }
});
