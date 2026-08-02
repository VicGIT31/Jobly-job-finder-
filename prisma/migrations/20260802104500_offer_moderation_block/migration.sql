-- Modération persistante : une offre bloquée par un administrateur ne doit pas
-- être réactivée par le cycle d'ingestion suivant.

-- AlterTable
ALTER TABLE "job_offers" ADD COLUMN "blockedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "job_offers_blockedAt_idx" ON "job_offers"("blockedAt");
