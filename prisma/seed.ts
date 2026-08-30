import {
  ColonyStatus,
  HoneyBatchStatus,
  HoneyQuality,
  OrderStatus,
  Prisma,
  PrismaClient,
  ProductionCycleStatus,
  QueenStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const password = 'DemoPassword123!';

const ids = {
  tenant: '00000000-0000-4000-8000-000000000001',
  secondTenant: '00000000-0000-4000-8000-000000000002',
  admin: '00000000-0000-4000-8000-000000000011',
  operator: '00000000-0000-4000-8000-000000000012',
  secondAdmin: '00000000-0000-4000-8000-000000000013',
  apiary: '00000000-0000-4000-8000-000000000021',
  secondApiary: '00000000-0000-4000-8000-000000000022',
  hive: '00000000-0000-4000-8000-000000000031',
  secondHive: '00000000-0000-4000-8000-000000000032',
  cycle: '00000000-0000-4000-8000-000000000041',
  secondCycle: '00000000-0000-4000-8000-000000000042',
  batch: '00000000-0000-4000-8000-000000000051',
  secondBatch: '00000000-0000-4000-8000-000000000052',
  order: '00000000-0000-4000-8000-000000000061',
  orderItem: '00000000-0000-4000-8000-000000000071',
} as const;

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (tx) => {
    await tx.tenant.upsert({
      where: { id: ids.tenant },
      update: { name: 'Serra Dourada Apiaries', slug: 'serra-dourada' },
      create: {
        id: ids.tenant,
        name: 'Serra Dourada Apiaries',
        slug: 'serra-dourada',
      },
    });
    await tx.tenant.upsert({
      where: { id: ids.secondTenant },
      update: { name: 'Vale Verde Honey', slug: 'vale-verde' },
      create: {
        id: ids.secondTenant,
        name: 'Vale Verde Honey',
        slug: 'vale-verde',
      },
    });

    const users = [
      {
        id: ids.admin,
        tenantId: ids.tenant,
        name: 'Marina Costa',
        email: 'admin@serradourada.test',
        role: UserRole.ADMIN,
      },
      {
        id: ids.operator,
        tenantId: ids.tenant,
        name: 'Lucas Mendes',
        email: 'operator@serradourada.test',
        role: UserRole.OPERATOR,
      },
      {
        id: ids.secondAdmin,
        tenantId: ids.secondTenant,
        name: 'Ana Ribeiro',
        email: 'admin@valeverde.test',
        role: UserRole.ADMIN,
      },
    ];
    for (const user of users) {
      await tx.user.upsert({
        where: { id: user.id },
        update: { ...user, passwordHash, isActive: true },
        create: { ...user, passwordHash },
      });
    }

    const apiaries = [
      {
        id: ids.apiary,
        tenantId: ids.tenant,
        name: 'Apiario Serra Norte',
        location: 'Chapada dos Veadeiros, GO',
        latitude: new Prisma.Decimal('-14.0865'),
        longitude: new Prisma.Decimal('-47.5064'),
        description: 'Primary cerrado flowering site',
      },
      {
        id: ids.secondApiary,
        tenantId: ids.secondTenant,
        name: 'Apiario Vale Sul',
        location: 'Pocos de Caldas, MG',
        latitude: new Prisma.Decimal('-21.7878'),
        longitude: new Prisma.Decimal('-46.5614'),
        description: 'Independent tenant isolation example',
      },
    ];
    for (const apiary of apiaries) {
      await tx.apiary.upsert({
        where: { id: apiary.id },
        update: apiary,
        create: apiary,
      });
    }

    const hives = [
      {
        id: ids.hive,
        tenantId: ids.tenant,
        apiaryId: ids.apiary,
        code: 'SD-HIVE-001',
        queenStatus: QueenStatus.PRESENT,
        colonyStatus: ColonyStatus.STRONG,
        installationDate: new Date('2025-09-15T00:00:00.000Z'),
        notes: 'Italian queen; strong spring colony',
      },
      {
        id: ids.secondHive,
        tenantId: ids.secondTenant,
        apiaryId: ids.secondApiary,
        code: 'VV-HIVE-001',
        queenStatus: QueenStatus.PRESENT,
        colonyStatus: ColonyStatus.MODERATE,
        installationDate: new Date('2026-01-20T00:00:00.000Z'),
        notes: 'Eucalyptus flow monitoring',
      },
    ];
    for (const hive of hives) {
      await tx.hive.upsert({
        where: { id: hive.id },
        update: hive,
        create: hive,
      });
    }

    const cycles = [
      {
        id: ids.cycle,
        tenantId: ids.tenant,
        hiveId: ids.hive,
        startDate: new Date('2026-05-01T00:00:00.000Z'),
        endDate: new Date('2026-08-15T00:00:00.000Z'),
        status: ProductionCycleStatus.COMPLETED,
        estimatedProductionKg: new Prisma.Decimal(120),
        actualProductionKg: new Prisma.Decimal(108),
        notes: 'Cerrado wildflower harvest',
      },
      {
        id: ids.secondCycle,
        tenantId: ids.secondTenant,
        hiveId: ids.secondHive,
        startDate: new Date('2026-07-01T00:00:00.000Z'),
        status: ProductionCycleStatus.ACTIVE,
        estimatedProductionKg: new Prisma.Decimal(80),
        notes: 'Active eucalyptus season',
      },
    ];
    for (const cycle of cycles) {
      await tx.productionCycle.upsert({
        where: { id: cycle.id },
        update: cycle,
        create: cycle,
      });
    }

    const batches = [
      {
        id: ids.batch,
        tenantId: ids.tenant,
        productionCycleId: ids.cycle,
        code: 'SD-2026-001',
        productionDate: new Date('2026-08-16T00:00:00.000Z'),
        quantityKg: new Prisma.Decimal(108),
        availableQuantityKg: new Prisma.Decimal(96),
        quality: HoneyQuality.PREMIUM,
        status: HoneyBatchStatus.AVAILABLE,
      },
      {
        id: ids.secondBatch,
        tenantId: ids.secondTenant,
        productionCycleId: ids.secondCycle,
        code: 'VV-2026-001',
        productionDate: new Date('2026-08-20T00:00:00.000Z'),
        quantityKg: new Prisma.Decimal(42),
        availableQuantityKg: new Prisma.Decimal(42),
        quality: HoneyQuality.STANDARD,
        status: HoneyBatchStatus.AVAILABLE,
      },
    ];
    for (const batch of batches) {
      await tx.honeyBatch.upsert({
        where: { id: batch.id },
        update: batch,
        create: batch,
      });
    }

    await tx.order.upsert({
      where: { id: ids.order },
      update: {
        customerName: 'Emporio Central',
        customerDocument: '12.345.678/0001-90',
        status: OrderStatus.CONFIRMED,
        total: new Prisma.Decimal(420),
      },
      create: {
        id: ids.order,
        tenantId: ids.tenant,
        customerName: 'Emporio Central',
        customerDocument: '12.345.678/0001-90',
        status: OrderStatus.CONFIRMED,
        total: new Prisma.Decimal(420),
      },
    });
    await tx.orderItem.upsert({
      where: { id: ids.orderItem },
      update: {
        quantityKg: new Prisma.Decimal(12),
        unitPrice: new Prisma.Decimal(35),
        subtotal: new Prisma.Decimal(420),
      },
      create: {
        id: ids.orderItem,
        tenantId: ids.tenant,
        orderId: ids.order,
        honeyBatchId: ids.batch,
        quantityKg: new Prisma.Decimal(12),
        unitPrice: new Prisma.Decimal(35),
        subtotal: new Prisma.Decimal(420),
      },
    });
  });

  console.info('Demo data seeded. Login: admin@serradourada.test / DemoPassword123!');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });