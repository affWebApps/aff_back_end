-- AlterTable: add unique constraint on team_members.name
CREATE UNIQUE INDEX "team_members_name_key" ON "team_members"("name");
