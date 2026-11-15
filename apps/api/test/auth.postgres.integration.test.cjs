const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');

const databaseAvailable = Boolean(process.env.DATABASE_URL);
let app;
let baseUrl;

/** Resolve com o nome do primeiro evento disparado entre os informados. */
function waitForAny(socket, events, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const handlers = events.map((event) => {
      const handler = (payload) => { cleanup(); resolve({ event, payload }); };
      socket.on(event, handler);
      return [event, handler];
    });
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`timeout esperando ${events.join(' ou ')}`));
    }, timeoutMs);
    function cleanup() {
      clearTimeout(timer);
      for (const [event, handler] of handlers) socket.off(event, handler);
    }
  });
}

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
  const healthBody = await health.json();
  assert.equal(healthBody.database, 'connected');
  // Redis é opcional: o ambiente de CI pode rodá-lo ou degradar para memória local.
  assert.ok(['connected', 'disabled', 'unavailable'].includes(healthBody.redis));

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

  const { io } = require('socket.io-client');
  const socketUrl = `${baseUrl.replace(/\/api$/, '')}/game`;
  const socket = io(socketUrl, {
    transports: ['websocket'],
    reconnection: false,
    extraHeaders: { Cookie: loginCookie.split(';')[0] },
  });
  try {
    const presencePromise = waitForAny(socket, ['world:presence']);
    const ready = await waitForAny(socket, ['session:ready']);
    assert.equal(ready.payload.userId, registration.user.id);
    assert.ok(ready.payload.online >= 1);

    const presence = (await presencePromise).payload;
    assert.ok(presence.online >= 1);
    assert.ok(['redis', 'memory'].includes(presence.store));
  } finally {
    socket.close();
  }

  const anonymous = io(socketUrl, { transports: ['websocket'], reconnection: false });
  try {
    let sessionReady = false;
    anonymous.on('session:ready', () => { sessionReady = true; });
    await waitForAny(anonymous, ['disconnect', 'connect_error']);
    assert.equal(sessionReady, false, 'sem cookie de sessão o gateway deve recusar a conexão');
  } finally {
    anonymous.close();
  }
});

