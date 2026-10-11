/*
  Warnings:

  - You are about to drop the column `customer_document` on the `orders` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "orders" DROP COLUMN "customer_document",
ADD COLUMN     "customer_phone" TEXT;
