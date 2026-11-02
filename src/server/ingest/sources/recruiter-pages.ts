import { load } from "cheerio";
import { prisma } from "@/lib/prisma";
import { distanceKm, TOULOUSE, type Point } from "@/lib/geo";
import { classifyJob } from "../job-classifier";
import { fold } from "@/lib/job-taxonomy";
import { CollectionDeadlineError, fetchJson, fetchText, RateLimitedError } from "../http";
import {
  extractJobPostings,
  jobLocationCity,
  jobLocationCountry,
  type JsonLdJobPosting,
} from "../jsonld";
import { makePersonalOffer, PERSONAL_CONTRACTS, type PersonalOfferInput } from "../personal-offer";
import { robotsAllows } from "../robots";
import type { RawOffer } from "../normalize";
import { geocodeCityFull } from "./geocode";
import type { SourceConnector, SourceGroup } from "./types";
import type { SourceEntry } from "./index";

/**
 * « Pages recruteurs » des cabinets vétérinaires indépendants : les cabinets
 * autour de la zone de recherche sont découverts dans OpenStreetMap, puis leur
 * page recrutement est cherchée sur leur site. Les groupes et employeurs de
 * la santé animale qui publient un flux ou des fiches structurées (IVC Evidensia,
 * Fovéa, Univet, Argos, SPA, Beauval…) sont des sources à part entière dans
 * `config/personal-sources.json`.
 *
 * Rendement mesuré sur un échantillon réel de 18 cabinets près de Toulouse :
 * peu de cabinets publient une page recrutement, le plus souvent en texte libre.
 * Cette source est donc un complément, jamais une couverture exhaustive.
 *
 * Aucune page n'est demandée sans l'accord de son robots.txt, aucune
 * connexion ni contournement n'est tenté, et seules des pages publiques sont lues.
 */

const HTTP = { timeoutMs: 10_000, retries: 0, minIntervalMs: 400 };
const PAGE_TTL = 6 * 3_600_000;

/* ------------------------------------------------------------------ */
/* Garde-fous réseau                                                   */
/* ------------------------------------------------------------------ */

const SOCIAL_OR_DIRECTORY =
  /(^|\.)(facebook|instagram|linkedin|twitter|x|youtube|tiktok|doctolib|pagesjaunes|google|goo|business\.site|wixsite|linktr\.ee|vetoptim|petsfirst)\./i;
/** Groupes déjà couverts par leurs propres connecteurs : pas de crawl en double. */
const COVERED_GROUPS =
  /(^|\.)(sevetys|anicura|recrutement-monveto|monveto|argos-veterinaire|evidensia|ivc-evidensia|vetopartners)\./i;

/** Une URL issue d'une donnée externe (OpenStreetMap) ne doit jamais viser le réseau local. */
export function isPublicWebUrl(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password || (url.port && !["80", "443"].includes(url.port))) return null;
  const host = url.hostname.toLowerCase();
  if (!host.includes(".") || /^(localhost|.*\.(?:local|internal|lan|home|corp))$/.test(host))
    return null;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.startsWith("[")) return null;
  if (SOCIAL_OR_DIRECTORY.test(`${host}.`) || COVERED_GROUPS.test(`${host}.`)) return null;
  return url;
}

/* ------------------------------------------------------------------ */
/* Pages carrières : liens, annonces structurées, texte libre          */
/* ------------------------------------------------------------------ */

const CAREER_HINT =
  /recrut|emploi|carriere|offres? d emploi|rejoign|nous recrutons|travailler (?:avec|chez)|candidature|\bjobs?\b|postes? a pourvoir/;
const JOB_PATH =
  /\/(?:offres?|emplois?|jobs?|annonces?|postes?|recrutement|carrieres?)(?:[/-])[^/]+/i;
const NO_OFFER =
  /aucune offre|pas d offre|pas de poste|plus de poste|aucun poste|n avons pas de poste|pas de recrutement en cours/;
const HIRING_CUE =
  /recrut|poste a pourvoir|nous recherchons|nous cherchons|cdi|cdd|alternance|stage|temps plein|temps partiel|a pourvoir/;
const ATS_HOST = /(?:^|\.)(?:teamtailor\.com|recruitee\.com|lever\.co|greenhouse\.io)$/;

