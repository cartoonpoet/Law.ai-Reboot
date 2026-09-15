-- AlterTable
ALTER TABLE "users"."User" ADD COLUMN     "notifyApproval" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyComment" BOOLEAN NOT NULL DEFAULT true;
