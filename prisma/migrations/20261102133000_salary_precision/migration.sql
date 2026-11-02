-- Keep fractional hourly amounts; converting existing integers is lossless.
ALTER TABLE "job_offers"
  ALTER COLUMN "salaryMin" TYPE DOUBLE PRECISION USING "salaryMin"::DOUBLE PRECISION,
  ALTER COLUMN "salaryMax" TYPE DOUBLE PRECISION USING "salaryMax"::DOUBLE PRECISION;
