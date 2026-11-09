ALTER TABLE "job_offers" ADD COLUMN "siteLabel" TEXT;
ALTER TABLE "job_offers" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE INDEX "job_offers_tags_idx" ON "job_offers" USING GIN ("tags");
CREATE TABLE "offer_locations" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "offerId" TEXT NOT NULL REFERENCES "job_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "city" TEXT NOT NULL,
 "countryCode" TEXT NOT NULL DEFAULT 'FR',
 "latitude" DOUBLE PRECISION,
 "longitude" DOUBLE PRECISION
);
CREATE UNIQUE INDEX "offer_locations_offerId_city_countryCode_key" ON "offer_locations"("offerId", "city", "countryCode");
CREATE INDEX "offer_locations_latitude_longitude_idx" ON "offer_locations"("latitude", "longitude");
ALTER TABLE "ingest_runs" ADD COLUMN "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ingest_runs" ADD COLUMN "cycleId" TEXT;
-- Historical startedAt was written when the run finished.
UPDATE "ingest_runs" SET "completedAt" = "startedAt", "startedAt" = "startedAt" - "durationMs" * INTERVAL '1 millisecond';
