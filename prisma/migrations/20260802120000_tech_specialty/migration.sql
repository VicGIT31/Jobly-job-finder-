-- Spécialité tech des offres (IA, cybersécurité, web, devops, software, réseaux).
-- Déduite du titre et de la description à l'ingestion ; les offres déjà en base
-- sont reclassées par `npm run specialty:backfill`.

-- CreateEnum
CREATE TYPE "TechSpecialty" AS ENUM ('IA', 'CYBERSECURITE', 'WEB', 'DEVOPS', 'SOFTWARE', 'RESEAUX', 'AUTRE');

-- AlterTable
ALTER TABLE "job_offers" ADD COLUMN "specialty" "TechSpecialty" NOT NULL DEFAULT 'AUTRE';

-- CreateIndex
CREATE INDEX "job_offers_specialty_status_idx" ON "job_offers"("specialty", "status");
