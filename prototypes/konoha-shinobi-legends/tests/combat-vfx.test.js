import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle } from '../src/core/combat.js';
import { getCharacter } from '../src/data/characters.js';
import { jutsusOf } from '../src/data/jutsus.js';
import { vfxKindFor, vfxThemeFor } from '../src/ui/battle-vfx.js';

const tuning = { globalMultiplier: 1, critMultiplier: 1, defenseConstant: 450, variance: 0, comboBonusPerHit: 0 };

function makeUnit(character, side, uid, overrides = {}) {
  return {
    uid,
    name: character.name,
    side,
    charId: character.id,
    def: character,
    element: character.element,
    style: character.style,
    sigil: character.sigil,
    slot: side === 'ally' ? 4 : 2,
    spd: 100,
    atk: 100,
    defense: 0,
    maxHp: 1000,
    hp: 1000,
    chakra: 100,
    maxChakra: 100,
    crit: 0,
    statuses: [],
    alive: true,
    guard: false,
    pursuitUsed: false,
    teamBonus: {},
    level: 1,
    ...overrides,
  };
}

function makeHooks(actionEvents = []) {
  return {
    log() {},
    render() {},
    async hit() {},
    async actionFlash(...args) { actionEvents.push(args); },
    async combo() {},
    async statusApplied() {},
    async defeat() {},
  };
}

test('resolve temas de jutsu por elemento e tipos visuais de ataque', () => {
  assert.equal(vfxThemeFor('fogo'), 'fire');
  assert.equal(vfxThemeFor('raio'), 'lightning');
  assert.equal(vfxThemeFor('gelo'), 'ice');
  assert.equal(vfxThemeFor('elemento-desconhecido'), 'chakra');
  assert.equal(vfxKindFor('basic'), 'basic');
  assert.equal(vfxKindFor('jutsu'), 'jutsu');
  assert.equal(vfxKindFor('jutsu', { support: true }), 'support');
  assert.equal(vfxKindFor('pursuit'), 'pursuit');
  assert.equal(vfxKindFor('guard'), 'guard');
});

test('o motor entrega alvo e elemento no evento visual de jutsu', async () => {
  const events = [];
  const naruto = getCharacter('naruto');
  const enemyDef = getCharacter('zabuza');
  const ally = makeUnit(naruto, 'ally', 'ally-naruto');
  const enemy = makeUnit(enemyDef, 'enemy', 'enemy-zabuza');
  const battle = new Battle({ allies: [ally], enemies: [enemy], hooks: makeHooks(events), tuning });
  const jutsu = jutsusOf(naruto).find((item) => item.target === 'enemy');
  assert.ok(jutsu, 'Naruto precisa ter um jutsu ofensivo de alvo único');

  await battle.takeTurn(ally, { type: 'jutsu', jutsuId: jutsu.id, targetUid: enemy.uid });
  const event = events.find(([, label]) => label === jutsu.name);
  assert.ok(event);
  assert.equal(event[2].type, 'jutsu');
  assert.equal(event[2].jutsuId, jutsu.id);
  assert.equal(event[2].element, naruto.element);
  assert.equal(event[2].targetMode, 'enemy');
  assert.equal(event[2].targetUid, enemy.uid);
});

test('cada pursuit anuncia seu atacante, alvo e tema antes da cadeia de acertos', async () => {
  const events = [];
  const source = makeUnit(getCharacter('naruto'), 'ally', 'ally-source');
  const pursuitDef = {
    ...getCharacter('neji'),
    pursuit: { name: 'Oito Trigramas: 64 Palmas', triggers: ['float'], mult: 0.5, hits: 2 },
  };
  const pursuer = makeUnit(pursuitDef, 'ally', 'ally-neji', { slot: 5 });
  const target = makeUnit(getCharacter('zabuza'), 'enemy', 'enemy-zabuza');
  const battle = new Battle({ allies: [source, pursuer], enemies: [target], hooks: makeHooks(events), tuning });

  await battle.triggerPursuit('float', target, source, 0);
  const event = events.find(([, label]) => label === pursuitDef.pursuit.name);
  assert.ok(event);
  assert.equal(event[0], pursuer);
  assert.equal(event[2].type, 'pursuit');
  assert.equal(event[2].element, pursuitDef.element);
  assert.equal(event[2].targetUid, target.uid);
});
