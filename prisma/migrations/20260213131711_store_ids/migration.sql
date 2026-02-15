/*
  Warnings:

  - You are about to drop the column `vendure_customer_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `vendure_vendor_id` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "vendure_customer_id",
DROP COLUMN "vendure_vendor_id",
ADD COLUMN     "customer_id" TEXT,
ADD COLUMN     "vendor_id" TEXT;
