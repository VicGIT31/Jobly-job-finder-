import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMeili, OFFERS_INDEX } from "@/lib/meilisearch";
import {
  dateRangeToTimestamp,
  PAGE_SIZE,
  resolveSort,
  type OfferSearchInput,
} from "@/lib/search-params";
import { fold, isKnownJobQuery, queryFamilies } from "@/lib/job-taxonomy";
import { distanceKm, type Point } from "@/lib/geo";
import { geocodeCityFull } from "@/server/ingest/sources/geocode";
import { companySlugsForCollection } from "@/server/companies/collections";
import type { CollectionKey } from "@/lib/company-collections";
import { getPersonalProfile } from "@/server/personal/profile";
import { offerToDocument, type OfferDocument } from "./sync";
import { rankOffer, offerDistance, type RankContext } from "./ranking";
import { aiQueryTopic } from "@/lib/ai-topics";

export type FacetCounts = Record<string, Record<string, number>>;

export type OfferSearchResult = {
  hits: OfferDocument[];
  totalHits: number;
  page: number;
  totalPages: number;
  facets: FacetCounts;
  engine: "meilisearch" | "postgres";
  limited?: boolean;
  location?: { city: string; radius: number | null; resolved: boolean };
  refreshedAt?: string;
};

/** Candidats classés en mémoire par recherche ; au-delà, la recherche invite à préciser. */
const CANDIDATE_LIMIT = 5000;

const FACETS = [
  "contractType",
  "city",
  "remotePolicy",
  "sector",
  "specialty",
  "educationLevel",
  "countryCode",
  "universe",
  "jobFamily",
  "experienceLevel",
  "tags",
] as const;

/** Champs utiles au classement : on ne rapatrie le document complet que pour la page affichée. */
const SLIM_FIELDS = [
  "id",
  "title",
  "companyName",
  "status",
  "_geo",
  "publishedAtTs",
  "firstSeenAtTs",
  "verifiedAtTs",
  "publicationKnown",
  "salaryMin",
  "salaryMax",
  "salaryPeriod",
  "qualificationText",
  "jobConfidence",
  "jobEvidence",
  "locations",
  ...FACETS,
];

type Plan = {
  input: OfferSearchInput;
  statuses: Array<"ACTIVE" | "UNCERTAIN">;
  center: Point | null;
  profileId: string;
  hiddenIds: string[];
  categorySlugs: string[] | null;
  /** Texte réellement recherché : vide quand la requête est un intitulé connu (voir `families`). */
  query: string;
  /** Métiers imposés par une requête connue (« ASV », « commercial », « marketing »). */
  impliedFamilies: string[];
  aiTopic: string | null;
  secondaryGeoIds: string[];
  rank: RankContext;
};

