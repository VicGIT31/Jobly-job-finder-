import { load } from "cheerio";
import bundled from "../../../../config/job-sources.json";
import candidates from "../../../../config/france-career-candidates.json";
import {
  assertCollectionBudget,
  fetchJson,
  fetchText,
  fetchWithRetry,
  getHttpFailures,
} from "../http";
import { extractJobPostings } from "../jsonld";
import { jsonLdOffer } from "../scope";
import { publicHttpUrl } from "../public-network";
import { isPathAllowed, parseRobots } from "../robots";
import type { RawOffer } from "../normalize";
import { boardEndpoint } from "./public-boards";
import { sourceDefinitionSchema, type SourceDefinition } from "./catalog";
import { searchDiscoverySeeds } from "./search-discovery";
import {
  discoveryId,
  drainObservedEmployers,
  enqueueDiscovery,
  readDiscoveryState,
  saveDiscoveryState,
  type DiscoveryState,
} from "./discovery-store";

const HTTP = {
  publicOnly: true,
  retries: 0,
  timeoutMs: 8000,
  minIntervalMs: 750,
  maxBodyBytes: 2_000_000,
};
const DAY = 86400000;
const CAREER =
  /career|carriere|recrut|rejoign|emploi|offres?|\bjobs?\b|join us|work with us|nous rejoindre/i;
const JOB_PATH =
  /\/(?:jobs?|offres?|annonces?|positions?|postings?|recrutement|careers?|carrieres?)(?:[/-])/i;
const SKIP = /(?:^|\.)(?:facebook|linkedin|instagram|youtube|twitter|google|tiktok|x)\.com$/i;

