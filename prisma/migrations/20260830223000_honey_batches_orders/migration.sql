-- CreateEnum
CREATE TYPE "HoneyQuality" AS ENUM ('STANDARD', 'PREMIUM');

-- CreateEnum
CREATE TYPE "HoneyBatchStatus" AS ENUM ('AVAILABLE', 'DEPLETED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "honey_batches" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "production_cycle_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "production_date" DATE NOT NULL,
    "quantity_kg" DECIMAL(10,2) NOT NULL,
    "available_quantity_kg" DECIMAL(10,2) NOT NULL,
    "quality" "HoneyQuality" NOT NULL,
    "status" "HoneyBatchStatus" NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "honey_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_document" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "total" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "honey_batch_id" UUID NOT NULL,
    "quantity_kg" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "honey_batches_tenant_id_production_cycle_id_idx" ON "honey_batches"("tenant_id", "production_cycle_id");

-- CreateIndex
CREATE INDEX "honey_batches_tenant_id_status_idx" ON "honey_batches"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "honey_batches_id_tenant_id_key" ON "honey_batches"("id", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "honey_batches_tenant_id_code_key" ON "honey_batches"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "orders_tenant_id_created_at_idx" ON "orders"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_tenant_id_status_idx" ON "orders"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "orders_id_tenant_id_key" ON "orders"("id", "tenant_id");

-- CreateIndex
CREATE INDEX "order_items_tenant_id_order_id_idx" ON "order_items"("tenant_id", "order_id");

-- CreateIndex
CREATE INDEX "order_items_tenant_id_honey_batch_id_idx" ON "order_items"("tenant_id", "honey_batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_order_id_honey_batch_id_key" ON "order_items"("order_id", "honey_batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "production_cycles_id_tenant_id_key" ON "production_cycles"("id", "tenant_id");

-- AddForeignKey
ALTER TABLE "honey_batches" ADD CONSTRAINT "honey_batches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "honey_batches" ADD CONSTRAINT "honey_batches_production_cycle_id_tenant_id_fkey" FOREIGN KEY ("production_cycle_id", "tenant_id") REFERENCES "production_cycles"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_tenant_id_fkey" FOREIGN KEY ("order_id", "tenant_id") REFERENCES "orders"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_honey_batch_id_tenant_id_fkey" FOREIGN KEY ("honey_batch_id", "tenant_id") REFERENCES "honey_batches"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
