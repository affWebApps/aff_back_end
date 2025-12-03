/*
  Warnings:

  - The `status` column on the `bids` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('APPROVED', 'PENDING', 'REJECTED');

-- AlterTable
ALTER TABLE "bids" DROP COLUMN "status",
ADD COLUMN     "status" "BidStatus" NOT NULL DEFAULT 'PENDING';
