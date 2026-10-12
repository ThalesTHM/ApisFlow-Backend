import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';

interface HealthResponse {
  status: string;
  timestamp: string;
}

interface OpenApiOperation {
  summary?: string;
  responses?: Record<string, unknown>;
}

interface OpenApiDocument {
  info: { version: string };
  paths: Record<string, Record<string, OpenApiOperation>>;
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect(({ body }) => {
        const health = body as HealthResponse;
        expect(health.status).toBe('ok');
        expect(health.timestamp).toEqual(expect.any(String));
      });
  });

  it('/docs-json documents every operation with summaries and responses', () => {
    return request(app.getHttpServer())
      .get('/docs-json')
      .expect(200)
      .expect(({ body }) => {
        const document = body as OpenApiDocument;
        const operations = Object.values(document.paths).flatMap((path) =>
          Object.values(path),
        );

        expect(document.info.version).toBe('1.0.0');
        expect(operations).toHaveLength(33);
        for (const operation of operations) {
          expect(operation.summary).toEqual(expect.any(String));
          expect(Object.keys(operation.responses ?? {})).not.toHaveLength(0);
        }
      });
  });

  it('rejects tenantId supplied during registration', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        tenantName: 'Tenant A',
        tenantSlug: 'tenant-a',
        name: 'Admin User',
        email: 'admin@tenant.test',
        password: 'secure-password',
        tenantId: 'forged-tenant-id',
      })
      .expect(400);
  });

  it('requires authentication for user CRUD', () => {
    return request(app.getHttpServer()).get('/api/v1/users').expect(401);
  });
});
