import test from 'node:test';
import assert from 'node:assert/strict';
import { ROSTER } from '../src/data/characters.js';
import { CHARACTER_ART } from '../src/data/character-art.js';
import { characterPortrait } from '../src/ui/components.js';

test('protagonista e todos os ninjas clássicos têm um retrato gerado único', () => {
  const characterIds = ['hero', ...ROSTER.map((character) => character.id)];
  assert.equal(ROSTER.length, 22);
  assert.equal(Object.keys(CHARACTER_ART).length, 23);
  assert.deepEqual(Object.keys(CHARACTER_ART).sort(), [...characterIds].sort());
  assert.equal(new Set(Object.values(CHARACTER_ART)).size, 23);

  for (const [id, url] of Object.entries(CHARACTER_ART)) {
    assert.match(url, /^\/manus-storage\/async-images\/[\w-]+\/image-\d+\.webp$/);
    const character = id === 'hero' ? { ...ROSTER[0], id } : ROSTER.find((entry) => entry.id === id);
    const markup = characterPortrait(character);
    assert.ok(markup.includes(`src="${url}"`), `${id} precisa usar seu retrato`);
    assert.ok(markup.includes('character-portrait__fallback'), `${id} precisa manter o selo fallback`);
  }
});
