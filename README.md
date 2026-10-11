# Honey Manager Backend

Production-like MVP backend for a multi-tenant B2B beekeeping management SaaS. It is a NestJS modular monolith using PostgreSQL, Prisma, Redis, JWT, Jest, and OpenAPI.

## Requirements

- Node.js 20.19 or newer
- npm 10 or newer
- Docker and Docker Compose (recommended for PostgreSQL and Redis)

## Local setup

Copy the development template, install dependencies, start infrastructure, migrate, and seed:

```bash
cp .env.development.example .env
npm ci
docker compose up -d --wait postgres redis
npm run prisma:deploy
npm run prisma:seed
npm run start:dev
```

On PowerShell, replace the first command with:

```powershell
Copy-Item .env.development.example .env
```

GNU Make users can run `make setup`, `make seed`, and `make dev` after creating `.env`.

The API is available at `http://localhost:3000/api/v1`. Swagger UI and JSON are available at `http://localhost:3000/docs` and `http://localhost:3000/docs-json` when enabled. Health is exposed at `GET /api/v1/health`.

Demo credentials after seeding are `admin@serradourada.test` / `DemoPassword123!` for tenant slug `serra-dourada`. Seed credentials are for local demonstration only.

## Environment configuration

Configuration is loaded from the first available value in this order: process environment, `.env.<NODE_ENV>.local`, `.env.<NODE_ENV>`, `.env.local`, then `.env`. Committed templates document each profile:

- `.env.development.example`: local development with Swagger enabled.
- `.env.test.example`: disposable PostgreSQL integration database.
- `.env.staging.example`: staging service placeholders with Swagger enabled.
- `.env.production.example`: production placeholders with Swagger disabled.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | No | `development`, `test`, `staging`, or `production`; defaults to `development`. |
| `PORT` | No | HTTP port; defaults to `3000`. |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma. |
| `REDIS_URL` | Yes | Redis connection string. |
| `JWT_SECRET` | Yes | Access-token signing secret, at least 32 characters. |
| `JWT_EXPIRES_IN` | No | Access-token lifetime in seconds; defaults to `900`. |
| `CORS_ORIGIN` | No | Comma-separated allowed origins. |
| `SWAGGER_ENABLED` | No | Enables `/docs` and `/docs-json`; disable in production unless required. |
| `POSTGRES_DB` | Compose | Local Compose database name. |
| `POSTGRES_PASSWORD` | Compose | Local Compose PostgreSQL password. |
| `TEST_DATABASE_URL` | Tests | Optional integration URL; database name must end in `_test`. |

Never commit populated `.env` files. Staging and production secrets belong in the deployment platform's secret manager.

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
npm run test:integration
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:seed
npm run prisma:studio
```

`test:integration` starts a temporary PostgreSQL 16 container on port `5433`, deploys migrations, and tests real authentication, tenant isolation, inventory deduction, idempotency, and transaction rollback. The runner refuses database names that do not end in `_test`.

Use `prisma:migrate` while developing schema changes and `prisma:deploy` in deployed environments. The seed is deterministic and idempotent.

## Structure

```text
src/
  apiaries/            Tenant-scoped apiary CRUD
  auth/                JWT authentication and authorization
  common/              Exception handling, structured HTTP logs, Swagger helpers
  config/              Validated environment configuration
  database/            Global Prisma integration
  hives/               Tenant-scoped hive management
  honey-batches/       Production inventory and traceability
  orders/              Orders and serializable inventory transactions
  production-cycles/   Hive production lifecycle
  redis/               Global lazy Redis integration
  tenancy/             Request-local tenant context from signed JWT claims
prisma/
  migrations/          Versioned PostgreSQL migrations
  schema.prisma        Shared-schema relational model
  seed.ts              Realistic two-tenant demo data
test/
  app.e2e-spec.ts              HTTP and OpenAPI smoke tests
  backend.integration-spec.ts  Real PostgreSQL behavior tests
