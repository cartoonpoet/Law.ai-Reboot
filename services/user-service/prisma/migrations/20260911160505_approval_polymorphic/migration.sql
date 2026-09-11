/*
  Warnings:

  - You are about to drop the column `contractId` on the `ApprovalLine` table. All the data in the column will be lost.
  - Added the required column `submittedById` to the `ApprovalLine` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetId` to the `ApprovalLine` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetType` to the `ApprovalLine` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `ApprovalLine` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `ApprovalLine` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "shared"."ApprovalLine" DROP CONSTRAINT "ApprovalLine_contractId_fkey";

-- DropIndex
DROP INDEX "shared"."ApprovalLine_contractId_idx";

-- AlterTable
ALTER TABLE "shared"."ApprovalLine" DROP COLUMN "contractId",
ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "submittedById" TEXT NOT NULL,
ADD COLUMN     "targetId" TEXT NOT NULL,
ADD COLUMN     "targetType" TEXT NOT NULL,
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "shared"."ApprovalStep" ADD COLUMN     "comment" TEXT,
ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "ApprovalLine_targetType_targetId_idx" ON "shared"."ApprovalLine"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ApprovalLine_status_idx" ON "shared"."ApprovalLine"("status");

-- CreateIndex
CREATE INDEX "ApprovalStep_userId_status_idx" ON "shared"."ApprovalStep"("userId", "status");

-- AddForeignKey
ALTER TABLE "shared"."ApprovalLine" ADD CONSTRAINT "ApprovalLine_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared"."ApprovalStep" ADD CONSTRAINT "ApprovalStep_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
