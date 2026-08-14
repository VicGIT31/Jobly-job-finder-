import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMeili, OFFERS_INDEX } from "@/lib/meilisearch";
import { dateRangeToTimestamp, PAGE_SIZE, type OfferSearchInput } from "@/lib/search-params";
import { geocodeCityFull } from "@/server/ingest/sources/geocode";
import type { OfferDocument } from "./sync";
import { offerToDocument } from "./sync";

export type FacetCounts = Record<string, Record<string, number>>;

export type OfferSearchResult = {
  hits: OfferDocument[];
  totalHits: number;
  page: number;
  totalPages: number;
  facets: FacetCounts;
  engine: "meilisearch" | "postgres";
};

/** Coordonnées d'une ville : géocodage (statique puis API, en cache), sinon offres en base. */
async function resolveCityGeo(city: string): Promise<{ lat: number; lng: number } | null> {
  const geocoded = await geocodeCityFull(city);
  if (geocoded) return geocoded;

  const offer = await prisma.jobOffer.findFirst({
    where: { city: { equals: city, mode: "insensitive" }, latitude: { not: null } },
    select: { latitude: true, longitude: true },
  });
  return offer?.latitude != null && offer.longitude != null
    ? { lat: offer.latitude, lng: offer.longitude }
    : null;
}

/**
 * Recherche d'offres : Meilisearch en premier (typo-tolérance, facettes, géo),
 * repli PostgreSQL si le moteur est indisponible.
 */
export async function searchOffers(input: OfferSearchInput): Promise<OfferSearchResult> {
  try {
    return await searchWithMeilisearch(input);
  } catch (err) {
    console.error("[search] Meilisearch indisponible, repli PostgreSQL :", err);
    return searchWithPostgres(input);
  }
}

async function searchWithMeilisearch(input: OfferSearchInput): Promise<OfferSearchResult> {
  const filters: string[] = ['status = "ACTIVE"'];

  if (input.contrat.length) {
    filters.push(`contractType IN [${input.contrat.map((c) => `"${c}"`).join(", ")}]`);
  }
  if (input.remote.length) {
    filters.push(`remotePolicy IN [${input.remote.map((r) => `"${r}"`).join(", ")}]`);
  }
  if (input.niveau.length) {
    filters.push(`educationLevel IN [${input.niveau.map((n) => `"${n}"`).join(", ")}]`);
  }
  if (input.specialite.length) {
    filters.push(`specialty IN [${input.specialite.map((s) => `"${s}"`).join(", ")}]`);
  }
  if (input.pays.length) {
    filters.push(`countryCode IN [${input.pays.map((p) => `"${p}"`).join(", ")}]`);
  }
  if (input.secteur.length) {
    filters.push(`sector IN [${input.secteur.map((s) => `"${s.replace(/"/g, "")}"`).join(", ")}]`);
  }
  if (input.datePub) {
    filters.push(`publishedAtTs >= ${dateRangeToTimestamp(input.datePub)}`);
  }

  // Ville : géo-recherche si rayon demandé et ville géocodable, sinon filtre exact
  if (input.ville) {
    const geo = input.rayon ? await resolveCityGeo(input.ville) : null;
    if (geo && input.rayon) {
      filters.push(`_geoRadius(${geo.lat}, ${geo.lng}, ${input.rayon * 1000})`);
    } else {
      filters.push(`city = "${input.ville.replace(/"/g, "")}"`);
    }
  }

  const meili = getMeili();
  // hitsPerPage/page activent la pagination exhaustive (totalHits/totalPages)
  const result = (await meili.index(OFFERS_INDEX).search<OfferDocument>(input.q || "", {
    filter: filters.join(" AND "),
    facets: [
      "contractType",
      "city",
      "remotePolicy",
      "sector",
      "specialty",
      "educationLevel",
      "countryCode",
    ],
    sort: input.tri === "date" ? ["publishedAtTs:desc"] : undefined,
    hitsPerPage: PAGE_SIZE,
    page: input.page,
  })) as {
    hits: OfferDocument[];
    totalHits?: number;
    page?: number;
    totalPages?: number;
    facetDistribution?: FacetCounts;
  };

  return {
    hits: result.hits,
    totalHits: result.totalHits ?? result.hits.length,
    page: result.page ?? input.page,
    totalPages: result.totalPages ?? 1,
    facets: (result.facetDistribution as FacetCounts) ?? {},
    engine: "meilisearch",
  };
}

