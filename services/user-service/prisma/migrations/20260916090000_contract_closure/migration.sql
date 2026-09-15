-- CreateEnum
CREATE TYPE "contracts"."ContractClosedReason" AS ENUM ('completed', 'expired', 'renewed', 'terminated');

-- AlterTable
ALTER TABLE "contracts"."Contract" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "closedNote" TEXT,
ADD COLUMN     "closedReason" "contracts"."ContractClosedReason",
ADD COLUMN     "originContractId" TEXT;

-- CreateIndex
CREATE INDEX "Contract_originContractId_idx" ON "contracts"."Contract"("originContractId");

-- AddForeignKey
ALTER TABLE "contracts"."Contract" ADD CONSTRAINT "Contract_originContractId_fkey" FOREIGN KEY ("originContractId") REFERENCES "contracts"."Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

