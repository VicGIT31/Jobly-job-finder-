/**
 * Rétro-remplissage des coordonnées des offres sans lat/lng, ville par ville
 * (table statique + API adresse.data.gouv.fr), puis ré-indexation Meilisearch.
 * Usage : npm run geo:backfill
 */
import { PrismaClient } from "@prisma/client";
import { geocodeCityFull } from "../src/server/ingest/sources/geocode";
import { syncOffersToSearch } from "../src/server/search/sync";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const cities = await prisma.jobOffer.groupBy({
    by: ["city"],
    where: { latitude: null },
    _count: true,
  });
  console.log(`📍 ${cities.length} ville(s) sans coordonnées à géocoder…`);

  let updated = 0;
  let unknown = 0;
  for (const { city, _count } of cities) {
    const geo = await geocodeCityFull(city);
    if (!geo) {
      unknown++;
      console.log(`  ✗ ${city} : introuvable (${_count} offre(s) laissée(s) sans géo)`);
      continue;
    }
    await prisma.jobOffer.updateMany({
      where: { city, latitude: null },
      data: { latitude: geo.lat, longitude: geo.lng },
    });
    updated += _count;
    console.log(`  ✔ ${city} : ${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)} (${_count} offre(s))`);
  }

  console.log(`📍 Ré-indexation des offres géocodées…`);
  const offers = await prisma.jobOffer.findMany({
    where: { latitude: { not: null } },
    include: { company: true },
  });
  await syncOffersToSearch(offers);

  console.log(`📍 Terminé : ${updated} offre(s) géocodée(s), ${unknown} ville(s) inconnue(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
