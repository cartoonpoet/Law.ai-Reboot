-- CreateEnum
CREATE TYPE "contracts"."AdviceMessageState" AS ENUM ('published', 'pendingApproval', 'rejected');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "contracts"."AdviceStatus" ADD VALUE 'requestApproval';
ALTER TYPE "contracts"."AdviceStatus" ADD VALUE 'requestRejected';
ALTER TYPE "contracts"."AdviceStatus" ADD VALUE 'answerApproval';

-- AlterTable
ALTER TABLE "contracts"."AdviceMessage" ADD COLUMN     "state" "contracts"."AdviceMessageState" NOT NULL DEFAULT 'published';
