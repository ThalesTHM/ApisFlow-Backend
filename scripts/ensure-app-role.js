// Garante o papel app_user usado pela aplicação, separado do dono das tabelas.
// Roda na tarefa de migração (ECS run-task), depois de `prisma migrate deploy`,
// conectado como dono. O app_user não é superuser nem tem BYPASSRLS, então as
// políticas de Row-Level Security valem para ele.
const { PrismaClient } = require('@prisma/client');

const user = process.env.APP_DB_USER || 'app_user';
const password = process.env.APP_DB_PASSWORD;

// CREATE/ALTER ROLE não aceitam parâmetros; por isso só valores alfanuméricos.
if (!/^[a-z_][a-z0-9_]*$/.test(user)) {
  throw new Error('APP_DB_USER inválido');
}
if (!password || !/^[A-Za-z0-9]{16,}$/.test(password)) {
  throw new Error('APP_DB_PASSWORD ausente ou inválida');
}

const statements = [
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${user}') THEN
       CREATE ROLE ${user} LOGIN;
     END IF;
   END $$`,
  `ALTER ROLE ${user} WITH LOGIN PASSWORD '${password}' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`,
  `GRANT USAGE ON SCHEMA public TO ${user}`,
  `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${user}`,
  `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${user}`,
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${user}`,
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${user}`,
];

async function main() {
  const prisma = new PrismaClient();
  try {
    for (const sql of statements) {
      await prisma.$executeRawUnsafe(sql);
    }
    console.log(JSON.stringify({ level: 'log', context: 'ensure-app-role', message: `role ${user} ok` }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
