-- AlterTable
ALTER TABLE "enquiries" ADD COLUMN     "handled_by_id" UUID;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_handled_by_id_fkey" FOREIGN KEY ("handled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
