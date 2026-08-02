/**
 * Reclasse les offres déjà en base dans leur spécialité tech, puis ré-indexe
 * celles qui ont changé. Usage : `npm run specialty:backfill`
 *
 * À relancer après toute évolution des règles de `server/ingest/classify.ts` :
 * l'ingestion reclasse les offres qu'elle revoit, mais une offre qui a disparu
 * de sa source garderait sinon son ancienne étiquette.
 */
import { PrismaClient, type TechSpecialty } from "@prisma/client";
import { classifySpecialty } from "../src/server/ingest/classify";
import { syncOffersToSearch } from "../src/server/search/sync";

const prisma = new PrismaClient();
const BATCH = 200;

async function main(): Promise<void> {
  const total = await prisma.jobOffer.count();
  console.log(`🏷️  Reclassement de ${total} offre(s)…`);

  const counts = new Map<TechSpecialty, number>();
  let processed = 0;
  let changed = 0;

  for (let skip = 0; skip < total; skip += BATCH) {
    const offers = await prisma.jobOffer.findMany({
      skip,
      take: BATCH,
      orderBy: { id: "asc" },
      include: { company: true },
    });
    if (offers.length === 0) break;

    const updated: typeof offers = [];
    for (const offer of offers) {
      const specialty = classifySpecialty(offer.title, offer.description);
      counts.set(specialty, (counts.get(specialty) ?? 0) + 1);
      processed++;
      if (specialty === offer.specialty) continue;

      await prisma.jobOffer.update({ where: { id: offer.id }, data: { specialty } });
      updated.push({ ...offer, specialty });
      changed++;
    }

    // Ré-indexation par lot : la facette « spécialité » vient de Meilisearch.
    if (updated.length > 0) {
      try {
        await syncOffersToSearch(updated);
      } catch (err) {
        console.error("  ⚠ Ré-indexation du lot échouée :", err);
      }
    }
    console.log(`  … ${processed}/${total}`);
  }

  console.log(`\n✅ ${changed} offre(s) reclassée(s). Répartition :`);
  for (const [specialty, count] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    const share = ((count / Math.max(processed, 1)) * 100).toFixed(1);
    console.log(`   ${specialty.padEnd(14)} ${String(count).padStart(5)}  (${share} %)`);
  }
}

main()
  .catch((err) => {
    console.error("❌ Reclassement impossible :", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
