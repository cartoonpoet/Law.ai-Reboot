-- CreateEnum
CREATE TYPE "shared"."CcType" AS ENUM ('user', 'dept');

-- CreateTable
CREATE TABLE "shared"."ContractReference" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "ccType" "shared"."CcType" NOT NULL,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "refId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractReference_contractId_idx" ON "shared"."ContractReference"("contractId");

-- AddForeignKey
ALTER TABLE "shared"."ContractReference" ADD CONSTRAINT "ContractReference_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"."Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

