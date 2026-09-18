-- AlterTable
ALTER TABLE "shared"."File" ADD COLUMN     "adviceId" TEXT,
ALTER COLUMN "contractId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "File_adviceId_idx" ON "shared"."File"("adviceId");

-- AddForeignKey
ALTER TABLE "shared"."File" ADD CONSTRAINT "File_adviceId_fkey" FOREIGN KEY ("adviceId") REFERENCES "contracts"."Advice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
