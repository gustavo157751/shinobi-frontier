const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');
const { findPrismaCli } = require('../scripts/prisma-dev.cjs');

test('finds the Prisma CLI through its installed package bin entry', () => {
  const cliPath = findPrismaCli();
  assert.ok(cliPath, 'Prisma CLI should be installed by npm ci');
  assert.equal(fs.existsSync(cliPath), true);
});
