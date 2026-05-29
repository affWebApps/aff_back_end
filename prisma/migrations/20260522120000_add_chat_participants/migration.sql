-- AlterTable: add user1_id, user2_id, created_at to chats
ALTER TABLE "chats" ADD COLUMN "user1_id" TEXT NOT NULL DEFAULT '',
                    ADD COLUMN "user2_id" TEXT NOT NULL DEFAULT '',
                    ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_user1_id_fkey" FOREIGN KEY ("user1_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chats" ADD CONSTRAINT "chats_user2_id_fkey" FOREIGN KEY ("user2_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "chats_user1_id_user2_id_key" ON "chats"("user1_id", "user2_id");
