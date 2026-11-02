ALTER TYPE "ContractType" ADD VALUE IF NOT EXISTS 'UNKNOWN';
ALTER TYPE "ContractType" ADD VALUE IF NOT EXISTS 'INTERIM';
ALTER TYPE "RemotePolicy" ADD VALUE IF NOT EXISTS 'UNKNOWN';
ALTER TYPE "OfferStatus" ADD VALUE IF NOT EXISTS 'UNCERTAIN';
ALTER TABLE "job_offers"
  ADD COLUMN "universe" TEXT NOT NULL DEFAULT 'TECH',
  ADD COLUMN "jobFamily" TEXT NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "experienceLevel" TEXT NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "qualificationText" TEXT,
  ADD COLUMN "salaryPeriod" TEXT NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "publicationKnown" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "locationPrecise" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "remoteKnown" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "linkCheckedAt" TIMESTAMP(3),
  ADD COLUMN "linkStatus" INTEGER;
CREATE INDEX "job_offers_universe_status_jobFamily_idx" ON "job_offers"("universe", "status", "jobFamily");
CREATE TABLE "offer_origins" (
  "id" TEXT NOT NULL,
  "offerId" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "sourceSite" TEXT NOT NULL,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastVerifiedAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT "offer_origins_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "offer_origins_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "job_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "offer_origins_sourceUrl_key" ON "offer_origins"("sourceUrl");
CREATE INDEX "offer_origins_offerId_idx" ON "offer_origins"("offerId");
