const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');

const databaseAvailable = Boolean(process.env.DATABASE_URL);
let app;
let baseUrl;

before(async () => {
  if (!databaseAvailable) return;
  const { NestFactory } = require('@nestjs/core');
  const { ValidationPipe } = require('@nestjs/common');
  const { AppModule } = require('../dist/app.module');
  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  const address = app.getHttpServer().address();
  baseUrl = `http://127.0.0.1:${address.port}/api`;
});

after(async () => {
  if (app) await app.close();
});

test('PostgreSQL registration, login, cookie session, protected game route and logout', {
  skip: !databaseAvailable,
}, async () => {
  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).database, 'connected');

  const origin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-10);
  const email = `shinobi-${suffix}@example.com`;
  const characterName = `Shinobi${suffix}`;
  const password = 'test-password-strong';

  const register = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ email: ` ${email.toUpperCase()} `, password, characterName, path: 'WIND_DANCER' }),
  });
  assert.equal(register.status, 201);
  const registration = await register.json();
  assert.equal(registration.user.email, undefined);
  assert.equal(registration.accessToken, undefined);
  assert.equal(registration.character.name, characterName);
  const registrationCookie = register.headers.get('set-cookie');
  assert.match(registrationCookie ?? '', /sf_session=/);
  assert.match(registrationCookie ?? '', /httponly/i);
  assert.match(registrationCookie ?? '', /path=\//i);

  const duplicate = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ email: email.toUpperCase(), password, characterName: `${characterName}X`, path: 'WIND_DANCER' }),
  });
  assert.equal(duplicate.status, 409);

  const me = await fetch(`${baseUrl}/auth/me`, {
    headers: { Cookie: registrationCookie.split(';')[0] },
  });
  assert.equal(me.status, 200);
  const session = await me.json();
  assert.equal(session.user.id, registration.user.id);
  assert.equal(session.character.name, characterName);

  const current = await fetch(`${baseUrl}/combat/current`, {
    headers: { Cookie: registrationCookie.split(';')[0] },
  });
  assert.equal(current.status, 200);
  assert.equal((await current.json()).battle, null);

  const wrongPassword = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ email, password: 'wrong-password-123' }),
  });
  assert.equal(wrongPassword.status, 401);

  const logout = await fetch(`${baseUrl}/auth/logout`, {
    method: 'POST',
    headers: { Origin: origin, Cookie: registrationCookie.split(';')[0] },
  });
  assert.equal(logout.status, 201);
  const afterLogout = await fetch(`${baseUrl}/auth/me`, {
    headers: { Cookie: logout.headers.get('set-cookie')?.split(';')[0] ?? '' },
  });
  assert.equal(afterLogout.status, 401);

  const login = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(login.status, 201);
  const loginBody = await login.json();
  assert.equal(loginBody.accessToken, undefined);
  assert.ok(loginBody.user.lastLoginAt);
  const loginCookie = login.headers.get('set-cookie');
  assert.match(loginCookie ?? '', /sf_session=/);

  const startCombat = await fetch(`${baseUrl}/combat/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: loginCookie.split(';')[0],
    },
    body: '{}',
  });
  assert.equal(startCombat.status, 201);
  const combat = await startCombat.json();
  assert.equal(combat.battle.status, 'ACTIVE');
  assert.equal(combat.character.energy, 90);

  const rejectedOrigin = await fetch(`${baseUrl}/combat/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://attacker.example',
      Cookie: loginCookie.split(';')[0],
    },
    body: '{}',
  });
  assert.equal(rejectedOrigin.status, 403);
});
