-- AlterTable
ALTER TABLE "projects" ADD COLUMN "assigned_tailor_id" TEXT;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_assigned_tailor_id_fkey" FOREIGN KEY ("assigned_tailor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
