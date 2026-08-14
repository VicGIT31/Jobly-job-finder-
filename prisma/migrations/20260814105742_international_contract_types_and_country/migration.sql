-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContractType" ADD VALUE 'FULL_TIME';
ALTER TYPE "ContractType" ADD VALUE 'PART_TIME';
ALTER TYPE "ContractType" ADD VALUE 'CONTRACT';
ALTER TYPE "ContractType" ADD VALUE 'FREELANCE';

-- AlterTable
ALTER TABLE "job_offers" ADD COLUMN     "countryCode" TEXT NOT NULL DEFAULT 'FR';

-- CreateIndex
CREATE INDEX "job_offers_countryCode_status_idx" ON "job_offers"("countryCode", "status");
