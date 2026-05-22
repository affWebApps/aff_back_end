-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "block_reason" TEXT,
ADD COLUMN     "blocked_at" TIMESTAMP(3),
ADD COLUMN     "blocked_by" TEXT,
ADD COLUMN     "is_blocked" BOOLEAN NOT NULL DEFAULT false;
