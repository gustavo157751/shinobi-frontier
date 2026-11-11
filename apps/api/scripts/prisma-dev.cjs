const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repositoryRoot = path.resolve(__dirname, '../../..');

function readDatabaseUrl(filePath) {
  if (!fs.existsSync(filePath)) return undefined;
  const line = fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .find((entry) => /^\s*DATABASE_URL\s*=/.test(entry));
  if (!line) return undefined;

  const value = line.slice(line.indexOf('=') + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value || undefined;
}

function configureDatabaseUrl() {
  if (process.env.DATABASE_URL) return;

  const configuredUrl = readDatabaseUrl(path.join(repositoryRoot, '.env')) ??
    readDatabaseUrl(path.join(repositoryRoot, 'apps', 'api', '.env'));
  if (configuredUrl) {
    process.env.DATABASE_URL = configuredUrl;
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Defina DATABASE_URL explicitamente para migrar o banco de produção.');
  }

  const exampleUrl = readDatabaseUrl(path.join(repositoryRoot, '.env.example'));
  if (!exampleUrl) {
    throw new Error('DATABASE_URL ausente. Configure-a no arquivo .env antes de migrar.');
  }
  process.env.DATABASE_URL = exampleUrl;
  console.warn('DATABASE_URL não definida; usando o PostgreSQL local do .env.example. Inicie-o com docker compose up -d.');
}

function main() {
  try {
    configureDatabaseUrl();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
    return;
  }

  let prismaCli;
  try {
    prismaCli = require.resolve('prisma');
  } catch {
    console.error('Prisma CLI não encontrado. Execute npm ci na raiz do repositório.');
    process.exitCode = 1;
    return;
  }

  const result = spawnSync(process.execPath, [prismaCli, ...process.argv.slice(2)], {
    cwd: path.resolve(__dirname, '..'),
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) {
    console.error(result.error.message);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? 1;
  }
}

if (require.main === module) main();

module.exports = { configureDatabaseUrl, readDatabaseUrl };
