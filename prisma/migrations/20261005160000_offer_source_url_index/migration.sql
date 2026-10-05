CREATE INDEX "job_offers_sourceUrl_idx" ON "job_offers"("sourceUrl");
ALTER TABLE "ingest_runs" ADD COLUMN "coverageJson" JSONB;
