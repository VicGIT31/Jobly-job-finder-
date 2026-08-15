import { prisma } from "@/lib/prisma";
import {
  COLLECTIONS,
  slugMatchesCollection,
  type CollectionKey,
  type CollectionCompany,
  type ResolvedCollection,
} from "@/lib/company-collections";

/**
 * Résout les collections contre la base : une entreprise n'apparaît que si elle
 * a au moins une offre active. Une vitrine sans offre est masquée plutôt que
 * d'afficher des logos qui ne mènent nulle part.
 */
export async function resolveCollections(): Promise<ResolvedCollection[]> {
  const companies = await prisma.company.findMany({
    where: { offers: { some: { status: "ACTIVE" } } },
    select: {
      slug: true,
      name: true,
      logoUrl: true,
      _count: { select: { offers: { where: { status: "ACTIVE" } } } },
    },
  });

  return COLLECTIONS.map((collection) => {
    const matched: CollectionCompany[] = [];

    for (const company of companies) {
      if (!slugMatchesCollection(company.slug, collection)) continue;
      matched.push({
        slug: company.slug,
        name: company.name,
        logoUrl: company.logoUrl,
        offerCount: company._count.offers,
      });
    }

    matched.sort((a, b) => b.offerCount - a.offerCount || a.name.localeCompare(b.name));

    return {
      ...collection,
      companies: matched,
      totalOffers: matched.reduce((sum, c) => sum + c.offerCount, 0),
    };
  }).filter((collection) => collection.companies.length > 0);
}

/**
 * Slugs d'entreprise appartenant à une collection donnée, pour filtrer la
 * recherche d'offres (`pays`/`contrat`/… suivent le même motif : traduire un
 * filtre en une liste de valeurs à passer au moteur de recherche). Ne
 * restreint pas aux entreprises ayant une offre active : le moteur de
 * recherche filtre déjà sur `status = "ACTIVE"`, un slug sans offre active ne
 * change rien au résultat.
 */
export async function companySlugsForCollection(key: CollectionKey): Promise<string[]> {
  const collection = COLLECTIONS.find((c) => c.key === key);
  if (!collection) return [];

  const companies = await prisma.company.findMany({ select: { slug: true } });
  return companies.filter((c) => slugMatchesCollection(c.slug, collection)).map((c) => c.slug);
}
