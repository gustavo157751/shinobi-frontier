const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');
const bcrypt = require('bcrypt');
const { AccountStatus } = require('@prisma/client');

bcrypt.hash = async () => 'bcrypt-hash';
bcrypt.compare = async () => true;

const { AuthService } = require('../dist/auth/auth.service');

const date = new Date('2026-01-01T00:00:00.000Z');
const character = { id: 'character-1', name: 'Aoi', level: 1 };
const account = {
  id: 'user-1',
  email: 'aoi@example.com',
  passwordHash: 'bcrypt-hash',
  status: AccountStatus.ACTIVE,
  emailVerifiedAt: null,
  lastLoginAt: null,
  deletedAt: null,
  createdAt: date,
  characters: [character],
};

let tx;
let prisma;
let jwt;
let service;

beforeEach(() => {
  tx = {
    user: {
      create: async () => account,
      update: async () => ({
        id: account.id,
        status: account.status,
        emailVerifiedAt: null,
        lastLoginAt: date,
        createdAt: date,
      }),
    },
    accountAuditEvent: { create: async () => ({}) },
  };
  prisma = {
    user: { findUnique: async () => null },
    character: { findUnique: async () => null },
    $transaction: async (callback) => callback(tx),
  };
  jwt = { sign: (payload) => `signed-${payload.sub}` };
  service = new AuthService(prisma, jwt);
});

test('register normalizes email, stores a hash, audits creation and returns a safe DTO', async () => {
  let createdData;
  let auditData;
  prisma.user.findUnique = async ({ where }) => {
    assert.equal(where.email, 'aoi@example.com');
    return null;
  };
  tx.user.create = async ({ data }) => {
    createdData = data;
    return account;
  };
  tx.accountAuditEvent.create = async ({ data }) => { auditData = data; return {}; };

  const result = await service.register({
    email: '  AOI@Example.com ',
    password: 'correct-horse-battery',
    characterName: 'Aoi',
    path: 'WIND_DANCER',
  });

  assert.equal(createdData.email, 'aoi@example.com');
  assert.equal(createdData.passwordHash, 'bcrypt-hash');
  assert.equal(auditData.event, 'REGISTERED');
  assert.deepEqual(result.user, {
    id: 'user-1', status: AccountStatus.ACTIVE, emailVerifiedAt: null,
    lastLoginAt: null, createdAt: date,
  });
  assert.equal(result.character, character);
  assert.equal(result.accessToken, 'signed-user-1');
  assert.equal(JSON.stringify(result).includes('passwordHash'), false);
  assert.equal(JSON.stringify(result).includes('aoi@example.com'), false);
});

test('rejects a duplicate normalized email before creating an account', async () => {
  prisma.user.findUnique = async () => account;
  let transactions = 0;
  prisma.$transaction = async (callback) => { transactions += 1; return callback(tx); };

  await assert.rejects(
    service.register({
      email: ' AOI@example.COM ', password: 'correct-horse-battery',
      characterName: 'Aoi2', path: 'WIND_DANCER',
    }),
    (error) => error.getStatus() === 409,
  );
  assert.equal(transactions, 0);
});

test('login normalizes email, updates last login, audits success, and omits private data', async () => {
  let updated;
  let auditData;
  prisma.user.findUnique = async ({ where }) => {
    assert.equal(where.email, 'aoi@example.com');
    return account;
  };
  tx.user.update = async (query) => {
    updated = query;
    return {
      id: account.id, status: account.status, emailVerifiedAt: null,
      lastLoginAt: query.data.lastLoginAt, createdAt: date,
    };
  };
  tx.accountAuditEvent.create = async ({ data }) => { auditData = data; return {}; };

  const result = await service.login({ email: ' AOI@EXAMPLE.COM ', password: 'correct-horse-battery' });

  assert.equal(updated.where.id, 'user-1');
  assert.ok(updated.data.lastLoginAt instanceof Date);
  assert.equal(auditData.event, 'LOGIN_SUCCEEDED');
  assert.equal(JSON.stringify(result).includes('passwordHash'), false);
  assert.equal(JSON.stringify(result).includes('aoi@example.com'), false);
});

test('denies login for suspended accounts', async () => {
  prisma.user.findUnique = async () => ({ ...account, status: AccountStatus.SUSPENDED });

  await assert.rejects(
    service.login({ email: 'aoi@example.com', password: 'correct-horse-battery' }),
    (error) => error.getStatus() === 401,
  );
});
