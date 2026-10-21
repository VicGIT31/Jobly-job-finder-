/**
 * Reclasse les offres déjà en base dans leur spécialité tech, puis ré-indexe
 * celles qui ont changé. Usage : `npm run specialty:backfill`
 *
 * À relancer après toute évolution des règles de `server/ingest/classify.ts` :
 * l'ingestion reclasse les offres qu'elle revoit, mais une offre qui a disparu
 * de sa source garderait sinon son ancienne étiquette.
 */
import "./load-env";
import { mkdir, writeFile } from "node:fs/promises";
import { PrismaClient, type TechSpecialty } from "@prisma/client";
import { classifySpecialty, explainSpecialty } from "../src/server/ingest/classify";
import { syncOffersToSearch } from "../src/server/search/sync";

const prisma = new PrismaClient();
const BATCH = 200;

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const changes: unknown[] = [];
  let cursor: string | undefined;
  const total = await prisma.jobOffer.count();
  console.log(`🏷️  Reclassement de ${total} offre(s)…`);

  const counts = new Map<TechSpecialty, number>();
  let processed = 0;
  let changed = 0;

  for (let skip = 0; skip < total; skip += BATCH) {
    const offers = await prisma.jobOffer.findMany({
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: BATCH,
      orderBy: { id: "asc" },
      include: { company: true },
    });
    if (offers.length === 0) break;
    cursor = offers.at(-1)!.id;

    const updated: typeof offers = [];
    for (const offer of offers) {
      const specialty = classifySpecialty(offer.title, offer.description);
      counts.set(specialty, (counts.get(specialty) ?? 0) + 1);
      processed++;
      if (specialty === offer.specialty) continue;

      changes.push({
        id: offer.id,
        title: offer.title,
        before: offer.specialty,
        after: specialty,
        sourceUrl: offer.sourceUrl,
        classification: explainSpecialty(offer.title, offer.description),
      });
      if (!dryRun) {
        const result = await prisma.jobOffer.updateMany({
          where: { id: offer.id, title: offer.title, description: offer.description },
          data: { specialty },
        });
        if (!result.count) continue;
      }
      updated.push({ ...offer, specialty });
      changed++;
    }

    // Ré-indexation par lot : la facette « spécialité » vient de Meilisearch.
    if (!dryRun && updated.length > 0) await syncOffersToSearch(updated);
    console.log(`  … ${processed}/${total}`);
  }

  await mkdir("reports", { recursive: true });
  const report = `reports/specialty-${dryRun ? "preview" : "applied"}-${Date.now()}.json`;
  await writeFile(
    report,
    JSON.stringify({ at: new Date(), dryRun, processed, changed, changes }, null, 2),
  );
  console.log(`Rapport : ${report}`);
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
