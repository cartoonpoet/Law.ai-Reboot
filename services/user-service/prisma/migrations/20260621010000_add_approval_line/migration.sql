-- CreateEnum
CREATE TYPE "shared"."ApproverType" AS ENUM ('draft', 'approve', 'agree', 'refer');

-- CreateEnum
CREATE TYPE "shared"."ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "shared"."StepStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "shared"."ApprovalLine" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "status" "shared"."ApprovalStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared"."ApprovalStep" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "dept" TEXT NOT NULL,
    "type" "shared"."ApproverType" NOT NULL,
    "status" "shared"."StepStatus" NOT NULL DEFAULT 'pending',

    CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApprovalLine_contractId_idx" ON "shared"."ApprovalLine"("contractId");

-- CreateIndex
CREATE INDEX "ApprovalStep_lineId_idx" ON "shared"."ApprovalStep"("lineId");

-- AddForeignKey
ALTER TABLE "shared"."ApprovalLine" ADD CONSTRAINT "ApprovalLine_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"."Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared"."ApprovalStep" ADD CONSTRAINT "ApprovalStep_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "shared"."ApprovalLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

