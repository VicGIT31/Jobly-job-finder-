import { PERSONAL_CONTRACTS } from "../personal-offer";
import { robotsAllows } from "../robots";
import { load } from "cheerio";
import type { RawOffer } from "../normalize";
import { extractJobPosting, jsonLdText } from "../jsonld";
import { extractMicrodataJobPosting } from "../structured-html";
import { fetchJson, fetchText, mapPool, RateLimitedError } from "../http";
import {
  frenchLocation,
  jsonLdOffer,
  makeStudentOffer,
  publicUrl,
  studentContract,
} from "../scope";
import type { SourceConnector, CollectionOptions } from "./types";
import type { SourceDefinition } from "./catalog";
import { franceTravailPublicDetail } from "./france-travail-public";
import { readCatalogCursor, saveCatalogCursor, selectCatalogDetails } from "../catalog-rotation";
import { inriaOffer } from "./research-page";

const makeBoardOffer = (input: Parameters<typeof makeStudentOffer>[0]) => makeStudentOffer(input, { baristaContracts: true });

const HTTP = { publicOnly: true, minIntervalMs: 750, timeoutMs: 20_000, retries: 1 };
const DETAIL = { ...HTTP, cacheTtlMs: 4 * 60 * 60 * 1000 };
const SITEMAP = { ...HTTP, cacheTtlMs: 60 * 60 * 1000 };
const text = (value: unknown): string => (typeof value === "string" ? value : "");
const decode = (value: string) => jsonLdText(value.replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1"));

export function extractLinks(html: string, base: string, pattern: RegExp): string[] {
  const urls = new Set<string>();
  for (const match of html.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)) {
    const url = publicUrl(decode(match[1]), base);
    if (url && new URL(url).hostname === new URL(base).hostname && pattern.test(url)) urls.add(url);
  }
  return [...urls];
}

export function sitemapEntries(xml: string): Array<{ url: string; modified: string }> {
  const entries: Array<{ url: string; modified: string }> = [];
  for (const match of xml.matchAll(/<(?:url|sitemap)\b[^>]*>([\s\S]*?)<\/(?:url|sitemap)>/gi)) {
    const url = publicUrl(decode(/<loc\b[^>]*>([\s\S]*?)<\/loc>/i.exec(match[1])?.[1] ?? ""));
    if (url)
      entries.push({ url, modified: /<lastmod[^>]*>(.*?)<\/lastmod>/i.exec(match[1])?.[1] ?? "" });
  }
  return entries;
}

async function requiredJson<T>(url: string, options = HTTP): Promise<T> {
  const value = await fetchJson<T>(url, options);
  if (value === null) throw new Error(`Réponse JSON publique absente ou illisible : ${url}`);
  return value;
}
async function requiredText(url: string, options = HTTP): Promise<string> {
  if (!(await robotsAllows(url))) throw new Error(`Page interdite ou robots indisponible : ${url}`);
  const value = await fetchText(url, options);
  if (value === null) throw new Error(`Page publique inaccessible : ${url}`);
  return value;
}

