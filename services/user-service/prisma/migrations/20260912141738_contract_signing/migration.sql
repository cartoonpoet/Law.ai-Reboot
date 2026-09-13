-- AlterEnum
ALTER TYPE "shared"."FileRole" ADD VALUE 'signed';

-- AlterTable
ALTER TABLE "contracts"."Contract" ADD COLUMN     "signedAt" TIMESTAMP(3);
