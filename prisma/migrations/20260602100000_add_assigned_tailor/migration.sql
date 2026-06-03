-- AlterTable
ALTER TABLE "projects" ADD "assigned_tailor_id" TEXT DEFAULT NULL;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_assigned_tailor_id_fkey" FOREIGN KEY ("assigned_tailor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
