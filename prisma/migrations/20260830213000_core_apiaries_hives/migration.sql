-- CreateEnum
CREATE TYPE "QueenStatus" AS ENUM ('PRESENT', 'ABSENT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ColonyStatus" AS ENUM ('STRONG', 'MODERATE', 'WEAK', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ProductionCycleStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "apiaries" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apiaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hives" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "apiary_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "queen_status" "QueenStatus" NOT NULL DEFAULT 'UNKNOWN',
    "colony_status" "ColonyStatus" NOT NULL DEFAULT 'MODERATE',
    "installation_date" DATE NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_cycles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "hive_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "status" "ProductionCycleStatus" NOT NULL DEFAULT 'PLANNED',
    "estimated_production_kg" DECIMAL(10,2),
    "actual_production_kg" DECIMAL(10,2),
    "notes" TEXT,

    CONSTRAINT "production_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "apiaries_tenant_id_idx" ON "apiaries"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "apiaries_id_tenant_id_key" ON "apiaries"("id", "tenant_id");

-- CreateIndex
CREATE INDEX "hives_tenant_id_apiary_id_idx" ON "hives"("tenant_id", "apiary_id");

-- CreateIndex
CREATE INDEX "hives_tenant_id_colony_status_idx" ON "hives"("tenant_id", "colony_status");

-- CreateIndex
CREATE UNIQUE INDEX "hives_id_tenant_id_key" ON "hives"("id", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "hives_tenant_id_code_key" ON "hives"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "production_cycles_tenant_id_hive_id_idx" ON "production_cycles"("tenant_id", "hive_id");

-- CreateIndex
CREATE INDEX "production_cycles_tenant_id_status_idx" ON "production_cycles"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "apiaries" ADD CONSTRAINT "apiaries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hives" ADD CONSTRAINT "hives_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hives" ADD CONSTRAINT "hives_apiary_id_tenant_id_fkey" FOREIGN KEY ("apiary_id", "tenant_id") REFERENCES "apiaries"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_cycles" ADD CONSTRAINT "production_cycles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_cycles" ADD CONSTRAINT "production_cycles_hive_id_tenant_id_fkey" FOREIGN KEY ("hive_id", "tenant_id") REFERENCES "hives"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;