```

## Multitenancy

The shared-schema strategy uses a `tenantId` foreign key on tenant-owned records. The JWT payload includes `tenantId`, and the global tenant interceptor stores that signed claim in `TenantContextService` for the duration of each request.

Future repositories and services should always obtain the tenant with `TenantContextService.requireTenantId()` and include it in every tenant-owned Prisma query. Do not accept tenant identity from request headers or request bodies.

Composite foreign keys include `tenantId`, preventing cross-tenant relationships at the database layer. Integration tests additionally prove that one tenant cannot list or retrieve another tenant's records.

## Authentication and users

- `POST /api/v1/auth/register` creates a tenant and its initial `ADMIN` user.
- `POST /api/v1/auth/login` authenticates with `tenantSlug`, email, and password.
- `GET /api/v1/auth/me` returns the authenticated tenant-scoped user.
- `POST /api/v1/users` creates a user (`ADMIN` only).
- `GET /api/v1/users` and `GET /api/v1/users/:id` list/read users (`ADMIN` or `MANAGER`).
- `PATCH /api/v1/users/:id` and `DELETE /api/v1/users/:id` modify users (`ADMIN` only).

Roles are `ADMIN`, `MANAGER`, and `OPERATOR`. All user queries and mutations include the tenant ID from the signed JWT. DTO validation rejects unknown fields, including caller-supplied `tenantId` values.

## Core beekeeping API

Authenticated CRUD endpoints are available at:

- `/api/v1/apiaries`
- `/api/v1/hives`
- `/api/v1/production-cycles`

`ADMIN` and `MANAGER` can create, update, and delete records. `OPERATOR` can read records. All queries and relationships are scoped to the tenant from the signed JWT.

Hives support `GET /api/v1/hives?apiaryId=<uuid>&status=<status>`. Colony statuses are `STRONG`, `MODERATE`, `WEAK`, and `INACTIVE`; queen statuses are `PRESENT`, `ABSENT`, and `UNKNOWN`.

Production cycle statuses are `PLANNED`, `ACTIVE`, `COMPLETED`, and `CANCELLED`. Completed cycles require an end date and actual production, and a hive can have only one active cycle.

## Production and commercial API

- `/api/v1/honey-batches` provides tenant-scoped batch CRUD.
- `POST /api/v1/orders` creates a pending order and calculates item subtotals and the total.
- `GET /api/v1/orders` and `GET /api/v1/orders/:id` provide order listing and full batch-to-hive traceability.
- `PATCH /api/v1/orders/:id/status` confirms or cancels a pending order.

Honey quality values are `STANDARD` and `PREMIUM`. Batch statuses are `AVAILABLE`, `DEPLETED`, and `BLOCKED`; availability is managed by the API and cannot become negative. Order statuses are `PENDING`, `CONFIRMED`, and `CANCELLED`. Confirmation deducts every item in one serializable database transaction, and finalized orders cannot change status.

## Dashboard and Redis

- `GET /api/v1/dashboard/summary` returns tenant totals for apiaries, hives, active hives, active production cycles, available honey stock, and pending orders.
- `GET /api/v1/dashboard/production?period=month` groups produced honey by `day`, `month`, or `year`.

Dashboard responses are cached in Redis for 60 seconds with tenant-specific keys. Mutations invalidate the affected tenant's dashboard cache. Redis Pub/Sub channel `domain-events` receives `hive.created`, `production.completed`, `honey-batch.created`, and `order.confirmed` event envelopes. Redis failures are logged and do not fail database mutations or dashboard queries.

## Notifications and audit logs

- `GET /api/v1/notifications` lists notifications for the authenticated user.
- `PATCH /api/v1/notifications/:id/read` marks an owned notification as read.
- `GET /api/v1/audit-logs` lists tenant-scoped audit entries for `ADMIN` users.

User creation, hive creation and updates, production completion, honey batch creation, and order confirmation create an audit entry and notification. Audit attribution uses the user and tenant from the signed JWT; callers cannot supply either value.

## Operations

Every response includes an `x-request-id`; a supplied `x-request-id` is propagated. Structured HTTP logs contain request ID, method, path, status, duration, user agent, and signed tenant/user identity when authenticated. Passwords, tokens, and request bodies are not logged.

Docker Compose provides PostgreSQL 16 and Redis 7 with health checks, persistent development volumes, a migration job, and a production-image API service. Run `docker compose down -v` only when local data may be deleted.