test('roster recruitment, formation and team bonus frozen into combat', {
  skip: !databaseAvailable,
}, async () => {
  const origin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';
  const suffix = `r${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-10);
  const email = `roster-${suffix}@example.com`;
  const characterName = `Roster${suffix}`;
  const password = 'test-password-strong';

  const register = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ email, password, characterName, path: 'STONE_FIST' }),
  });
  assert.equal(register.status, 201);
  const registration = await register.json();
  const cookie = register.headers.get('set-cookie').split(';')[0];
  const json = { 'Content-Type': 'application/json', Origin: origin, Cookie: cookie };

  const { PrismaService } = require('../dist/prisma/prisma.service');
  const prisma = app.get(PrismaService);
  // O catálogo original exige ryō; a conta de teste começa sem saldo.
  await prisma.character.update({ where: { name: characterName }, data: { gold: 1000 } });

  const empty = await fetch(`${baseUrl}/roster`, { headers: { Cookie: cookie } });
  assert.equal(empty.status, 200);
  const emptyBody = await empty.json();
  assert.equal(emptyBody.slots.length, 4);
  assert.equal(emptyBody.roster.length, 0);
  assert.equal(emptyBody.power, 0);
  assert.ok(emptyBody.catalog.length >= 8);

  const catalog = await fetch(`${baseUrl}/roster/catalog`, { headers: { Cookie: cookie } });
  assert.equal(catalog.status, 200);
  const catalogBody = await catalog.json();
  assert.equal(catalogBody.ninjas.length, emptyBody.catalog.length);

  const recruitVanguard = await fetch(`${baseUrl}/roster/recruit`, {
    method: 'POST', headers: json, body: JSON.stringify({ ninjaCode: 'STONE_WARDEN' }),
  });
  assert.equal(recruitVanguard.status, 201);
  assert.equal((await recruitVanguard.json()).character.gold, 850);

  const recruitStriker = await fetch(`${baseUrl}/roster/recruit`, {
    method: 'POST', headers: json, body: JSON.stringify({ ninjaCode: 'MIST_LANCER' }),
  });
  assert.equal(recruitStriker.status, 201);
  assert.equal((await recruitStriker.json()).character.gold, 700);

  const duplicate = await fetch(`${baseUrl}/roster/recruit`, {
    method: 'POST', headers: json, body: JSON.stringify({ ninjaCode: 'MIST_LANCER' }),
  });
  assert.equal(duplicate.status, 409);

  const locked = await fetch(`${baseUrl}/roster/recruit`, {
    method: 'POST', headers: json, body: JSON.stringify({ ninjaCode: 'DAWN_BLADE' }),
  });
  assert.equal(locked.status, 400);

  const unknown = await fetch(`${baseUrl}/roster/recruit`, {
    method: 'POST', headers: json, body: JSON.stringify({ ninjaCode: 'NOT_A_NINJA' }),
  });
  assert.equal(unknown.status, 400);

  const takenOrigin = await fetch(`${baseUrl}/roster/recruit`, {
    method: 'POST',
    headers: { ...json, Origin: 'https://attacker.example' },
    body: JSON.stringify({ ninjaCode: 'MIST_LANCER' }),
  });
  assert.equal(takenOrigin.status, 403);

  const duplicatePosition = await fetch(`${baseUrl}/roster/formation`, {
    method: 'PUT', headers: json,
    body: JSON.stringify({ slots: [
      { ninjaCode: 'STONE_WARDEN', position: 1 },
      { ninjaCode: 'MIST_LANCER', position: 1 },
    ] }),
  });
  assert.equal(duplicatePosition.status, 400);

  const notOwned = await fetch(`${baseUrl}/roster/formation`, {
    method: 'PUT', headers: json,
    body: JSON.stringify({ slots: [{ ninjaCode: 'DAWN_BLADE', position: 1 }] }),
  });
  assert.equal(notOwned.status, 400);

  const formation = await fetch(`${baseUrl}/roster/formation`, {
    method: 'PUT', headers: json,
    body: JSON.stringify({ slots: [
      { ninjaCode: 'STONE_WARDEN', position: 1 },
      { ninjaCode: 'MIST_LANCER', position: 3 },
    ] }),
  });
  assert.equal(formation.status, 200);
  const formed = await formation.json();
  assert.equal(formed.slots[0].ninja.code, 'STONE_WARDEN');
  assert.equal(formed.slots[2].ninja.code, 'MIST_LANCER');
  assert.ok(formed.power > 0);
  assert.equal(formed.bonus.maxHp, 76);
  assert.equal(formed.bonus.damageBonus, 13);

  const start = await fetch(`${baseUrl}/combat/start`, {
    method: 'POST', headers: json, body: '{}',
  });
  assert.equal(start.status, 201);
  const battle = await start.json();
  const team = battle.battle.state.team;
  assert.ok(team, 'o confronto deve congelar o bônus da formação');
  assert.equal(team.power, formed.power);
  assert.equal(team.damageBonus, 13);
  assert.equal(battle.battle.state.player.maxHp, registration.character.vitality * 12 + 76);
  assert.equal(
    battle.battle.state.player.maxChakra,
    40 + registration.character.intelligence * 8,
  );
  assert.ok(battle.battle.state.logs.some((entry) => entry.text.includes(String(formed.power))));

  // Mudar a formação no meio do confronto não pode alterar a luta em andamento.
  const resetFormation = await fetch(`${baseUrl}/roster/formation`, {
    method: 'PUT', headers: json, body: JSON.stringify({ slots: [] }),
  });
  assert.equal(resetFormation.status, 200);
  const afterReset = await (await fetch(`${baseUrl}/combat/current`, {
    headers: { Cookie: cookie },
  })).json();
  assert.deepEqual(afterReset.battle.state.team, team);

  const strike = await fetch(`${baseUrl}/combat/action`, {
    method: 'POST', headers: json, body: JSON.stringify({ action: 'strike' }),
  });
  assert.equal(strike.status, 201);
  const struck = await strike.json();
  const expectedDamage = 12 + registration.character.strength * 2 + registration.character.level * 2 + 13;
  assert.equal(struck.battle.state.enemy.hp, 90 + registration.character.level * 22 - expectedDamage);
  assert.equal(struck.character.energy, 90);
});

test('missions, inventory and lazy energy regeneration', {
  skip: !databaseAvailable,
}, async () => {
  const origin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';
  const suffix = `m${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-10);
  const email = `mission-${suffix}@example.com`;
  const characterName = `Mission${suffix}`;
  const password = 'test-password-strong';

  const register = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ email, password, characterName, path: 'STONE_FIST' }),
  });
  assert.equal(register.status, 201);
  const registration = await register.json();
  const cookie = register.headers.get('set-cookie').split(';')[0];
  const json = { 'Content-Type': 'application/json', Origin: origin, Cookie: cookie };

  const overview = await fetch(`${baseUrl}/missions`, { headers: { Cookie: cookie } });
  assert.equal(overview.status, 200);
  const board = await overview.json();
  assert.equal(board.energy, 100);
  const trail = board.missions.find((mission) => mission.code === 'TRAIL_OF_ASHES');
  assert.equal(trail.status, 'AVAILABLE');
  assert.equal(trail.locked, false);
  assert.equal(trail.affordable, true);

  const accept = await fetch(`${baseUrl}/missions/accept`, {
    method: 'POST', headers: json, body: JSON.stringify({ missionCode: 'TRAIL_OF_ASHES' }),
  });
  assert.equal(accept.status, 201);
  const accepted = await accept.json();
  assert.equal(accepted.character.energy, 88);
  assert.equal(accepted.battle.status, 'ACTIVE');
  assert.equal(accepted.battle.state.mission.code, 'TRAIL_OF_ASHES');
  assert.equal(accepted.battle.state.enemy.code, 'ASH_HOUND');

  const duplicateAccept = await fetch(`${baseUrl}/missions/accept`, {
    method: 'POST', headers: json, body: JSON.stringify({ missionCode: 'TRAIL_OF_ASHES' }),
  });
  assert.equal(duplicateAccept.status, 409, 'confronto ativo bloqueia um segundo aceite');

  let battle = accepted.battle;
  while (battle.status === 'ACTIVE') {
    const action = await fetch(`${baseUrl}/combat/action`, {
      method: 'POST', headers: json, body: JSON.stringify({ action: 'strike' }),
    });
    assert.equal(action.status, 201);
    const payload = await action.json();
    battle = payload.battle;
  }

  assert.equal(battle.status, 'VICTORY');

  const me = await (await fetch(`${baseUrl}/auth/me`, { headers: { Cookie: cookie } })).json();
  assert.equal(me.character.gold, 40);
  assert.equal(me.character.experience, 90);
  assert.equal(me.character.level, 1);

  const afterBoard = await (await fetch(`${baseUrl}/missions`, { headers: { Cookie: cookie } })).json();
  const trailAfter = afterBoard.missions.find((mission) => mission.code === 'TRAIL_OF_ASHES');
  assert.equal(trailAfter.status, 'COMPLETED');

  const completedAccept = await fetch(`${baseUrl}/missions/accept`, {
    method: 'POST', headers: json, body: JSON.stringify({ missionCode: 'TRAIL_OF_ASHES' }),
  });
  assert.equal(completedAccept.status, 409, 'missÃ£o concluÃ­da nÃ£o pode ser reaceita');

  const lockedAccept = await fetch(`${baseUrl}/missions/accept`, {
    method: 'POST', headers: json, body: JSON.stringify({ missionCode: 'WHISPERING_REEDS' }),
  });
  assert.equal(lockedAccept.status, 400, 'missÃ£o de nÃ­vel superior Ã© bloqueada');

  const bag = await (await fetch(`${baseUrl}/inventory`, { headers: { Cookie: cookie } })).json();
  const tonic = bag.items.find((item) => item.code === 'HERBAL_TONIC');
  assert.equal(tonic.quantity, 1);

  const use = await fetch(`${baseUrl}/inventory/use`, {
    method: 'POST', headers: json, body: JSON.stringify({ itemCode: 'HERBAL_TONIC' }),
  });
  assert.equal(use.status, 201);
  const used = await use.json();
  assert.equal(used.restored, 12, '88 + 20 = 100, apenas 12 recuperados');
  assert.equal(used.character.energy, 100);
  assert.equal(used.item.remaining, 0);

  const emptyBag = await (await fetch(`${baseUrl}/inventory`, { headers: { Cookie: cookie } })).json();
  assert.equal(emptyBag.items.length, 0, 'o item some depois de usado');

  const reuse = await fetch(`${baseUrl}/inventory/use`, {
    method: 'POST', headers: json, body: JSON.stringify({ itemCode: 'HERBAL_TONIC' }),
  });
  assert.equal(reuse.status, 400, 'nÃ£o Ã© possÃ­vel usar um item que nÃ£o se possui');

  const { PrismaService } = require('../dist/prisma/prisma.service');
  const prisma = app.get(PrismaService);
  await prisma.character.update({
    where: { name: characterName },
    data: { energy: 50, energyUpdatedAt: new Date(Date.now() - 10 * 60_000) },
  });
  const refreshed = await (await fetch(`${baseUrl}/auth/me`, { headers: { Cookie: cookie } })).json();
  assert.equal(refreshed.character.energy, 60);
});

