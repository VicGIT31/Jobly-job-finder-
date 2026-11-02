import { prisma } from "@/lib/prisma";
import { getMeili, OFFERS_INDEX } from "@/lib/meilisearch";
import { PAGE_SIZE, dateRangeToTimestamp, type OfferSearchInput } from "@/lib/search-params";
import { queryFamilies, VOCABULARY, fold } from "@/lib/job-taxonomy";
import { geocodeCityFull } from "@/server/ingest/sources/geocode";
import { distanceKm } from "@/lib/geo";
import { getPersonalProfile } from "@/server/personal/profile";
import { offerToDocument, type OfferDocument } from "./sync";
import { rankOffer } from "./ranking";
import type { Prisma } from "@prisma/client";
import type { OfferSearchResult, FacetCounts } from "./query";

const LIMIT = 2000;
const quoted = (value: string) => JSON.stringify(value);
export async function searchPersonalOffers(input: OfferSearchInput): Promise<OfferSearchResult> {
  const profile = await getPersonalProfile();
  const city = input.national === "1" ? "" : input.ville || "Toulouse", radius = input.rayon ?? 30;
  const center = city ? await geocodeCityFull(city) : null;
  const families = input.metier ? [input.metier] : queryFamilies(input.q, input.univers);
  // A recognized complete occupational synonym uses the taxonomy, not a literal
  // text requirement that would exclude equivalent English/French job titles.
  const knownQuery = Object.values(VOCABULARY).flat().includes(fold(input.q)) || /^(commerce|vente|commercial|sales)$/.test(fold(input.q));
  const query = knownQuery && families.length ? "" : input.q;
  const hidden = await prisma.hiddenOffer.findMany({ where: { userId: profile.id }, select: { offerId: true } });
  const statuses = input.incertaines === "1" ? ["ACTIVE", "UNCERTAIN"] : ["ACTIVE"];
  const filter = [`countryCode = "FR"`, `universe = ${quoted(input.univers)}`, `status IN [${statuses.map(quoted).join(",")}]`];
  const enums = [["contractType", input.contrat], ["remotePolicy", input.remote], ["educationLevel", input.niveau], ["experienceLevel", input.experience], ["jobFamily", families]] as const;
  for (const [key, values] of enums) if (values.length) filter.push(`${key} IN [${values.map(quoted).join(",")}]`);
  if (hidden.length) filter.push(`id NOT IN [${hidden.map(({ offerId }) => quoted(offerId)).join(",")}]`);
  if (city) filter.push(center ? `_geoRadius(${center.lat},${center.lng},${radius * 1000})` : `city = ${quoted(city)}`);
  if (input.datePub) filter.push(`publicationKnown = true AND publishedAtTs >= ${dateRangeToTimestamp(input.datePub)}`);
  let engine: "meilisearch" | "postgres" = "meilisearch", documents: OfferDocument[];
  let candidateTotal = 0;
  try {
    const response = await getMeili().index(OFFERS_INDEX).search<OfferDocument>(query, { filter: filter.join(" AND "), limit: LIMIT, sort: input.tri === "date" ? ["publishedAtTs:desc"] : ["verifiedAtTs:desc"] });
    documents = response.hits; candidateTotal = response.estimatedTotalHits ?? documents.length;
  } catch {
    engine = "postgres";
    const where: Prisma.JobOfferWhereInput = { countryCode: "FR", universe: input.univers, status: { in: statuses as ("ACTIVE" | "UNCERTAIN")[] }, ...(hidden.length ? { id: { notIn: hidden.map(({ offerId }) => offerId) } } : {}) };
    if (input.contrat.length) where.contractType = { in: input.contrat };
    if (input.remote.length) where.remotePolicy = { in: input.remote };
    if (input.niveau.length) where.educationLevel = { in: input.niveau };
    if (input.experience.length) where.experienceLevel = { in: input.experience };
    if (families.length) where.jobFamily = { in: families };
    if (input.datePub) { where.publicationKnown = true; where.publishedAt = { gte: new Date(dateRangeToTimestamp(input.datePub)) }; }
    if (city && !center) where.city = { equals: city, mode: "insensitive" };
    if (center) { const latitude = radius / 110, longitude = radius / (110 * Math.cos((Math.abs(center.lat) + radius / 110) * Math.PI / 180)); where.latitude = { gte: center.lat - latitude, lte: center.lat + latitude }; where.longitude = { gte: center.lng - longitude, lte: center.lng + longitude }; }
    if (query) where.AND = query.split(/\s+/).filter(Boolean).map((word) => ({ OR: [{ title: { contains: word, mode: "insensitive" } }, { description: { contains: word, mode: "insensitive" } }, { company: { name: { contains: word, mode: "insensitive" } } }] }));
    const offers = await prisma.jobOffer.findMany({ where, include: { company: true }, orderBy: { lastSeenAt: "desc" }, take: LIMIT });
    documents = offers.map(offerToDocument); candidateTotal = documents.length;
  }
  documents = documents.filter((offer) => {
    if (center && (!offer._geo || distanceKm(center, offer._geo) > radius)) return false;
    if (input.qualification && offer.qualificationText && !fold(offer.qualificationText).includes(fold(input.qualification))) return false;
    // Unknown salary/qualification is not a proven incompatibility. Only compare annual salaries to annual filters.
    if (input.salaire && offer.salaryPeriod === "YEAR" && (offer.salaryMax ?? offer.salaryMin) != null && (offer.salaryMax ?? offer.salaryMin)! < input.salaire) return false;
    return true;
  });
  const ranked = documents.map((offer) => rankOffer(offer, { center, radius, families, query: input.q }));
  ranked.sort((a, b) => input.tri === "date" ? Number(b.publicationKnown) - Number(a.publicationKnown) || b.publishedAtTs - a.publishedAtTs : (b.score ?? 0) - (a.score ?? 0) || (b.verifiedAtTs ?? 0) - (a.verifiedAtTs ?? 0));
  const facets: FacetCounts = {};
  for (const key of ["contractType", "city", "remotePolicy", "jobFamily", "experienceLevel", "educationLevel"] as const) { facets[key] = {}; for (const offer of ranked) { const value = String(offer[key] ?? "UNKNOWN"); facets[key][value] = (facets[key][value] ?? 0) + 1; } }
  const page = ranked.slice((input.page - 1) * PAGE_SIZE, input.page * PAGE_SIZE);
  const ids = page.map(({ id }) => id);
  const [origins, saved] = await Promise.all([prisma.offerOrigin.findMany({ where: { offerId: { in: ids } }, select: { offerId: true, sourceSite: true, sourceUrl: true, status: true } }), prisma.savedOffer.findMany({ where: { userId: profile.id, offerId: { in: ids } }, select: { offerId: true } })]);
  const savedIds = new Set(saved.map(({ offerId }) => offerId));
  return { hits: page.map((offer) => ({ ...offer, saved: savedIds.has(offer.id), sources: origins.filter(({ offerId }) => offerId === offer.id).map(({ offerId: _id, ...origin }) => origin) })), totalHits: ranked.length, page: input.page, totalPages: Math.max(1, Math.ceil(ranked.length / PAGE_SIZE)), facets, engine, ...(candidateTotal >= LIMIT ? { limited: true } : {}), location: { city, radius: city ? radius : null, resolved: !city || !!center }, refreshedAt: new Date().toISOString() };
}