/** Coordonnées d'une ville : géocodage (statique puis API, en cache), sinon offres en base. */
async function resolveCityGeo(city: string): Promise<Point | null> {
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
 * Slugs d'entreprise des catégories sélectionnées (union dédupliquée).
 * `null` = aucun filtre catégorie ; tableau vide = catégorie sans entreprise
 * en base (résultat vide, pas « tout »).
 */
async function resolveCategorySlugs(categorie: string[]): Promise<string[] | null> {
  if (categorie.length === 0) return null;
  const lists = await Promise.all(
    categorie.map((key) => companySlugsForCollection(key as CollectionKey)),
  );
  return [...new Set(lists.flat())];
}

const EMPTY_RESULT: OfferSearchResult = {
  hits: [],
  totalHits: 0,
  page: 1,
  totalPages: 1,
  facets: {},
  engine: "meilisearch",
};

async function buildPlan(input: OfferSearchInput): Promise<Plan | null> {
  const [profile, categorySlugs] = await Promise.all([
    getPersonalProfile(),
    resolveCategorySlugs(input.categorie),
  ]);
  if (categorySlugs?.length === 0) return null;
  const hidden = await prisma.hiddenOffer.findMany({
    where: { userId: profile.id },
    select: { offerId: true },
  });
  const center = input.ville && input.rayon ? await resolveCityGeo(input.ville) : null;
  const implied = queryFamilies(input.q);
  // Un intitulé connu (« ASV », « veterinary nurse », « commercial ») s'appuie sur
  // la classification : une exigence textuelle exclurait les équivalents français/anglais.
  const known = !!input.q && isKnownJobQuery(input.q) && implied.length > 0;
  const aiTopic = aiQueryTopic(input.q);
  const secondaryGeoIds: string[] = [];
  if (center) {
    const lat = (input.rayon ?? 30) / 111;
    const lng = lat / Math.cos(center.lat * Math.PI / 180);
    const locations = await prisma.offerLocation.findMany({ where: { countryCode: "FR", latitude: { gte: center.lat-lat, lte: center.lat+lat }, longitude: { gte: center.lng-lng, lte: center.lng+lng } }, select: { offerId: true, latitude: true, longitude: true } });
    secondaryGeoIds.push(...new Set(locations.filter((location) => location.latitude != null && location.longitude != null && distanceKm(center, { lat: location.latitude, lng: location.longitude }) <= (input.rayon ?? 30)).map((location) => location.offerId)));
  }
  return {
    input,
    statuses: input.incertaines === "1" ? ["ACTIVE", "UNCERTAIN"] : ["ACTIVE"],
    center,
    profileId: profile.id,
    hiddenIds: hidden.map(({ offerId }) => offerId),
    categorySlugs,
    query: known || aiTopic ? "" : input.q,
    aiTopic,
    secondaryGeoIds,
    impliedFamilies: known ? implied : [],
    rank: {
      center,
      radius: input.rayon,
      query: known ? "" : input.q,
      families: [...input.metier, ...(known ? implied : [])],
      specialties: input.specialite,
    },
  };
}

/**
 * Recherche d'offres, tous domaines mélangés (tech, commerce, communication,
 * ASV) : Meilisearch en premier (typo-tolérance, facettes, géo), repli
 * PostgreSQL si le moteur est indisponible. Les offres masquées sont écartées.
 */
export async function searchOffers(input: OfferSearchInput): Promise<OfferSearchResult> {
  const plan = await buildPlan(input);
  if (!plan) return EMPTY_RESULT;
  try {
    return await searchWithMeilisearch(plan);
  } catch (err) {
    console.error("[search] Meilisearch indisponible, repli PostgreSQL :", err);
    return searchWithPostgres(plan);
  }
}

/* ------------------------------------------------------------------ */
/* Meilisearch                                                         */
/* ------------------------------------------------------------------ */

const quoted = (value: string) => JSON.stringify(value);
const inList = (field: string, values: readonly string[]) =>
  `${field} IN [${values.map(quoted).join(", ")}]`;

function meiliFilter(plan: Plan): string {
  const { input } = plan;
  const filters = [
    inList("status", plan.statuses),
    inList("countryCode", input.pays.length ? input.pays : ["FR"]),
  ];
  if (input.univers.length) filters.push(inList("universe", input.univers));
  // Un métier et une spécialité tech s'additionnent (OU) : c'est un seul filtre « Métier ».
  const job = [
    input.metier.length ? inList("jobFamily", input.metier) : "",
    input.specialite.length ? inList("specialty", input.specialite) : "",
    input.specialite.includes("IA") ? 'tags IN ["AI_ML"]' : "",
  ].filter(Boolean);
  if (job.length) filters.push(job.length > 1 ? `(${job.join(" OR ")})` : job[0]);
  if (plan.impliedFamilies.length) filters.push(inList("jobFamily", plan.impliedFamilies));
  if (plan.aiTopic) filters.push(inList("tags", [plan.aiTopic]));
  if (input.contrat.length) filters.push(inList("contractType", input.contrat));
  if (input.remote.length) filters.push(inList("remotePolicy", input.remote));
  if (input.niveau.length) filters.push(inList("educationLevel", input.niveau));
  if (input.experience.length) filters.push(inList("experienceLevel", input.experience));
  if (input.tag.length) filters.push(inList("tags", input.tag));
  if (input.secteur.length)
    filters.push(
      inList(
        "sector",
        input.secteur.map((value) => value.replace(/"/g, "")),
      ),
    );
  if (plan.categorySlugs) filters.push(inList("companySlug", plan.categorySlugs));
  if (plan.hiddenIds.length) filters.push(`id NOT IN [${plan.hiddenIds.map(quoted).join(", ")}]`);
  if (input.datePub) {
    const since = dateRangeToTimestamp(input.datePub);
    // Une publication inconnue se date par sa première détection, plutôt que d'être écartée.
    filters.push(
      `((publicationKnown = true AND publishedAtTs >= ${since}) OR (publicationKnown = false AND firstSeenAtTs >= ${since}))`,
    );
  }
  if (input.ville) {
    filters.push(
      plan.center
        ? `(_geoRadius(${plan.center.lat}, ${plan.center.lng}, ${(input.rayon ?? 30) * 1000})${plan.secondaryGeoIds.length ? ` OR ${inList("id", plan.secondaryGeoIds)}` : ""})`
        : `(city = ${quoted(input.ville)} OR locationCities = ${quoted(input.ville)})`,
    );
  }
  return filters.join(" AND ");
}

async function searchWithMeilisearch(plan: Plan): Promise<OfferSearchResult> {
  const { input } = plan;
  const index = getMeili().index<OfferDocument>(OFFERS_INDEX);
  const filter = meiliFilter(plan);
  const sort = resolveSort(input);
  const needsRanking = sort === "pertinence" || !!input.salaire || !!input.qualification;

  if (!needsRanking) {
    // « Récentes » : pagination native, facettes sur tout le catalogue filtré.
    const result = await index.search(plan.query, {
      filter,
      facets: [...FACETS],
      sort: ["publishedAtTs:desc"],
      hitsPerPage: PAGE_SIZE,
      page: input.page,
    });
    const hits = result.hits.map((hit) => rankOffer(hit, plan.rank));
    return {
      hits: await withPersonalState(hits, plan.profileId),
      totalHits: result.totalHits ?? result.hits.length,
      page: result.page ?? input.page,
      totalPages: result.totalPages ?? 1,
      facets: (result.facetDistribution as FacetCounts) ?? {},
      engine: "meilisearch",
      ...locationInfo(plan),
    };
  }

  const result = await index.search(plan.query, {
    filter,
    facets: [...FACETS],
    limit: CANDIDATE_LIMIT,
    attributesToRetrieve: SLIM_FIELDS,
    showRankingScore: true,
  });
  const candidates = result.hits as OfferDocument[];
  const loadPage = async (ids: string[]) => {
    if (!ids.length) return [] as OfferDocument[];
    const full = await index.search("", { filter: inList("id", ids), limit: ids.length });
    return full.hits as OfferDocument[];
  };
  return finishRanked(plan, candidates, {
    engine: "meilisearch",
    facets: (result.facetDistribution as FacetCounts) ?? {},
    candidateTotal: result.estimatedTotalHits ?? candidates.length,
    loadPage,
  });
}

/* ------------------------------------------------------------------ */
/* Pipeline commun : filtres en mémoire, classement, pagination        */
/* ------------------------------------------------------------------ */

/** Critères que l'index ne sait pas exprimer, et garde-fous après un repli PostgreSQL. */
function passes(doc: OfferDocument, plan: Plan): boolean {
  const { input, center } = plan;
  if (center) { const distance = offerDistance(doc, center); if (distance == null || distance > (input.rayon ?? 30)) return false; }
  if (input.tag.length && !input.tag.some((tag) => doc.tags?.includes(tag))) return false;
  if (
    input.qualification &&
    doc.qualificationText &&
    !fold(doc.qualificationText).includes(fold(input.qualification))
  )
    return false;
  // Un salaire inconnu n'est pas une incompatibilité : seuls les montants annuels connus sont comparés.
  const pay = doc.salaryMax ?? doc.salaryMin;
  if (input.salaire && doc.salaryPeriod === "YEAR" && pay != null && pay < input.salaire)
    return false;
  return true;
}

function facetsFrom(docs: OfferDocument[]): FacetCounts {
  const facets: FacetCounts = {};
  for (const key of FACETS) facets[key] = {};
  for (const doc of docs) {
    for (const key of FACETS) {
      const raw = (doc as unknown as Record<string, unknown>)[key];
      for (const value of Array.isArray(raw) ? raw : [raw ?? "UNKNOWN"]) {
        const label = String(value);
        facets[key][label] = (facets[key][label] ?? 0) + 1;
      }
    }
  }
  return facets;
}

async function finishRanked(
  plan: Plan,
  candidates: OfferDocument[],
  options: {
    engine: "meilisearch" | "postgres";
    facets: FacetCounts;
    candidateTotal: number;
    loadPage: (ids: string[]) => Promise<OfferDocument[]>;
  },
): Promise<OfferSearchResult> {
  const { input } = plan;
  const kept = candidates.filter((doc) => passes(doc, plan));
  const ranked = kept.map((doc) => rankOffer(doc, plan.rank));
  ranked.sort((a, b) =>
    resolveSort(input) === "date"
      ? b.publishedAtTs - a.publishedAtTs
      : b.score - a.score || (b.verifiedAtTs ?? 0) - (a.verifiedAtTs ?? 0),
  );
  const pageSlice = ranked.slice((input.page - 1) * PAGE_SIZE, input.page * PAGE_SIZE);
  const fullById = new Map(
    (await options.loadPage(pageSlice.map(({ id }) => id))).map((doc) => [doc.id, doc]),
  );
  const hits = pageSlice.map((slim) => ({ ...(fullById.get(slim.id) ?? slim), ...pick(slim) }));
  return {
    hits: await withPersonalState(hits, plan.profileId),
    totalHits: ranked.length,
    page: input.page,
    totalPages: Math.max(1, Math.ceil(ranked.length / PAGE_SIZE)),
    // Les facettes de l'index restent exactes tant que rien n'a été retiré en mémoire.
    facets:
      options.engine === "postgres" || kept.length !== candidates.length
        ? facetsFrom(kept)
        : options.facets,
    engine: options.engine,
    ...(options.candidateTotal >= CANDIDATE_LIMIT ? { limited: true } : {}),
    ...locationInfo(plan),
  };
}

const pick = ({ score, distanceKm: distance, reasons }: ReturnType<typeof rankOffer>) => ({
  score,
  distanceKm: distance,
  reasons,
});

function locationInfo(plan: Plan) {
  const { input } = plan;
  return {
    refreshedAt: new Date().toISOString(),
    ...(input.ville
      ? {
          location: {
            city: input.ville,
            radius: input.rayon ?? null,
            resolved: !input.rayon || !!plan.center,
          },
        }
      : {}),
  };
}

/** Sources regroupées (provenance) et état « favori » de la page affichée. */
async function withPersonalState(
  hits: OfferDocument[],
  profileId: string,
): Promise<OfferDocument[]> {
  if (!hits.length) return hits;
  const ids = hits.map(({ id }) => id);
  const [origins, saved] = await Promise.all([
    prisma.offerOrigin.findMany({
      where: { offerId: { in: ids } },
      select: { offerId: true, sourceSite: true, sourceUrl: true, status: true },
    }),
    prisma.savedOffer.findMany({
      where: { userId: profileId, offerId: { in: ids } },
      select: { offerId: true },
    }),
  ]);
  const savedIds = new Set(saved.map(({ offerId }) => offerId));
  return hits.map((offer) => ({
    ...offer,
    saved: savedIds.has(offer.id),
    sources: origins
      .filter(({ offerId }) => offerId === offer.id)
      .map(({ offerId: _offerId, ...origin }) => origin),
  }));
}

/* ------------------------------------------------------------------ */
/* Repli PostgreSQL                                                    */
/* ------------------------------------------------------------------ */

function buildWhere(plan: Plan): Prisma.JobOfferWhereInput {
  const { input } = plan;
  const and: Prisma.JobOfferWhereInput[] = [];
  const where: Prisma.JobOfferWhereInput = {
    status: { in: plan.statuses },
    countryCode: input.pays.length ? { in: input.pays } : "FR",
  };
  if (plan.hiddenIds.length) where.id = { notIn: plan.hiddenIds };
  if (input.univers.length) where.universe = { in: input.univers };
  const job: Prisma.JobOfferWhereInput[] = [];
  if (input.metier.length) job.push({ jobFamily: { in: input.metier } });
  if (input.specialite.length) job.push({ specialty: { in: input.specialite } });
  if (input.specialite.includes("IA")) job.push({ tags: { has: "AI_ML" } });
  if (job.length) and.push({ OR: job });
  if (plan.impliedFamilies.length) and.push({ jobFamily: { in: plan.impliedFamilies } });
  if (plan.aiTopic) and.push({ tags: { has: plan.aiTopic } });
  if (input.tag.length) and.push({ tags: { hasSome: input.tag } });
  if (plan.query) {
    for (const term of plan.query.split(/\s+/).filter(Boolean)) {
      and.push({
        OR: [
          { title: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
          { city: { contains: term, mode: "insensitive" } },
          { sector: { contains: term, mode: "insensitive" } },
          { company: { name: { contains: term, mode: "insensitive" } } },
        ],
      });
    }
  }
  if (input.contrat.length) where.contractType = { in: input.contrat };
  if (input.remote.length) where.remotePolicy = { in: input.remote };
  if (input.niveau.length) where.educationLevel = { in: input.niveau };
  if (input.experience.length) where.experienceLevel = { in: input.experience };
  if (input.secteur.length) where.sector = { in: input.secteur };
  if (plan.categorySlugs) where.company = { slug: { in: plan.categorySlugs } };
  if (input.datePub) {
    const since = new Date(dateRangeToTimestamp(input.datePub));
    and.push({
      OR: [
        { publicationKnown: true, publishedAt: { gte: since } },
        { publicationKnown: false, createdAt: { gte: since } },
      ],
    });
  }
  if (input.ville) {
    if (plan.center) {
      // Boîte englobante (1° de latitude ≈ 111 km) ; la distance exacte est filtrée ensuite.
      const radius = input.rayon ?? 30;
      const dLat = radius / 111;
      const dLng = radius / (111 * Math.cos((plan.center.lat * Math.PI) / 180));
      and.push({ OR: [
        { latitude: { gte: plan.center.lat - dLat, lte: plan.center.lat + dLat }, longitude: { gte: plan.center.lng - dLng, lte: plan.center.lng + dLng } },
        ...(plan.secondaryGeoIds.length ? [{ id: { in: plan.secondaryGeoIds } }] : []),
      ] });
    } else and.push({ OR: [{ city: { equals: input.ville, mode: "insensitive" } }, { locations: { some: { city: { equals: input.ville, mode: "insensitive" } } } }] });
  }
  if (and.length) where.AND = and;
  return where;
}

async function searchWithPostgres(plan: Plan): Promise<OfferSearchResult> {
  const offers = await prisma.jobOffer.findMany({
    where: buildWhere(plan),
    include: { company: true, locations: true },
    orderBy: { lastSeenAt: "desc" },
    take: CANDIDATE_LIMIT,
  });
  const documents = offers.map(offerToDocument);
  const byId = new Map(documents.map((doc) => [doc.id, doc]));
  return finishRanked(plan, documents, {
    engine: "postgres",
    facets: {},
    candidateTotal: documents.length,
    loadPage: async (ids) => ids.map((id) => byId.get(id)!).filter(Boolean),
  });
}
