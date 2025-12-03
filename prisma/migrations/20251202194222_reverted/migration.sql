/*
  Warnings:

  - The `content` column on the `project_requirements` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "project_requirements" DROP COLUMN "content",
ADD COLUMN     "content" JSONB;
