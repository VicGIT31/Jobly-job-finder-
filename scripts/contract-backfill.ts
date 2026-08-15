/**
 * Corrige les offres HelloWork déjà en base mal classées stage/alternance.
 * Usage : `npm run contract:backfill`
 *
 * Cause : `sources/hellowork.ts` consultait le champ structuré schema.org
 * `employmentType` avant le texte du titre/description — or HelloWork expose
 * « INTERN » aussi bien pour les stages que pour les alternances, alors que
 * le titre le dit explicitement (« Alternance … » vs « Stage … »). Corrigé
 * dans le connecteur (le texte prime désormais) ; ce script corrige les
 * offres déjà ingérées avant le correctif, qui ne seraient sinon pas
 * réparées avant leur prochain passage complet dans le connecteur.
 *
 * Scope volontairement restreint à HelloWork + STAGE/ALTERNANCE existant :
 * `inferContractType` est un heuristique de vocabulaire français, l'appliquer
 * à d'autres sources (ex. offres internationales des boards ATS) risquerait
 * de reclasser à tort des offres qui n'ont jamais utilisé ce vocabulaire.
 */
import { ContractType, PrismaClient } from "@prisma/client";
import { inferContractType } from "../src/server/ingest/enrich";
import { syncOffersToSearch } from "../src/server/search/sync";

const prisma = new PrismaClient();
const BATCH = 200;

function toContractType(inferred: string): ContractType {
  return inferred === "alternance" ? "ALTERNANCE" : "STAGE";
}

async function main(): Promise<void> {
  const where = {
    sourceSite: "hellowork.com",
    contractType: { in: [ContractType.STAGE, ContractType.ALTERNANCE] },
  };
  const total = await prisma.jobOffer.count({ where });
  console.log(`🏷️  Vérification de ${total} offre(s) HelloWork stage/alternance…`);

  let processed = 0;
  let changed = 0;

  for (let skip = 0; skip < total; skip += BATCH) {
    const offers = await prisma.jobOffer.findMany({
      where,
      skip,
      take: BATCH,
      orderBy: { id: "asc" },
      include: { company: true },
    });
    if (offers.length === 0) break;

    const updated: typeof offers = [];
    for (const offer of offers) {
      processed++;
      const inferred = inferContractType(offer.title, offer.description.slice(0, 1200));
      if (!inferred) continue;
      const contractType = toContractType(inferred);
      if (contractType === offer.contractType) continue;

      await prisma.jobOffer.update({ where: { id: offer.id }, data: { contractType } });
      updated.push({ ...offer, contractType });
      changed++;
      console.log(`  ${offer.contractType} → ${contractType} : ${offer.title.slice(0, 70)}`);
    }

    if (updated.length > 0) {
      try {
        await syncOffersToSearch(updated);
      } catch (err) {
        console.error("  ⚠ Ré-indexation du lot échouée :", err);
      }
    }
    console.log(`  … ${processed}/${total}`);
  }

  console.log(`\n✅ ${changed} offre(s) corrigée(s) sur ${processed} vérifiée(s).`);
}

main()
  .catch((err) => {
    console.error("❌ Correction impossible :", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
