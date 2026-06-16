-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('company', 'individual');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "type" "CompanyType" NOT NULL DEFAULT 'company',
    "name" TEXT NOT NULL,
    "bizNo" TEXT NOT NULL,
    "ceo" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "addressDetail" TEXT,
    "managerName" TEXT,
    "managerPhone" TEXT,
    "managerEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_bizNo_key" ON "Company"("bizNo");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company"("name");