export function findCareerLinks(html: string, base: URL, limit = 3): URL[] {
  const $ = load(html);
  const found = new Map<string, number>();
  $("a[href]").each((_, element) => {
    const href = $(element).attr("href") ?? "";
    if (!href || /^(mailto:|tel:|javascript:|#)/i.test(href)) return;
    let target: URL;
    try {
      target = new URL(href, base);
    } catch {
      return;
    }
    if (target.protocol !== "https:" && target.protocol !== "http:") return;
    if (/\.(pdf|jpe?g|png|zip|docx?)$/i.test(target.pathname)) return;
    const sameSite = target.hostname.replace(/^www\./, "") === base.hostname.replace(/^www\./, "");
    if (!sameSite && !ATS_HOST.test(target.hostname)) return;
    const label = fold($(element).text());
    const score =
      (CAREER_HINT.test(label) ? 2 : 0) + (CAREER_HINT.test(fold(target.pathname)) ? 1 : 0);
    if (score === 0) return;
    target.hash = "";
    found.set(target.href, Math.max(found.get(target.href) ?? 0, score));
  });
  return [...found.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)
    .slice(0, limit)
    .map(([href]) => new URL(href));
}

function detailLinks(html: string, page: URL, limit: number): URL[] {
  const $ = load(html);
  const links = new Map<string, true>();
  $("a[href]").each((_, element) => {
    let target: URL;
    try {
      target = new URL($(element).attr("href") ?? "", page);
    } catch {
      return;
    }
    if (target.origin !== page.origin || target.pathname === page.pathname) return;
    if (!JOB_PATH.test(target.pathname) || /\.(pdf|jpe?g|png)$/i.test(target.pathname)) return;
    target.hash = "";
    links.set(target.href, true);
  });
  return [...links.keys()].slice(0, limit).map((href) => new URL(href));
}

const slug = (value: string) => fold(value).replace(/ /g, "-").slice(0, 60);

/**
 * Annonces rédigées en texte libre : un intitulé de métier suivi par son texte,
 * avec un signal de recrutement. Une page qui dit n'avoir aucune offre n'en
 * produit jamais, et un métier cité sans signal de recrutement non plus.
 */
export function freeTextOffers(
  html: string,
  page: URL,
  company: string,
  city?: string,
): PersonalOfferInput[] {
  const $ = load(html);
  $("script,style,nav,footer,header,form,noscript").remove();
  if (NO_OFFER.test(fold($.root().text()))) return [];
  const offers = new Map<string, PersonalOfferInput>();
  $("h1,h2,h3,h4,strong,b").each((_, element) => {
    const title = $(element).text().replace(/\s+/g, " ").trim();
    if (title.length < 4 || title.length > 120) return;
    const job = classifyJob(title, "", { company });
    if (job.universe !== "ASV" && job.universe !== "COMMERCE") return;
    let block = "";
    for (const sibling of $(element).nextAll().toArray()) {
      if (/^h[1-4]$/i.test(sibling.tagName)) break;
      block += ` ${$(sibling).text()}`;
      if (block.length > 1800) break;
    }
    if (block.trim().length < 40) block = $(element).parent().text();
    block = block.replace(/\s+/g, " ").trim().slice(0, 1800);
    if (block.length < 80 || !HIRING_CUE.test(fold(`${title} ${block}`))) return;
    const url = `${page.origin}${page.pathname}#${slug(title)}`;
    if (!offers.has(slug(title)))
      offers.set(slug(title), { title, company, description: block, city, country: "FR", url });
  });
  return [...offers.values()].slice(0, 8);
}

/* ------------------------------------------------------------------ */
/* ATS publics à flux documenté                                        */
/* ------------------------------------------------------------------ */

export type AtsTarget = { kind: "teamtailor" | "recruitee" | "lever" | "greenhouse"; url: string };

export function atsTarget(link: URL): AtsTarget | null {
  const host = link.hostname.toLowerCase();
  const sub = host.split(".")[0];
  if (host.endsWith(".teamtailor.com"))
    return { kind: "teamtailor", url: `https://${host}/jobs.rss` };
  if (host.endsWith(".recruitee.com"))
    return { kind: "recruitee", url: `https://${host}/api/offers/` };
  if (host === "jobs.lever.co" || host === "jobs.eu.lever.co") {
    const account = link.pathname.split("/").filter(Boolean)[0];
    return account
      ? { kind: "lever", url: `https://api.lever.co/v0/postings/${account}?mode=json` }
      : null;
  }
  if (/^(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io$/.test(host)) {
    const board = link.pathname.split("/").filter(Boolean)[0];
    return board
      ? {
          kind: "greenhouse",
          url: `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`,
        }
      : null;
  }
  return sub ? null : null;
}

async function atsOffers(
  target: AtsTarget,
  company: string,
  city?: string,
): Promise<PersonalOfferInput[]> {
  const out: PersonalOfferInput[] = [];
  if (target.kind === "teamtailor") {
    const xml = await fetchText(target.url, { ...HTTP, cacheTtlMs: 15 * 60_000 });
    if (!xml || !/<rss[\s>]/i.test(xml)) return out;
    const $ = load(xml, { xmlMode: true });
    $("item").each((_, item) => {
      const node = $(item);
      out.push({
        title: node.find("title").text(),
        company,
        city: node.find("city").text() || city,
        country: node.find("country").text() || "FR",
        description: node.find("description").text(),
        publishedAt: node.find("pubDate").text(),
        url: node.find("link").text(),
      });
    });
  } else if (target.kind === "recruitee") {
    const data = await fetchJson<{
      offers?: Array<{
        title: string;
        description?: string;
        careers_url?: string;
        city?: string;
        country_code?: string;
        created_at?: string;
      }>;
    }>(target.url, { ...HTTP, cacheTtlMs: 15 * 60_000 });
    for (const offer of data?.offers ?? [])
      out.push({
        title: offer.title,
        company,
        city: offer.city ?? city,
        country: offer.country_code ?? "FR",
        description: offer.description ?? "",
        publishedAt: offer.created_at,
        url: offer.careers_url ?? "",
      });
  } else if (target.kind === "lever") {
    const data = await fetchJson<
      Array<{
        text: string;
        descriptionPlain?: string;
        hostedUrl?: string;
        categories?: { location?: string; commitment?: string };
        createdAt?: number;
      }>
    >(target.url, { ...HTTP, cacheTtlMs: 15 * 60_000 });
    for (const offer of data ?? [])
      out.push({
        title: offer.text,
        company,
        city: offer.categories?.location ?? city,
        country: "FR",
        description: offer.descriptionPlain ?? "",
        contract: offer.categories?.commitment,
        publishedAt: offer.createdAt ? new Date(offer.createdAt).toISOString() : undefined,
        url: offer.hostedUrl ?? "",
      });
  } else {
    const data = await fetchJson<{
      jobs?: Array<{
        title: string;
        content?: string;
        absolute_url?: string;
        location?: { name?: string };
        updated_at?: string;
      }>;
    }>(target.url, { ...HTTP, cacheTtlMs: 15 * 60_000 });
    for (const offer of data?.jobs ?? [])
      out.push({
        title: offer.title,
        company,
        city: offer.location?.name ?? city,
        country: "FR",
        description: offer.content ?? "",
        url: offer.absolute_url ?? "",
      });
  }
  return out.filter((offer) => offer.title && offer.url.startsWith("https://"));
}

/* ------------------------------------------------------------------ */
/* Analyse d'un site                                                   */
/* ------------------------------------------------------------------ */

type SiteTarget = { url: URL; company: string; city?: string; point?: Point };

function inputFromPosting(
  posting: JsonLdJobPosting,
  page: URL,
  target: SiteTarget,
): PersonalOfferInput {
  const title = load(`<span>${posting.title ?? ""}</span>`)("span").text();
  const types = Array.isArray(posting.employmentType)
    ? posting.employmentType
    : [posting.employmentType ?? ""];
  return {
    title,
    company: posting.hiringOrganization?.name ?? target.company,
    description: posting.description ?? "",
    city: jobLocationCity(posting) ?? target.city,
    country: jobLocationCountry(posting) ?? "FR",
    url: ((posting as { url?: unknown }).url as string | undefined)?.startsWith("http")
      ? ((posting as { url?: string }).url as string)
      : page.href,
    publishedAt: posting.datePosted,
    validThrough: posting.validThrough,
    contract: types.join(" "),
    ...(target.point && !jobLocationCity(posting)
      ? { lat: target.point.lat, lng: target.point.lng }
      : {}),
  };
}

async function readPage(url: URL): Promise<string | null> {
  if (!(await robotsAllows(url))) return null;
  return fetchText(url, { ...HTTP, cacheTtlMs: PAGE_TTL });
}

/** Cherche la page recrutement d'un site et en extrait les annonces ; vide si rien de fiable. */
export async function scanSite(target: SiteTarget, warnings: string[]): Promise<RawOffer[]> {
  const home = await readPage(target.url);
  if (!home) return [];
  const pages: Array<{ url: URL; html: string }> = [{ url: target.url, html: home }];
  for (const link of findCareerLinks(home, target.url)) {
    const ats = ATS_HOST.test(link.hostname) ? atsTarget(link) : null;
    if (ats) {
      const inputs = await atsOffers(ats, target.company, target.city);
      return makeOffers(inputs, target);
    }
    if (link.href === target.url.href) continue;
    const html = await readPage(link);
    if (html) pages.push({ url: link, html });
  }

  const inputs: PersonalOfferInput[] = [];
  for (const page of pages) {
    const postings = extractJobPostings(page.html);
    for (const posting of postings) inputs.push(inputFromPosting(posting, page.url, target));
    // Une page carrières qui liste des fiches : on lit les fiches pour leur JSON-LD.
    if (!postings.length && page.url.href !== target.url.href) {
      for (const detail of detailLinks(page.html, page.url, 6)) {
        const html = await readPage(detail);
        if (!html) continue;
        for (const posting of extractJobPostings(html))
          inputs.push(inputFromPosting(posting, detail, target));
      }
    }
  }
  if (!inputs.length) {
    for (const page of pages.slice(1))
      inputs.push(...freeTextOffers(page.html, page.url, target.company, target.city));
    if (inputs.length)
      warnings.push(`${target.company} : annonces lues dans le texte de la page, à vérifier`);
  }
  return makeOffers(inputs, target);
}

async function makeOffers(inputs: PersonalOfferInput[], target: SiteTarget): Promise<RawOffer[]> {
  const offers: RawOffer[] = [];
  for (const input of inputs.slice(0, 20)) {
    const offer = await makePersonalOffer({
      ...input,
      ...(target.point && !input.lat ? { lat: target.point.lat, lng: target.point.lng } : {}),
    });
    if (offer)
      offers.push({
        ...offer,
        sourceSite: new URL(offer.sourceUrl).hostname.replace(/^www\./, ""),
      });
  }
  return offers;
}

/* ------------------------------------------------------------------ */
/* Découverte des cliniques autour d'une zone (OpenStreetMap)          */
/* ------------------------------------------------------------------ */

export type Clinic = { name: string; url: URL; city?: string; point: Point };

/** Serveurs mesurés répondant en 40 à 50 s ; le premier, saturé, ne sert qu'en dernier recours. */
const OVERPASS = [
  "https://z.overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

type OsmElement = {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

/** Cabinets avec un site web, dédoublonnés par site, les plus proches d'abord. */
export function clinicsFromOsm(elements: OsmElement[], center: Point): Clinic[] {
  const byHost = new Map<string, Clinic>();
  for (const element of elements) {
    const tags = element.tags ?? {};
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    const raw = tags.website ?? tags["contact:website"];
    if (!raw || lat == null || lon == null) continue;
    const url = isPublicWebUrl(raw);
    if (!url) continue;
    const host = url.hostname.replace(/^www\./, "");
    if (byHost.has(host)) continue;
    byHost.set(host, {
      name: tags.name ?? host,
      url: new URL(url.origin),
      city: tags["addr:city"],
      point: { lat, lng: lon },
    });
  }
  return [...byHost.values()].sort(
    (a, b) => distanceKm(center, a.point) - distanceKm(center, b.point),
  );
}

async function discoverClinics(center: Point, radiusKm: number): Promise<Clinic[]> {
  const query = `[out:json][timeout:90];nwr["amenity"="veterinary"](around:${radiusKm * 1000},${center.lat},${center.lng});out tags center;`;
  for (const endpoint of OVERPASS) {
    try {
      const data = await fetchJson<{ elements?: OsmElement[] }>(
        `${endpoint}?data=${encodeURIComponent(query)}`,
        {
          timeoutMs: 100_000,
          retries: 0,
          minIntervalMs: 1000,
          cacheTtlMs: 30 * 86_400_000,
        },
      );
      if (data?.elements) return clinicsFromOsm(data.elements, center);
    } catch (error) {
      if (error instanceof CollectionDeadlineError) throw error;
    }
  }
  return [];
}

/* ------------------------------------------------------------------ */
/* Connecteurs                                                         */
/* ------------------------------------------------------------------ */

abstract class RecruiterConnector implements SourceConnector {
  readonly personal = true;
  readonly group: SourceGroup = "RECRUITERS";
  readonly acceptedContracts = PERSONAL_CONTRACTS;
  readonly warnings: string[] = [];
  /** Les sites sont multiples : leurs échecs sont consignés ici, pas par préfixe d'hôte. */
  readonly requestPrefixes: string[] = [];
  abstract readonly sourceSite: string;
  abstract readonly label: string;
  isEnabled() {
    return true;
  }
  abstract targets(): Promise<SiteTarget[]>;

  async fetchOffers(): Promise<RawOffer[]> {
    this.warnings.length = 0;
    const offers: RawOffer[] = [];
    let scanned = 0;
    try {
      const targets = await this.targets();
      let cursor = 0;
      const worker = async () => {
        for (;;) {
          const target = targets[cursor++];
          if (!target) return;
          try {
            offers.push(...(await scanSite(target, this.warnings)));
            scanned++;
          } catch (error) {
            // Un hôte qui refuse ou ralentit ne doit pas arrêter les autres sites.
            if (error instanceof CollectionDeadlineError) throw error;
            if (!(error instanceof RateLimitedError))
              this.warnings.push(`${target.company} : page illisible`);
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(3, targets.length) }, worker));
      if (!offers.length && scanned)
        this.warnings.push(`${scanned} site(s) lus, aucune annonce publiée`);
    } catch (error) {
      this.warnings.push(error instanceof Error ? error.message : "Source indisponible");
    }
    return offers;
  }
}

const CLINIC_WINDOW = 20;
const CLINIC_RADIUS_KM = 40;

class ClinicDiscoveryConnector extends RecruiterConnector {
  readonly sourceSite = "recruteurs/cliniques-autour";
  readonly label: string;
  constructor(private readonly area?: { city: string }) {
    super();
    this.label = `Pages recrutement · cabinets vétérinaires autour de ${area?.city ?? "Toulouse"}`;
  }
  /** Fenêtre tournante : tous les cabinets de la zone sont lus au fil des cycles. */
  async targets() {
    const center = (this.area ? await geocodeCityFull(this.area.city) : null) ?? TOULOUSE;
    const clinics = await discoverClinics(center, CLINIC_RADIUS_KM);
    if (!clinics.length) {
      this.warnings.push("Aucun cabinet avec site web trouvé dans OpenStreetMap pour cette zone");
      return [];
    }
    const key = `recruiterCursor:${this.area?.city ?? "Toulouse"}`;
    const saved = await prisma.siteSetting.findUnique({ where: { key } });
    const offset =
      Number((saved?.value as { offset?: number } | null)?.offset ?? 0) % clinics.length;
    const windowed = Array.from(
      { length: Math.min(CLINIC_WINDOW, clinics.length) },
      (_, i) => clinics[(offset + i) % clinics.length],
    );
    const next = { offset: (offset + CLINIC_WINDOW) % clinics.length };
    await prisma.siteSetting.upsert({
      where: { key },
      create: { key, value: next },
      update: { value: next },
    });
    this.warnings.push(
      `${windowed.length} cabinets lus sur ${clinics.length} dans la zone ; les autres au cycle suivant`,
    );
    return windowed.map((clinic) => ({
      url: clinic.url,
      company: clinic.name,
      city: clinic.city,
      point: clinic.point,
    }));
  }
}

export function recruiterConnectors(area?: {
  city: string;
  code: string;
  postcode?: string;
}): SourceEntry[] {
  return [{ id: "recruteurs-cabinets-autour", connector: new ClinicDiscoveryConnector(area) }];
}
