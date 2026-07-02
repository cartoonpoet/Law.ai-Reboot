-- CreateEnum
CREATE TYPE "shared"."FileRole" AS ENUM ('contract', 'attach', 'ref');

-- CreateTable
CREATE TABLE "shared"."File" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "role" "shared"."FileRole" NOT NULL,
    "name" TEXT NOT NULL,
    "meta" TEXT,
    "size" INTEGER,
    "mimeType" TEXT,
    "storageKey" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "File_contractId_idx" ON "shared"."File"("contractId");

-- AddForeignKey
ALTER TABLE "shared"."File" ADD CONSTRAINT "File_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"."Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