// ---------- Repli PostgreSQL ----------

function buildWhere(input: OfferSearchInput, withGeo?: { lat: number; lng: number; km: number }) {
  const where: Prisma.JobOfferWhereInput = { status: "ACTIVE" };

  if (input.q) {
    const terms = input.q.split(/\s+/).filter(Boolean);
    where.AND = terms.map((term) => ({
      OR: [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { city: { contains: term, mode: "insensitive" } },
        { sector: { contains: term, mode: "insensitive" } },
        { company: { name: { contains: term, mode: "insensitive" } } },
      ],
    }));
  }
  if (input.contrat.length) where.contractType = { in: input.contrat };
  if (input.remote.length) where.remotePolicy = { in: input.remote };
  if (input.niveau.length) where.educationLevel = { in: input.niveau };
  if (input.specialite.length) where.specialty = { in: input.specialite };
  if (input.pays.length) where.countryCode = { in: input.pays };
  if (input.secteur.length) where.sector = { in: input.secteur };
  if (input.datePub) where.publishedAt = { gte: new Date(dateRangeToTimestamp(input.datePub)) };

  if (withGeo) {
    // Approximation par boîte englobante (1° lat ≈ 111 km)
    const dLat = withGeo.km / 111;
    const dLng = withGeo.km / (111 * Math.cos((withGeo.lat * Math.PI) / 180));
    where.latitude = { gte: withGeo.lat - dLat, lte: withGeo.lat + dLat };
    where.longitude = { gte: withGeo.lng - dLng, lte: withGeo.lng + dLng };
  } else if (input.ville) {
    where.city = { equals: input.ville, mode: "insensitive" };
  }

  return where;
}

async function searchWithPostgres(input: OfferSearchInput): Promise<OfferSearchResult> {
  let geoBox: { lat: number; lng: number; km: number } | undefined;
  if (input.ville && input.rayon) {
    const geo = await resolveCityGeo(input.ville);
    if (geo) geoBox = { ...geo, km: input.rayon };
  }

  const where = buildWhere(input, geoBox);

  const [
    offers,
    totalHits,
    contractFacet,
    cityFacet,
    remoteFacet,
    sectorFacet,
    specialtyFacet,
    educationFacet,
    countryFacet,
  ] = await Promise.all([
    prisma.jobOffer.findMany({
      where,
      include: { company: true },
      orderBy: { publishedAt: "desc" },
      skip: (input.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.jobOffer.count({ where }),
    prisma.jobOffer.groupBy({ by: ["contractType"], where, _count: true }),
    prisma.jobOffer.groupBy({ by: ["city"], where, _count: true }),
    prisma.jobOffer.groupBy({ by: ["remotePolicy"], where, _count: true }),
    prisma.jobOffer.groupBy({ by: ["sector"], where, _count: true }),
    prisma.jobOffer.groupBy({ by: ["specialty"], where, _count: true }),
    prisma.jobOffer.groupBy({ by: ["educationLevel"], where, _count: true }),
    prisma.jobOffer.groupBy({ by: ["countryCode"], where, _count: true }),
  ]);

  const toRecord = <K extends string>(
    rows: Array<{ _count: number } & Record<K, string>>,
    key: K,
  ) => Object.fromEntries(rows.map((row) => [row[key], row._count]));

  return {
    hits: offers.map(offerToDocument),
    totalHits,
    page: input.page,
    totalPages: Math.max(1, Math.ceil(totalHits / PAGE_SIZE)),
    facets: {
      contractType: toRecord(contractFacet as never, "contractType"),
      city: toRecord(cityFacet as never, "city"),
      remotePolicy: toRecord(remoteFacet as never, "remotePolicy"),
      sector: toRecord(sectorFacet as never, "sector"),
      specialty: toRecord(specialtyFacet as never, "specialty"),
      educationLevel: toRecord(educationFacet as never, "educationLevel"),
      countryCode: toRecord(countryFacet as never, "countryCode"),
    },
    engine: "postgres",
  };
}
