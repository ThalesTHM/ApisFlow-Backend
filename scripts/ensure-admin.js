// Cria (ou atualiza) uma organização e um usuário ADMIN para acessar o ambiente.
// Roda na tarefa de migração só quando BOOTSTRAP_ADMIN_PASSWORD está definida
// (homologação); a senha vem do Secrets Manager, nunca do repositório.
const { PrismaClient, UserRole } = require('@prisma/client');
const bcrypt = require('bcrypt');

const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const slug = process.env.BOOTSTRAP_TENANT_SLUG || 'admin';
const tenantName = process.env.BOOTSTRAP_TENANT_NAME || 'Administração';
const email = (
  process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@admin.com'
).toLowerCase();

async function main() {
  if (!password) {
    console.log(
      JSON.stringify({
        level: 'log',
        context: 'ensure-admin',
        message: 'skipped',
      }),
    );
    return;
  }

  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const tenant = await prisma.tenant.upsert({
      where: { slug },
      update: {},
      create: { name: tenantName, slug },
    });
    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      update: { passwordHash, role: UserRole.ADMIN, isActive: true },
      create: {
        tenantId: tenant.id,
        name: 'Administrador',
        email,
        passwordHash,
        role: UserRole.ADMIN,
      },
    });
    console.log(
      JSON.stringify({
        level: 'log',
        context: 'ensure-admin',
        message: `admin ${email} ok in ${slug}`,
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
