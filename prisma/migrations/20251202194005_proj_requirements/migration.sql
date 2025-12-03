/*
  Warnings:

  - Made the column `content` on table `project_requirements` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "project_requirements" ALTER COLUMN "content" SET NOT NULL,
ALTER COLUMN "content" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
