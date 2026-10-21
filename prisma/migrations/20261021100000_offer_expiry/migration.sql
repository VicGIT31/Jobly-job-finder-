ALTER TABLE "job_offers" ADD COLUMN "validThrough" TIMESTAMP(3);
CREATE INDEX "job_offers_status_validThrough_idx" ON "job_offers"("status", "validThrough");