/** Reconnaissance par hôte strict puis normalisation au board, jamais par nom d'entreprise supposé. */
export function detectBoard(value: string, label?: string): SourceDefinition | null {
  const url = publicHttpUrl(value);
  if (!url || url.protocol !== "https:") return null;
  const parts = url.pathname.split("/").filter(Boolean);
  let kind: SourceDefinition["kind"];
  if (/^[a-z0-9-]+\.wd\d+\.myworkdayjobs\.com$/.test(url.hostname)) {
    kind = "workday";
    if (/^[a-z]{2}-[a-z]{2}$/i.test(parts[0] ?? "")) {
      if (!parts[1]) return null;
      url.pathname = `/${parts[0]}/${parts[1]}`;
    } else {
      if (!parts[0] || ["wday", "job"].includes(parts[0])) return null;
      url.pathname = `/${parts[0]}`;
    }
  } else {
    kind = /^(?:jobs|recrutement)\.inria\.fr$/.test(url.hostname)
      ? "inria"
      : url.hostname === "apply.workable.com" && parts[0] !== "j"
      ? "workable"
      : /^(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io$/.test(url.hostname)
      ? "greenhouse"
      : /^jobs(?:\.eu)?\.lever\.co$/.test(url.hostname)
        ? "lever"
        : url.hostname === "jobs.ashbyhq.com"
          ? "ashby"
          : /^(?:careers|jobs)\.smartrecruiters\.com$/.test(url.hostname)
            ? "smartrecruiters"
            : /^[a-z0-9-]+\.recruitee\.com$/.test(url.hostname)
              ? "recruitee"
              : /^[a-z0-9-]+\.teamtailor\.com$/.test(url.hostname)
                ? "teamtailor"
                : "html";
    if (kind === "html") return null;
    if (kind === "inria") {
      url.pathname = "/public/classic/fr/offres";
      url.search = "?filtre=stage-recherche";
    } else if (["recruitee", "teamtailor"].includes(kind)) {
      url.pathname = "/";
    } else {
      if (!parts[0] || /^(?:embed|embed\.js)$/i.test(parts[0])) return null;
      if (kind === "smartrecruiters") url.hostname = "careers.smartrecruiters.com";
      url.pathname = `/${parts[0]}`;
    }
  }
  if (kind !== "inria") url.search = "";
  const parsed = sourceDefinitionSchema.safeParse({
    id: discoveryId(url.href),
    kind,
    url: url.href,
    label: label || parts[0] || url.hostname,
    maxPages: 50,
    maxOffers: 1000,
    notes: "Découvert par lien public et validé automatiquement ; disponibilité externe variable.",
  });
  return parsed.success ? parsed.data : null;
}

/** Liens visibles, iframes ATS et URLs de configuration embarquées ; aucun script exécuté. */
export function discoveryLinks(html: string, base: string): string[] {
  const $ = load(html),
    found = new Set<string>();
  const origin = new URL(base);
  $("a[href],iframe[src]").each((_, element) => {
    const href = $(element).attr("href") ?? $(element).attr("src") ?? "";
    const url = publicHttpUrl(href, base);
    if (!url || SKIP.test(url.hostname) || /\.(?:pdf|zip|png|jpe?g|svg|mp4)$/i.test(url.pathname))
      return;
    const same = url.hostname.replace(/^www\./, "") === origin.hostname.replace(/^www\./, "");
    if (
      detectBoard(url.href) ||
      (CAREER.test(`${$(element).text()} ${url.pathname}`) &&
        (same || /career|carriere|recrut|emploi|jobs/i.test(url.hostname)))
    )
      found.add(url.href);
  });
  for (const match of html.replace(/\\\//g, "/").matchAll(/https:\/\/[^\s"'<>\\]+/g)) {
    const value = match[0].replace(/&amp;/g, "&");
    if (detectBoard(value)) found.add(value);
  }
  const links = [...found];
  const details = links.filter((url) => JOB_PATH.test(new URL(url).pathname) && !detectBoard(url));
  return [...links.filter((url) => !details.includes(url)), ...details.slice(0, 4)].slice(0, 24);
}

export type DiscoveryReport = {
  pages: number;
  added: number;
  directoryEmployers: number;
  pending: number;
  warnings: string[];
  offers: RawOffer[];
  sources: SourceDefinition[];
};

/** Pages de l'annuaire public parcourues automatiquement, reprise après redémarrage. */
async function directoryPage(state: DiscoveryState): Promise<number> {
  if (Date.now() - state.directoryAt < DAY) return 0;
  const query = `SELECT DISTINCT ?company ?website ?name WHERE {
    ?company wdt:P17 wd:Q142; wdt:P856 ?website; wdt:P31/wdt:P279* wd:Q4830453.
    OPTIONAL { ?company rdfs:label ?name FILTER(LANG(?name) = "fr") }
  } ORDER BY ?company ?website LIMIT 50 OFFSET ${state.directoryOffset}`;
  const url = new URL("https://query.wikidata.org/sparql");
  url.searchParams.set("query", query);
  url.searchParams.set("format", "json");
  const data = await fetchJson<{
    results?: { bindings?: Array<{ website?: { value?: string }; name?: { value?: string } }> };
  }>(url, { ...HTTP, timeoutMs: 25000 });
  const rows = data?.results?.bindings;
  if (!Array.isArray(rows)) return osmDirectoryPage(state);
  state.directoryAt = Date.now();
  state.directoryOffset = rows.length === 50 ? state.directoryOffset + 50 : 0;
  let count = 0;
  for (const row of rows) {
    const value = row.website?.value;
    const website = value ? publicHttpUrl(value) : null;
    if (website && enqueueDiscovery(state, website.href, row.name?.value ?? website.hostname))
      count++;
  }
  return count;
}

/** Repli indépendant : établissements OSM en France avec site publié, parcourus par ID et type. */
async function osmDirectoryPage(state: DiscoveryState): Promise<number> {
  const entity = state.osmType;
  const query = `[out:json][timeout:20];area["ISO3166-1"="FR"]["admin_level"="2"]->.fr;
    (${entity}(area.fr)["office"~"^(company|it|insurance|financial|marketing|advertising)$"]["website"](if:id()>${state.osmCursor});
     ${entity}(area.fr)["amenity"~"^(bank|veterinary)$"]["website"](if:id()>${state.osmCursor});
     ${entity}(area.fr)["shop"]["website"](if:id()>${state.osmCursor}););out tags 50;`;
  for (const endpoint of [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ]) {
    const data = await fetchJson<{
      elements?: Array<{ id: number; tags?: Record<string, string> }>;
    }>(`${endpoint}?data=${encodeURIComponent(query)}`, { ...HTTP, timeoutMs: 25000 });
    if (!Array.isArray(data?.elements)) continue;
    state.directoryAt = Date.now();
    if (data.elements.length >= 50)
      state.osmCursor = Math.max(...data.elements.map((entry) => entry.id));
    else {
      state.osmCursor = 0;
      state.osmType = entity === "node" ? "way" : entity === "way" ? "relation" : "node";
    }
    let count = 0;
    for (const entry of data.elements) {
      const url = entry.tags?.website;
      if (
        url &&
        enqueueDiscovery(
          state,
          /^https?:/.test(url) ? url : `https://${url}`,
          entry.tags?.name ?? "Employeur OSM",
        )
      )
        count++;
    }
    return count;
  }
  const failures = getHttpFailures().filter((failure) => /wikidata|overpass/.test(failure.url));
  throw new Error(
    `Annuaires Wikidata et OpenStreetMap indisponibles (${[...new Set(failures.map((failure) => failure.message))].join(", ") || "réponse illisible"}) ; reprise avec les employeurs connus`,
  );
}

export async function discoverSources(
  options: {
    maxPages?: number;
    directory?: boolean;
    seeds?: string[];
    prioritySeeds?: Array<{ url: string; label: string }>;
    search?: boolean;
  } = {},
): Promise<DiscoveryReport> {
  const state = await readDiscoveryState();
  const report: DiscoveryReport = {
    pages: 0,
    added: 0,
    directoryEmployers: 0,
    pending: 0,
    warnings: [],
    offers: [],
    sources: [],
  };
  const known = new Set(
    bundled.map((source) => {
      try {
        return boardEndpoint(sourceDefinitionSchema.parse(source));
      } catch {
        return source.url;
      }
    }),
  );
  for (const source of [...bundled, ...candidates])
    enqueueDiscovery(state, source.url, source.label);
  for (const [url, label] of drainObservedEmployers()) enqueueDiscovery(state, url, label);
  for (const url of options.seeds ?? []) enqueueDiscovery(state, url, new URL(url).hostname);
  for (const seed of options.prioritySeeds ?? []) enqueueDiscovery(state, seed.url, seed.label, 0, undefined, 5);
  const robots = new Map<
    string,
    { rules: ReturnType<typeof parseRobots>; sitemaps: string[] } | null
  >();
  try {
    if (options.search) {
      const search = await searchDiscoverySeeds();
      report.warnings.push(...search.warnings);
      for (const seed of search.seeds) enqueueDiscovery(state, seed.url, seed.label, 0, undefined, 4);
    }
    if (options.directory !== false && !state.frontier.some((entry) => (entry.priority ?? 0) > 0 && entry.nextAt <= Date.now())) {
      try {
        report.directoryEmployers = await directoryPage(state);
      } catch (error) {
        assertCollectionBudget();
        report.warnings.push(String(error));
      }
    }
    const maxPages = Math.min(200, Math.max(1, options.maxPages ?? 24));
    const visited = new Set<string>();
    let priorityPages = 0;
    while (report.pages < maxPages) {
      assertCollectionBudget();
      // Les liens carrières d'une entreprise viennent avant les nouvelles pages d'accueil.
      const due = state.frontier.filter((entry) => entry.nextAt <= Date.now() && !visited.has(entry.url));
      const ordinary = priorityPages >= Math.floor(maxPages * 0.75) ? due.filter((entry) => !(entry.priority > 0)) : [];
      const next = (ordinary.length ? ordinary : due)
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || b.depth - a.depth || a.nextAt - b.nextAt)[0];
      if (!next) break;
      visited.add(next.url);
      if (next.priority > 0) priorityPages++;
      report.pages++;
      try {
        const board = detectBoard(next.url, next.label);
        if (board) {
          if ((next.priority ?? 0) > 0) board.priority = "AI";
          const endpoint = boardEndpoint(board);
          // Catalogue embarqué déjà vérifié par son connecteur habituel.
          if (!known.has(endpoint)) {
            const data =
              board.kind === "inria"
                ? { jobs: /\/offres\/\d{4}-\d+/.test((await fetchText(endpoint, HTTP)) ?? "") ? [{ title: "Stages recherche Inria" }] : [] }
                : board.kind === "teamtailor"
                ? {
                    jobs: (await fetchText(endpoint, HTTP))?.includes("<item")
                      ? [{ title: "RSS public" }]
                      : [],
                  }
                : await fetchJson<Record<string, unknown> | unknown[]>(endpoint, {
                    ...HTTP,
                    // Ashby publishes full descriptions in its catalogue; some valid feeds exceed 2 MB.
                    maxBodyBytes: 8_000_000,
                    ...(board.kind === "workday"
                      ? {
                          method: "POST" as const,
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            limit: 1,
                            offset: 0,
                            searchText: "",
                            appliedFacets: {},
                          }),
                        }
                      : {}),
                  });
            const jobs = Array.isArray(data)
              ? data
              : (data?.jobs ?? data?.offers ?? data?.content ?? data?.jobPostings);
            if (
              !Array.isArray(jobs) ||
              !jobs.length ||
              !jobs.some(
                (job) => job && typeof job === "object" && (job.title || job.text || job.name),
              )
            )
              throw new Error("Board absent, vide ou réponse sans annonces structurées");
            const existing = state.sources.find(
              (source) => boardEndpoint(source.definition) === endpoint,
            );
            if (existing) existing.verifiedAt = Date.now();
            else if (state.sources.length < 2000) {
              state.sources.push({ definition: board, evidence: next.url, verifiedAt: Date.now() });
              report.sources.push(board);
              report.added++;
            }
          }
        } else {
          const url = publicHttpUrl(next.url);
          if (!url) throw new Error("URL découverte refusée");
          if (!robots.has(url.origin)) {
            const offset = getHttpFailures().length;
            const response = await fetchWithRetry(`${url.origin}/robots.txt`, HTTP);
            const body = response?.ok ? (await response.text()).slice(0, 500000) : null;
            // Un robots absent (404) n'est pas une panne ; fetchWithRetry conserve le statut.
            const missing = getHttpFailures()
              .slice(offset)
              .some(
                (failure) =>
                  failure.url === `${url.origin}/robots.txt` &&
                  [404, 410].includes(failure.status ?? 0),
              );
            robots.set(
              url.origin,
              body !== null || missing
                ? {
                    rules: parseRobots(body ?? ""),
                    sitemaps: [...(body ?? "").matchAll(/^sitemap\s*:\s*(https?:\/\/\S+)/gim)]
                      .map((match) => publicHttpUrl(match[1]))
                      .filter((map): map is URL => !!map && map.origin === url.origin)
                      .map((map) => map.href)
                      .slice(0, 5),
                  }
                : null,
            );
          }
          const policy = robots.get(url.origin);
          if (!policy || !isPathAllowed(policy.rules, url.pathname + url.search))
            throw new Error("Page non autorisée par robots.txt ou robots indisponible");
          const html = await fetchText(url, { ...HTTP, cacheTtlMs: DAY });
          if (!html) throw new Error("Page inaccessible");
          const postings = extractJobPostings(html);
          for (const posting of postings) {
            const offer = jsonLdOffer(posting, url.href, next.label);
            if (offer) report.offers.push(offer);
          }
          const listing =
            next.listingUrl && new URL(next.listingUrl).origin === url.origin
              ? next.listingUrl
              : url.href;
          if (
            postings.length &&
            !state.sources.some((source) => source.definition.url === listing) &&
            !known.has(listing) &&
            state.sources.length < 2000
          ) {
            const definition = sourceDefinitionSchema.parse({
              id: discoveryId(listing),
              label: next.label,
              kind: "html",
              url: listing,
              listingUrls: [listing],
              sitemapUrls: policy.sitemaps,
              jobUrlPattern: JOB_PATH.source,
              maxOffers: 500,
              maxSitemaps: 10,
              maxPages: 10,
              priority: (next.priority ?? 0) > 0 ? "AI" : "DEFAULT",
            });
            state.sources.push({ definition, evidence: url.href, verifiedAt: Date.now() });
            report.sources.push(definition);
            report.added++;
          }
          if (next.depth < 3)
            for (const link of discoveryLinks(html, url.href))
              enqueueDiscovery(
                state,
                link,
                next.label,
                next.depth + 1,
                next.listingUrl ?? url.href,
                next.priority,
              );
        }
        next.failures = 0;
        next.nextAt = Date.now() + 7 * DAY;
      } catch (error) {
        assertCollectionBudget();
        next.failures++;
        next.nextAt = Date.now() + Math.min(30, 2 ** Math.min(next.failures - 1, 5)) * DAY;
        report.warnings.push(
          `${next.url} : ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      for (const [url, label] of drainObservedEmployers()) enqueueDiscovery(state, url, label);
    }
  } catch (error) {
    report.warnings.push(error instanceof Error ? error.message : String(error));
  } finally {
    report.pending = state.frontier.filter((entry) => entry.nextAt <= Date.now()).length;
    await saveDiscoveryState(state);
  }
  return report;
}
