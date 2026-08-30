# Honey Manager Backend

Backend foundation for a multi-tenant B2B beekeeping management SaaS. It is a NestJS modular monolith using PostgreSQL, Prisma, Redis, JWT, Jest, and Swagger.

Business modules are intentionally not included yet.

## Requirements

- Node.js 20.19 or newer
- npm 10 or newer
- Docker and Docker Compose (recommended for PostgreSQL and Redis)

## Local setup

With GNU Make:

Create a local `.env` file first using the required variables listed below.

```bash
make setup
make dev
```

Without Make:

```bash
npm install
docker compose up -d postgres redis
npm run prisma:deploy
npm run start:dev
```

Required environment variables are `NODE_ENV`, `PORT`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, and `SWAGGER_ENABLED`. Keep local values in the ignored `.env` file. Production values must come from the deployment platform's secret and configuration system.

The API is available at `http://localhost:3000/api/v1`. Swagger UI is available at `http://localhost:3000/docs` when `SWAGGER_ENABLED=true`.

## Full Docker setup

Provide the required environment variables through your deployment environment, then run:

```bash
make docker-up
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

## Authentication and users

- `POST /api/v1/auth/register` creates a tenant and its initial `ADMIN` user.
- `POST /api/v1/auth/login` authenticates with `tenantSlug`, email, and password.
- `GET /api/v1/auth/me` returns the authenticated tenant-scoped user.
- `POST /api/v1/users` creates a user (`ADMIN` only).
- `GET /api/v1/users` and `GET /api/v1/users/:id` list/read users (`ADMIN` or `MANAGER`).
- `PATCH /api/v1/users/:id` and `DELETE /api/v1/users/:id` modify users (`ADMIN` only).

Roles are `ADMIN`, `MANAGER`, and `OPERATOR`. All user queries and mutations include the tenant ID from the signed JWT. DTO validation rejects unknown fields, including caller-supplied `tenantId` values.

Beekeeping business modules remain outside this foundation.
