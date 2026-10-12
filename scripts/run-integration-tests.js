const { spawnSync } = require('node:child_process');

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5433/honey_manager_test?schema=public';
const databaseName = new URL(databaseUrl).pathname.slice(1);

if (!databaseName.endsWith('_test')) {
  console.error('Integration tests require a database name ending in _test.');
  process.exit(1);
}

const env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: databaseUrl,
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  JWT_SECRET:
    process.env.JWT_SECRET ?? 'test-secret-with-at-least-32-characters',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '900',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
  SWAGGER_ENABLED: 'false',
};

function run(command, args) {
  const result = spawnSync(command, args, { env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const error = new Error(`${command} exited with code ${result.status}`);
    error.exitCode = result.status ?? 1;
    throw error;
  }
}

try {
  run('docker', [
    'compose',
    '--profile',
    'test',
    'up',
    '-d',
    '--wait',
    'postgres-test',
  ]);
  run(process.execPath, [
    require.resolve('prisma/build/index.js'),
    'migrate',
    'deploy',
  ]);
  run(process.execPath, [
    require.resolve('jest-cli/bin/jest'),
    '--config',
    './test/jest-integration.json',
    '--runInBand',
  ]);
} catch (error) {
  console.error(error.message);
  process.exitCode = error.exitCode ?? 1;
} finally {
  spawnSync(
    'docker',
    ['compose', '--profile', 'test', 'rm', '-s', '-f', 'postgres-test'],
    { env, stdio: 'inherit' },
  );
}