export function boardEndpoint(source: SourceDefinition): string {
  const url = new URL(source.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const slug = encodeURIComponent(parts[0] ?? "");
  switch (source.kind) {
    case "greenhouse":
      return `https://${url.hostname.includes(".eu.") ? "boards-api.eu.greenhouse.io" : "boards-api.greenhouse.io"}/v1/boards/${slug}/jobs?content=true`;
    case "lever":
      return `https://${url.hostname.includes(".eu.") ? "api.eu.lever.co" : "api.lever.co"}/v0/postings/${slug}?mode=json`;
    case "ashby":
      return `https://api.ashbyhq.com/posting-api/job-board/${slug}`;
    case "workable":
      return `https://www.workable.com/api/accounts/${slug}?details=true`;
    case "smartrecruiters":
      return `https://api.smartrecruiters.com/v1/companies/${slug}/postings`;
    case "recruitee":
      return `${url.origin}/api/offers/`;
    case "teamtailor":
      return `${url.origin}/jobs.rss`;
    case "workday": {
      const tenant = url.hostname.split(".")[0];
      const board = parts.length > 1 ? parts[1] : parts[0];
      return `${url.origin}/wday/cxs/${tenant}/${encodeURIComponent(board)}/jobs`;
    }
    default:
      return source.url;
  }
}

/** Un connecteur par entreprise : les erreurs restent attribuables dans /admin/sources. */
export class PublicBoardConnector implements SourceConnector {
  readonly sourceSite: string;
  readonly label: string;
  readonly warnings: string[] = [];
  readonly acceptedContracts = PERSONAL_CONTRACTS;
  coverage?: import("./types").CollectionCoverage;
  readonly rejectedPostings: Array<{ title: string; url: string; reason: string }> = [];
  readonly requestPrefixes: string[];
  readonly snapshotUrlPrefixes: string[];
  readonly priority: "AI" | "DEFAULT";
  private onBatch?: CollectionOptions["onBatch"];
  constructor(readonly definition: SourceDefinition) {
    this.priority = definition.priority;
    this.sourceSite = new URL(definition.url).hostname.replace(/^www\./, "");
    this.label = definition.label;
    this.requestPrefixes = [boardEndpoint(definition).split("?")[0]];
    if (definition.kind === "html") this.requestPrefixes[0] = new URL(definition.url).origin;
    const url = new URL(definition.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const board = parts.at(-1);
    this.snapshotUrlPrefixes =
      definition.kind === "recruitee" ? [`${url.origin}/o/`] : definition.kind === "teamtailor" ? [`${url.origin}/jobs/`] : definition.kind === "html"
        ? []
        : definition.kind === "workday"
          ? ["", "fr-FR/", "en-US/"].map((locale) => `${url.origin}/${locale}${board}/job/`)
          : definition.kind === "smartrecruiters"
            ? [`https://jobs.smartrecruiters.com/${parts[0]}/`]
            : [`${url.origin}/${parts[0]}/`];
  }
  isEnabled(): boolean {
    return this.definition.enabled;
  }

  private mapDetails<T>(
    items: readonly T[],
    worker: (item: T) => Promise<RawOffer | null>,
  ): Promise<RawOffer[]> {
    return mapPool(items, 2, async (item) => {
      try {
        return await worker(item);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!this.warnings.includes(message)) this.warnings.push(message);
        throw error;
      }
    });
  }

  async fetchOffers(options: CollectionOptions = {}): Promise<RawOffer[]> {
    this.onBatch = options.onBatch;
    const offers: RawOffer[] = [];
    this.warnings.length = 0;
    this.coverage = undefined;
    this.rejectedPostings.length = 0;
    try {
      switch (this.definition.kind) {
        case "inria":
          await this.inria(offers);
          break;
        case "teamtailor":
          await this.teamtailor(offers);
          break;
        case "html":
          await this.html(offers);
          break;
        case "workday":
          await this.workday(offers);
          break;
        case "smartrecruiters":
          await this.smartRecruiters(offers);
          break;
        default:
          await this.simpleBoard(offers);
      }
    } catch (error) {
      if (!offers.length) throw error;
      this.warnings.push(error instanceof Error ? error.message : String(error));
    }
    const unique = new Map(offers.map((offer) => [offer.sourceUrl, offer]));
    this.finalizeCoverage(unique.size);
    return [...unique.values()].slice(0, this.definition.maxOffers);
  }

  private async append(offers: RawOffer[], batch: RawOffer[]): Promise<void> {
    const room = Math.max(0, this.definition.maxOffers - offers.length);
    const kept = batch.slice(0, room);
    offers.push(...kept);
    if (kept.length) await this.onBatch?.(kept);
  }

  private finalizeCoverage(count: number): void {
    if (count > this.definition.maxOffers)
      this.warnings.push("Budget d'offres atteint ; couverture partielle");
    if (this.coverage) {
      this.coverage.accepted = Math.min(count, this.definition.maxOffers);
      if (this.coverage.listingsSeen < this.coverage.catalogTotal && !this.warnings.length)
        this.warnings.push(
          `${this.coverage.listingsSeen}/${this.coverage.catalogTotal} annonces parcourues ; catalogue mouvant ou couverture partielle`,
        );
      this.coverage.complete =
        this.coverage.listingsSeen >= this.coverage.catalogTotal && !this.warnings.length;
    }
  }

  private async teamtailor(offers: RawOffer[]): Promise<void> {
    const xml = await requiredText(boardEndpoint(this.definition));
    const $ = load(xml, { xmlMode: true });
    const items = $("item").toArray();
    if (!/<rss[\s>]/i.test(xml)) throw new Error("Flux Teamtailor absent");
    for (const item of items) {
      const node = $(item);
      const field = (name: string) => node.find("*").filter((_, element) => element.type === "tag" && element.name.replace(/^.*:/, "") === name).first().text().trim();
      const offer = makeBoardOffer({ title: field("title"), company: this.definition.company ?? this.definition.label,
        city: field("city"), country: field("country"), description: jsonLdText(field("description")),
        url: field("link"), publishedAt: field("pubDate") });
      if (offer) await this.append(offers, [offer]);
    }
    // Le flux peut être plafonné : aucun retrait d'offre fondé sur son absence du RSS.
    this.coverage = { mode: "RSS public", catalogTotal: items.length, listingsSeen: items.length, detailsRead: items.length, accepted: offers.length, complete: false };
    this.warnings.push("Flux RSS potentiellement plafonné ; couverture partielle");
  }

  private async inria(offers: RawOffer[]): Promise<void> {
    let next: string | undefined = this.definition.url;
    const seenPages = new Set<string>(), seenJobs = new Set<string>();
    this.coverage = { mode: "Stages recherche Inria", catalogTotal: 0, listingsSeen: 0, detailsRead: 0, accepted: 0, complete: false };
    for (let page = 0; next && page < this.definition.maxPages; page++) {
      if (seenPages.has(next)) { this.warnings.push("Pagination recherche répétée"); break; }
      seenPages.add(next);
      if (!await robotsAllows(next)) throw new Error("Page de recherche non autorisée");
      const html = await requiredText(next, SITEMAP);
      const links = extractLinks(html, next, /\/public\/classic\/fr\/offres\/\d{4}-\d+$/).filter((url) => !seenJobs.has(url));
      const $ = load(html);
      const total = /([\d\s]+) offres? en cours/i.exec($("main").text())?.[1]?.replace(/\s/g, "");
      if (total) this.coverage.catalogTotal = Number(total);
      if (!links.length && page === 0 && this.coverage.catalogTotal !== 0) this.warnings.push("Liste recherche sans liens exploitables");
      for (let i = 0; i < links.length; i += 10) {
        const batch = links.slice(i, i + 10); batch.forEach((url) => seenJobs.add(url));
        this.coverage.listingsSeen = seenJobs.size;
        await this.append(offers, await this.mapDetails(batch, async (url) => {
          if (!await robotsAllows(url)) throw new Error("Fiche recherche non autorisée");
          const detail = await requiredText(url, DETAIL); this.coverage!.detailsRead++;
          const offer = inriaOffer(detail, url);
          if (!offer) this.rejectedPostings.push({ title: url, url, reason: "Lieu, contrat, échéance ou missions hors périmètre" });
          return offer;
        }));
        if (offers.length >= this.definition.maxOffers) { this.warnings.push("Budget d'offres recherche atteint"); return; }
      }
      const more = $("a[rel=next], a").filter((_, e) => /suivant|next/i.test($(e).text()) || $(e).attr("rel") === "next").first().attr("href");
      next = more ? publicUrl(more, next) ?? undefined : undefined;
      if (next && new URL(next).hostname !== new URL(this.definition.url).hostname) next = undefined;
      if (next && page + 1 === this.definition.maxPages) this.warnings.push("Budget de pages recherche atteint");
    }
    if (!this.coverage.catalogTotal) this.coverage.catalogTotal = seenJobs.size;
  }

  private async simpleBoard(offers: RawOffer[]): Promise<void> {
    const source = this.definition;
    const data = await requiredJson<unknown>(boardEndpoint(source));
    const envelope = data as { jobs?: unknown[]; offers?: unknown[] };
    const jobs = Array.isArray(data) ? data : envelope?.jobs ?? envelope?.offers;
    if (!Array.isArray(jobs)) throw new Error("Format du board modifié : tableau d'offres absent");
    this.coverage = {
      mode: "flux public complet",
      catalogTotal: jobs.length,
      listingsSeen: jobs.length,
      detailsRead: jobs.length,
      accepted: 0,
      complete: false,
    };
    for (const item of jobs) {
      const job = item as Record<string, unknown>;
      const category = job.categories as { location?: string; commitment?: string } | undefined;
      const location = job.location as string | { name?: string; city?: string; country_code?: string } | undefined;
      const address = job.address as { postalAddress?: { addressCountry?: string } } | undefined;
      const secondary = (Array.isArray(job.secondaryLocations) ? job.secondaryLocations : Array.isArray(job.locations) ? job.locations : []) as Array<{ location?: string; city?: string; country_code?: string; country?: string; address?: { postalAddress?: { addressCountry?: string } } }>;
      const primaryCity = text(job.city) || (category?.location ?? (typeof location === "string" ? location : (location?.city ?? location?.name ?? "")));
      const primaryCountry = address?.postalAddress?.addressCountry ?? (typeof location === "object" ? location.country_code : undefined) ?? (text(job.country_code || job.country) || undefined);
      const frenchSecondary = secondary.filter((item) => frenchLocation(item.city ?? item.location ?? "", item.country_code ?? item.country ?? item.address?.postalAddress?.addressCountry));
      const fallback = !frenchLocation(primaryCity, primaryCountry) ? frenchSecondary[0] : undefined;
      const raw = makeBoardOffer({
        title: text(job.title || job.text),
        company: (source.company ?? (source.kind === "workable" ? text((data as { name?: string }).name) : "")) || source.label,
        city: fallback ? fallback.city ?? fallback.location ?? primaryCity : primaryCity,
        country: fallback ? "FR" : primaryCountry,
        contract: category?.commitment ?? text(job.employmentType || job.employment_type_code || job.employment_type),
        description:
          [text(job.descriptionPlain) || jsonLdText(text(job.content || job.descriptionHtml || job.description)),
            ...(Array.isArray(job.lists) ? job.lists.map((list) => {
              const section = list as { text?: string; content?: string };
              return `${text(section.text)}\n${jsonLdText(text(section.content))}`;
            }) : [])].join("\n\n"),
        url: text(job.absolute_url || job.hostedUrl || job.jobUrl || job.careers_url || job.url),
        publishedAt:
          typeof job.createdAt === "number"
            ? job.createdAt
            : text(job.first_published || job.publishedAt || job.created_at) || undefined,
        ...(job.workplaceType === "Remote"
          ? { remote: "remote" }
          : job.workplaceType === "Hybrid"
            ? { remote: "hybride" }
            : {}),
      });
      if (raw) {
        raw.locations = frenchSecondary.map((item) => ({ city: (item.city ?? item.location ?? "").slice(0, 120), countryCode: "FR" }));
        await this.append(offers, [raw]);
      }
      if (offers.length >= source.maxOffers) { if (jobs.length > source.maxOffers) this.warnings.push("Budget d'offres atteint ; couverture partielle"); break; }
    }
  }

  private async workday(offers: RawOffer[]): Promise<void> {
    const source = this.definition;
    const endpoint = boardEndpoint(source);
    const seen = new Set<string>();
    let countryFacet: string | undefined;
    let studentFacets: Record<string, string[]> = {};
    let resolvedFacets = false;
    const cursorKey = `${source.id}:workday`;
    const resumePage = this.onBatch ? Math.max(0, Math.min(source.maxPages - 1, Number(await readCatalogCursor(cursorKey)) || 0)) : 0;
    type Posting = { title?: string; externalPath?: string; locationsText?: string };
    type Facet = { facetParameter?: string; descriptor?: string; id?: string; values?: Facet[] };
    type Page = { total?: number; jobPostings?: Posting[]; facets?: Facet[] };
    const findFrance = (facets: Facet[]): string | undefined => {
      for (const facet of facets) {
        if (facet.facetParameter === "locationCountry") {
          const value = facet.values?.find((entry) =>
            /^(france|fr)$/i.test(entry.descriptor ?? ""),
          );
          if (value?.id) return value.id;
        }
        const nested = findFrance(facet.values ?? []);
        if (nested) return nested;
      }
      return undefined;
    };
    const findStudents = (facets: Facet[]): Record<string, string[]> => {
      const result: Record<string, string[]> = {};
      for (const facet of facets) {
        if (
          facet.facetParameter &&
          /workerSubType|jobType|workerType|employmentType/i.test(facet.facetParameter)
        ) {
          const ids = facet.values
            ?.filter((entry) =>
              /apprent|intern|trainee.*student|stagiaire|alternant/i.test(entry.descriptor ?? ""),
            )
            .map((entry) => entry.id)
            .filter((id): id is string => !!id);
          if (ids?.length) result[facet.facetParameter] = ids;
        }
        Object.assign(result, findStudents(facet.values ?? []));
      }
      return result;
    };
    // Les facettes étudiant couvrent tout le catalogue, sans dépendre de mots-clés.
    const queries = ["", ...source.queries];
    for (const query of queries) {
      if (resolvedFacets && Object.keys(studentFacets).length && query !== "") break;
      let queryTotal: number | undefined;
      for (let page = 0; page < source.maxPages; page++) {
        const result = await fetchJson<Page>(endpoint, {
          ...HTTP,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            limit: 20,
            offset: page * 20,
            searchText: query,
            appliedFacets: {
              ...(countryFacet ? { locationCountry: [countryFacet] } : {}),
              ...studentFacets,
            },
          }),
        });
        if (!result || !Array.isArray(result.jobPostings))
          throw new Error("Recherche Workday inaccessible ou format modifié");
        // Ne pas changer les filtres au milieu d'une pagination.
        if (page === 0 && !resolvedFacets) {
          resolvedFacets = true;
          const france = findFrance(result.facets ?? []);
          studentFacets = findStudents(result.facets ?? []);
          countryFacet = france;
          if (france || Object.keys(studentFacets).length) {
            page--;
            continue;
          }
        }
        // Workday renvoie souvent total:0 après offset:0, même avec 20 annonces.
        // Le total du premier résultat filtré est le compteur de ce parcours.
        if (page === 0 && typeof result.total === "number") queryTotal = result.total;
        this.coverage ??= {
          mode: Object.keys(studentFacets).length
            ? "catalogue étudiant via facettes"
            : "catalogue par titre étudiant",
          catalogTotal: queryTotal ?? 0,
          listingsSeen: 0,
          detailsRead: 0,
          accepted: 0,
          complete: false,
        };
        const previousSeen = seen.size;
        const candidates = result.jobPostings.filter((job) => {
          const path = job.externalPath;
          if (!path || !path.startsWith("/job/") || seen.has(path)) return false;
          seen.add(path);
          return Object.keys(studentFacets).length > 0 || !!studentContract(job.title ?? "");
        });
        this.coverage.listingsSeen = seen.size;
        if (page > 0 && result.jobPostings.length && seen.size === previousSeen) {
          this.warnings.push("Pagination Workday répétée ; couverture partielle");
          break;
        }
        const mapped = await this.mapDetails(candidates, async (job) => {
          const detailUrl = endpoint.replace(/\/jobs$/, job.externalPath!);
          const detail = await requiredJson<{
            jobPostingInfo?: {
              title?: string;
              jobDescription?: string;
              location?: string;
              additionalLocations?: string[];
              startDate?: string;
              workerSubType?: string;
              jobType?: string;
              country?: { descriptor?: string };
              jobRequisitionLocation?: { descriptor?: string; country?: { alpha2Code?: string } };
              externalUrl?: string;
              canApply?: boolean;
              posted?: boolean;
            };
          }>(detailUrl, DETAIL);
          const info = detail.jobPostingInfo;
          if (!info) throw new Error("Format du détail Workday modifié");
          this.coverage!.detailsRead++;
          if (info.canApply === false || info.posted === false) {
            this.rejectedPostings.push({
              title: info.title ?? job.title ?? "",
              url: info.externalUrl ?? detailUrl,
              reason: "Annonce fermée",
            });
            return null;
          }
          const offer = makeBoardOffer({
            title: info.title ?? job.title ?? "",
            company: source.company ?? source.label,
            description: jsonLdText(info.jobDescription ?? ""),
            city:
              info.location ?? info.jobRequisitionLocation?.descriptor ?? job.locationsText ?? "",
            country: info.jobRequisitionLocation?.country?.alpha2Code ?? info.country?.descriptor ?? (countryFacet ? "FR" : undefined),
            contract: info.workerSubType ?? info.jobType,
            url: info.externalUrl ?? `${source.url.replace(/\/$/, "")}${job.externalPath}`,
            publishedAt: info.startDate,
          });
          if (offer) {
            offer.siteLabel = info.jobRequisitionLocation?.descriptor?.slice(0, 200);
            offer.locations = (info.additionalLocations ?? []).filter((city) => frenchLocation(city)).map((city) => ({ city: city.slice(0, 120), countryCode: "FR" }));
          }
          if (!offer)
            this.rejectedPostings.push({
              title: info.title ?? job.title ?? "",
              url: info.externalUrl ?? detailUrl,
              reason: "Pays, contrat ou missions hors périmètre étudiant",
            });
          return offer;
        });
        await this.append(offers, mapped);
        if (this.onBatch) await saveCatalogCursor(cursorKey, String(page === 0 && resumePage > 1 ? resumePage : page + 1));
        if (offers.length >= source.maxOffers) {
          this.warnings.push("Budget d'offres atteint ; couverture partielle");
          return;
        }
        if (
          !result.jobPostings.length ||
          (queryTotal !== undefined && (page + 1) * 20 >= queryTotal)
        )
          { if (this.onBatch) await saveCatalogCursor(cursorKey, "0"); break; }
        if (page + 1 === source.maxPages)
          this.warnings.push(`Budget de pages atteint pour « ${query} »`);
        if (page === 0 && resumePage > 1) page = resumePage - 1;
      }
      // La recherche vide couvre toutes les annonces françaises. Les mots-clés
      // ne servent de repli que si ce parcours a été limité par le budget.
      if (query === "" && !this.warnings.some((warning) => warning.includes("Budget de pages")))
        break;
    }
  }

  private async smartRecruiters(offers: RawOffer[]): Promise<void> {
    const source = this.definition;
    const endpoint = boardEndpoint(source);
    const seen = new Set<string>();
    type Job = {
      id: string;
      name?: string;
      ref?: string;
      location?: { city?: string; country?: string };
      typeOfEmployment?: { id?: string; label?: string };
    };
    for (const query of [""]) {
      let queryTotal: number | undefined;
      for (let page = 0; page < source.maxPages; page++) {
        const url = new URL(endpoint);
        url.searchParams.set("limit", "100");
        url.searchParams.set("offset", String(page * 100));
        url.searchParams.set("q", query);
        url.searchParams.set("country", "fr");
        const result = await requiredJson<{ totalFound?: number; content?: Job[] }>(url.href);
        if (!Array.isArray(result.content)) throw new Error("Format SmartRecruiters modifié");
        if (page === 0 && typeof result.totalFound === "number") queryTotal = result.totalFound;
        this.coverage ??= {
          mode: "catalogue France",
          catalogTotal: queryTotal ?? 0,
          listingsSeen: 0,
          detailsRead: 0,
          accepted: 0,
          complete: false,
        };
        const previousSeen = seen.size;
        const candidates = result.content.filter((job) => {
          if (seen.has(job.id)) return false;
          seen.add(job.id);
          return (
            frenchLocation(job.location?.city ?? "", job.location?.country) &&
            (/\bbaristas?\b/i.test(job.name ?? "") || !!studentContract(
              job.name ?? "",
              job.typeOfEmployment?.label ?? job.typeOfEmployment?.id,
            ))
          );
        });
        this.coverage.listingsSeen = seen.size;
        if (page > 0 && result.content.length && seen.size === previousSeen) {
          this.warnings.push("Pagination SmartRecruiters répétée ; couverture partielle");
          break;
        }
        const mapped = await this.mapDetails(candidates, async (job) => {
          const detail = await requiredJson<{
            name?: string;
            company?: { name?: string };
            location?: { city?: string; country?: string };
            releasedDate?: string;
            typeOfEmployment?: { label?: string };
            applyUrl?: string;
            jobAd?: { sections?: Record<string, { text?: string }> };
          }>(`${endpoint}/${encodeURIComponent(job.id)}`, DETAIL);
          this.coverage!.detailsRead++;
          return makeBoardOffer({
            title: detail.name ?? job.name ?? "",
            company: source.company ?? detail.company?.name ?? source.label,
            city: detail.location?.city ?? job.location?.city ?? "",
            country: detail.location?.country ?? job.location?.country,
            contract: detail.typeOfEmployment?.label,
            description: Object.values(detail.jobAd?.sections ?? {})
              .map((section) => jsonLdText(section.text ?? ""))
              .join("\n\n"),
            url: `https://jobs.smartrecruiters.com/${new URL(source.url).pathname.split("/").filter(Boolean)[0]}/${job.id}`,
            publishedAt: detail.releasedDate,
          });
        });
        await this.append(offers, mapped);
        if (offers.length >= source.maxOffers) {
          this.warnings.push("Budget d'offres atteint ; couverture partielle");
          return;
        }
        if (!result.content.length || (queryTotal !== undefined && (page + 1) * 100 >= queryTotal))
          break;
        if (page + 1 === source.maxPages)
          this.warnings.push(`Budget de pages atteint pour « ${query} »`);
      }
    }
  }

  private async html(offers: RawOffer[]): Promise<void> {
    const source = this.definition;
    const pattern = new RegExp(source.jobUrlPattern ?? "/(?:jobs?|offres|annonce)/", "i");
    const urls = new Map<string, string>();
    const sitemapQueue = [...source.sitemapUrls];
    const seenMaps = new Set<string>();
    while (sitemapQueue.length && seenMaps.size < source.maxSitemaps) {
      const sitemap = sitemapQueue.shift()!;
      if (seenMaps.has(sitemap)) continue;
      seenMaps.add(sitemap);
      const xml = await requiredText(sitemap, SITEMAP);
      if (!/<(?:sitemapindex|urlset)\b/i.test(xml))
        throw new Error(`Sitemap illisible : ${sitemap}`);
      const entries = sitemapEntries(xml);
      if (/<sitemapindex\b/i.test(xml)) {
        const maps = entries.filter(
          (entry) => new URL(entry.url).hostname === new URL(sitemap).hostname,
        );
        const jobMaps = maps.filter((entry) => /job|offre|annonce/i.test(entry.url));
        sitemapQueue.push(...(jobMaps.length ? jobMaps : maps).map((entry) => entry.url));
      } else {
        for (const entry of entries) {
          if (
            new URL(entry.url).hostname !== new URL(source.url).hostname ||
            !pattern.test(entry.url)
          )
            continue;
          // Un slug générique ne prouve ni le contrat ni le métier : lire le JobPosting.
          urls.set(entry.url, entry.modified);
        }
      }
    }
    if (sitemapQueue.length)
      this.warnings.push("Budget de sitemaps atteint ; couverture partielle");

    const listingUrls = source.listingUrls.length
      ? source.listingUrls
      : source.sitemapUrls.length
        ? []
        : [source.url];
    for (const listing of listingUrls) {
      const seenPages = new Set<string>();
      for (let page = 0; page < (source.pagination ? source.maxPages : 1); page++) {
        const url = new URL(listing);
        if (source.pagination) {
          const value = source.pagination.start + source.pagination.step * page;
          url.searchParams.set(
            source.pagination.param,
            source.pagination.param === "range"
              ? `${value}-${value + source.pagination.step - 1}`
              : String(value),
          );
        }
        const html = await requiredText(url.href);
        const embedded = extractJobPosting(html);
        if (embedded) {
          const offer = jsonLdOffer(embedded, url.href, source.company, source.defaultCountry, true);
          if (offer) await this.append(offers, [offer]);
        }
        const links = extractLinks(html, url.href, pattern);
        if (!links.length) {
          if (page === 0 && !embedded && !/noresults|aucun[e]? (?:offre|r[eé]sultat)|0 r[eé]sultat/i.test(html))
            this.warnings.push("Page sans liens d'offres : rendu dynamique ou format modifié");
          break;
        }
        const fingerprint = links.join("|");
        if (seenPages.has(fingerprint)) {
          this.warnings.push("Pagination répétée par la source ; arrêt");
          break;
        }
        seenPages.add(fingerprint);
        for (const link of links) urls.set(link, "");
        if (source.pagination && page + 1 === source.maxPages)
          this.warnings.push("Budget de pages atteint ; couverture partielle");
      }
    }

    const candidates = [...urls].sort((a, b) => b[1].localeCompare(a[1]));
    this.coverage = {
      mode: source.sitemapUrls.length ? "catalogue sitemap public" : "pages publiques",
      catalogTotal: candidates.length,
      listingsSeen: 0,
      detailsRead: 0,
      accepted: 0,
      complete: false,
    };
    if (candidates.length > source.maxOffers)
      this.warnings.push(
        `${candidates.length} annonces candidates ; budget ${source.maxOffers} détails`,
      );
    const { selected, nextCursor } = selectCatalogDetails(
      candidates,
      source.maxOffers,
      await readCatalogCursor(source.id),
    );
    let parsed = 0;
    for (let i = 0; i < selected.length; i += 20) {
      const batch = selected.slice(i, i + 20);
      await this.append(offers,
        await this.mapDetails(batch, async ([url]) => {
          const html = await requiredText(url, DETAIL);
          this.coverage!.listingsSeen++;
          this.coverage!.detailsRead++;
          const posting = extractJobPosting(html) ?? extractMicrodataJobPosting(html);
          if (!posting) {
            if (new URL(url).hostname === "candidat.francetravail.fr") {
              const offer = await franceTravailPublicDetail(url);
              // Le flux peut être lisible tout en donnant un contrat hors périmètre.
              parsed++;
              return offer;
            }
            return null;
          }
          parsed++;
          return jsonLdOffer(posting, url, source.company, source.defaultCountry, true);
        }),
      );
    }
    await saveCatalogCursor(source.id, nextCursor);
    if (candidates.length && !parsed)
      this.warnings.push("Aucun JobPosting lisible dans les pages d'annonces");
    else if (parsed < this.coverage.detailsRead)
      this.warnings.push(`${this.coverage.detailsRead - parsed} page(s) sans JobPosting lisible`);
  }
}

export function isExpectedBlock(error: unknown): boolean {
  return error instanceof RateLimitedError;
}
