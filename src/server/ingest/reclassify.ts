import { prisma } from "@/lib/prisma";
import { experienceFrom } from "@/lib/job-taxonomy";
import { classifyJob } from "./job-classifier";

/** À changer quand le classement évolue : les offres déjà en base sont alors reclassées une fois. */
export const CLASSIFIER_VERSION = "unified-barista-2026-11-08";
const SETTING_KEY = "classifierVersion";
const BATCH = 300;

/**
 * Applique le classement courant (domaine, métier, spécialité, expérience) aux
 * offres déjà stockées, une seule fois par version. Une offre que le
 * classement ne reconnaît plus est laissée telle quelle : on ne supprime rien.
 */
export async function ensureClassification(): Promise<{ reclassified: number } | null> {
  const setting = await prisma.siteSetting.findUnique({ where: { key: SETTING_KEY } });
  const current = setting?.value as { version?: string } | null | undefined;
  if (current?.version === CLASSIFIER_VERSION) return null;

  let reclassified = 0;
  let cursor: string | undefined;
  for (;;) {
    const offers = await prisma.jobOffer.findMany({
      take: BATCH,
      orderBy: { id: "asc" },
      include: { company: true },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (!offers.length) break;
    for (const offer of offers) {
      const job = classifyJob(offer.title, offer.description, {
        company: offer.company.name,
        sector: offer.sector,
        contract: offer.contractType,
      });
      if (job.universe === "OTHER") continue;
      const data = {
        universe: job.universe,
        jobFamily: job.family,
        experienceLevel: experienceFrom(offer.title, offer.description),
        ...(job.universe === "TECH" ? { specialty: job.specialty } : {}),
      };
      const unchanged =
        offer.universe === data.universe &&
        offer.jobFamily === data.jobFamily &&
        offer.experienceLevel === data.experienceLevel &&
        (!("specialty" in data) || offer.specialty === data.specialty);
      if (unchanged) continue;
      await prisma.jobOffer.update({ where: { id: offer.id }, data });
      reclassified++;
    }
    cursor = offers.at(-1)!.id;
  }
  // Avant la V3, une date de publication connue différait toujours de la date de création.
  await prisma.$executeRaw`UPDATE "job_offers" SET "publicationKnown" = true WHERE "publicationKnown" = false AND ABS(EXTRACT(EPOCH FROM ("publishedAt" - "createdAt"))) > 120`;
  await prisma.siteSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: { version: CLASSIFIER_VERSION } },
    update: { value: { version: CLASSIFIER_VERSION } },
  });
  return { reclassified };
}
