# Honey Manager Backend

Backend foundation for a multi-tenant B2B beekeeping management SaaS. It is a NestJS modular monolith using PostgreSQL, Prisma, Redis, JWT, Jest, and Swagger.

Business modules are intentionally not included yet.

## Requirements

- Node.js 20.19 or newer
- npm 10 or newer
- Docker and Docker Compose (recommended for PostgreSQL and Redis)

## Local setup

```bash
npm install
cp .env.example .env
docker compose up -d postgres redis
npm run prisma:deploy
npm run start:dev
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

The API is available at `http://localhost:3000/api/v1`. Swagger UI is available at `http://localhost:3000/docs` when `SWAGGER_ENABLED=true`.

## Full Docker setup

Create `.env` from `.env.example`, replace `JWT_SECRET`, then run:

```bash
docker compose up --build
```

Compose runs pending Prisma migrations in a one-shot container, then starts the production-only API image after PostgreSQL and Redis are healthy.

## Commands

```bash
npm run build
npm run lint
npm test
npm run test:e2e
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:studio
```

Use `prisma:migrate` while developing schema changes. Use `prisma:deploy` to apply committed migrations in deployed environments.

## Structure

```text
src/
  auth/       JWT strategy, guard, token service, and current-user decorator
  common/     Global exception filter and request logging
  config/     Environment validation
  database/   Global Prisma integration
  redis/      Global lazy Redis integration
  tenancy/    Async tenant context derived from authenticated JWT claims
prisma/
  migrations/ Versioned PostgreSQL migrations
  schema.prisma
```

## Multitenancy

The shared-schema strategy uses a `tenantId` foreign key on tenant-owned records. The JWT payload includes `tenantId`, and the global tenant interceptor stores that signed claim in `TenantContextService` for the duration of each request.

Future repositories and services should always obtain the tenant with `TenantContextService.requireTenantId()` and include it in every tenant-owned Prisma query. Do not accept tenant identity from request headers or request bodies.

Authentication endpoints and beekeeping business modules are the next application layer and are outside this foundation.
