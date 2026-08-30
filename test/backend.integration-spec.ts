import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HoneyBatchStatus, OrderStatus } from '@prisma/client';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';

interface AuthResponse {
  accessToken: string;
  user: { id: string; tenantId: string; email: string };
  tenant: { id: string; slug: string };
}

interface EntityResponse {
  id: string;
}

describe('Backend integration', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tenantAToken: string;
  let tenantBToken: string;

  const tenantA = {
    tenantName: 'Integration Apiaries A',
    tenantSlug: 'integration-apiaries-a',
    name: 'Admin A',
    email: 'admin-a@integration.test',
    password: 'IntegrationPassword123!',
  };
  const tenantB = {
    tenantName: 'Integration Apiaries B',
    tenantSlug: 'integration-apiaries-b',
    name: 'Admin B',
    email: 'admin-b@integration.test',
    password: 'IntegrationPassword123!',
  };

  async function cleanIntegrationTenants(): Promise<void> {
    const tenants = await prisma.tenant.findMany({
      where: { slug: { startsWith: 'integration-' } },
      select: { id: true },
    });
    const tenantIds = tenants.map(({ id }) => id);
    if (tenantIds.length > 0) {
      await prisma.orderItem.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
    }
  }

  beforeAll(async () => {
    const databaseName = new URL(process.env.DATABASE_URL ?? '').pathname.slice(
      1,
    );
    if (!databaseName.endsWith('_test')) {
      throw new Error('Integration tests require a database ending in _test');
    }

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await cleanIntegrationTenants();

    const registrationA = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(tenantA)
      .expect(201);
    const registrationB = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(tenantB)
      .expect(201);

    tenantAToken = (registrationA.body as AuthResponse).accessToken;
    tenantBToken = (registrationB.body as AuthResponse).accessToken;
  });

  afterAll(async () => {
    await cleanIntegrationTenants();
    await app.close();
  });

  it('authenticates valid users and rejects invalid or missing credentials', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        tenantSlug: tenantA.tenantSlug,
        email: tenantA.email,
        password: tenantA.password,
      })
      .expect(200)
      .expect(({ body }) => {
        const auth = body as AuthResponse;
        expect(auth.accessToken).toEqual(expect.any(String));
        expect(auth.user.email).toBe(tenantA.email);
        expect(auth.tenant.slug).toBe(tenantA.tenantSlug);
      });

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        tenantSlug: tenantA.tenantSlug,
        email: tenantA.email,
        password: 'wrong-password',
      })
      .expect(401);

    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tenantAToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect((body as AuthResponse['user']).email).toBe(tenantA.email);
      });
  });

  it('isolates resources by the tenant claim in the access token', async () => {
    const apiaryAResponse = await request(app.getHttpServer())
      .post('/api/v1/apiaries')
      .set('Authorization', `Bearer ${tenantAToken}`)
      .send({ name: 'Tenant A Apiary', location: 'Goiania, GO' })
      .expect(201);
    const apiaryBResponse = await request(app.getHttpServer())
      .post('/api/v1/apiaries')
      .set('Authorization', `Bearer ${tenantBToken}`)
      .send({ name: 'Tenant B Apiary', location: 'Curitiba, PR' })
      .expect(201);

    const apiaryA = apiaryAResponse.body as EntityResponse;
    const apiaryB = apiaryBResponse.body as EntityResponse;

    await request(app.getHttpServer())
      .get('/api/v1/apiaries')
      .set('Authorization', `Bearer ${tenantAToken}`)
      .expect(200)
      .expect(({ body }) => {
        const ids = (body as EntityResponse[]).map(({ id }) => id);
        expect(ids).toContain(apiaryA.id);
        expect(ids).not.toContain(apiaryB.id);
      });

    await request(app.getHttpServer())
      .get(`/api/v1/apiaries/${apiaryB.id}`)
      .set('Authorization', `Bearer ${tenantAToken}`)
      .expect(404);
  });

  it('deducts inventory atomically, remains idempotent, and rolls back failures', async () => {
    const apiary = (
      await request(app.getHttpServer())
        .post('/api/v1/apiaries')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .send({ name: 'Transaction Apiary', location: 'Brasilia, DF' })
        .expect(201)
    ).body as EntityResponse;
    const hive = (
      await request(app.getHttpServer())
        .post('/api/v1/hives')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .send({
          apiaryId: apiary.id,
          code: 'INTEGRATION-HIVE-001',
          installationDate: '2026-01-10',
        })
        .expect(201)
    ).body as EntityResponse;
    const cycle = (
      await request(app.getHttpServer())
        .post('/api/v1/production-cycles')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .send({
          hiveId: hive.id,
          startDate: '2026-02-01',
          endDate: '2026-06-30',
          status: 'COMPLETED',
          actualProductionKg: 25,
        })
        .expect(201)
    ).body as EntityResponse;
    const batch = (
      await request(app.getHttpServer())
        .post('/api/v1/honey-batches')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .send({
          productionCycleId: cycle.id,
          code: 'INTEGRATION-BATCH-001',
          productionDate: '2026-07-01',
          quantityKg: 25,
          quality: 'PREMIUM',
        })
        .expect(201)
    ).body as EntityResponse;

    const createOrder = (quantityKg: number) =>
      request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .send({
          customerName: 'Integration Customer',
          customerDocument: '00.000.000/0001-00',
          items: [{ honeyBatchId: batch.id, quantityKg, unitPrice: 30 }],
        });

    const confirmedOrder = (await createOrder(10).expect(201))
      .body as EntityResponse;
    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${confirmedOrder.id}/status`)
      .set('Authorization', `Bearer ${tenantAToken}`)
      .send({ status: OrderStatus.CONFIRMED })
      .expect(200);

    const afterConfirmation = await prisma.honeyBatch.findUniqueOrThrow({
      where: { id: batch.id },
    });
    expect(afterConfirmation.availableQuantityKg.toNumber()).toBe(15);
    expect(afterConfirmation.status).toBe(HoneyBatchStatus.AVAILABLE);

    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${confirmedOrder.id}/status`)
      .set('Authorization', `Bearer ${tenantAToken}`)
      .send({ status: OrderStatus.CONFIRMED })
      .expect(200);
    expect(
      (
        await prisma.honeyBatch.findUniqueOrThrow({ where: { id: batch.id } })
      ).availableQuantityKg.toNumber(),
    ).toBe(15);

    const rejectedOrder = (await createOrder(20).expect(201))
      .body as EntityResponse;
    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${rejectedOrder.id}/status`)
      .set('Authorization', `Bearer ${tenantAToken}`)
      .send({ status: OrderStatus.CONFIRMED })
      .expect(409);

    const [persistedOrder, persistedBatch] = await Promise.all([
      prisma.order.findUniqueOrThrow({ where: { id: rejectedOrder.id } }),
      prisma.honeyBatch.findUniqueOrThrow({ where: { id: batch.id } }),
    ]);
    expect(persistedOrder.status).toBe(OrderStatus.PENDING);
    expect(persistedBatch.availableQuantityKg.toNumber()).toBe(15);
  });
});
