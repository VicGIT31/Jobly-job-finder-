import { load } from "cheerio";
import definitions from "../../../../config/personal-sources.json";
import { classifyJob } from "@/lib/job-taxonomy";
import { geocodeCity } from "./geocode";
import { distanceKm, TOULOUSE } from "@/lib/geo";
import { fetchText, fetchJson, mapPool, RateLimitedError, assertCollectionBudget } from "../http";
import { extractJobPosting, jobLocationCity, jobLocationCountry } from "../jsonld";
import { makePersonalOffer, PERSONAL_CONTRACTS, type PersonalOfferInput } from "../personal-offer";
import type { RawOffer } from "../normalize";
import type { SourceConnector } from "./types";

export type PersonalSourceDefinition = { id: string; label: string; kind: string; url: string; company?: string; pattern?: string; query?: string; place?: string; priority: number; universe: string };
const HTTP = { timeoutMs: 12000, retries: 1, minIntervalMs: 300 };
function priorityCity(city: string) { const point = geocodeCity(city); return point ? distanceKm(TOULOUSE, point) : 10000; }
export class PersonalConnector implements SourceConnector {
  readonly personal = true;
  readonly acceptedContracts = PERSONAL_CONTRACTS;
  readonly warnings: string[] = [];
  readonly sourceSite: string;
  readonly label: string;
  readonly requestPrefixes: string[];
  constructor(readonly definition: PersonalSourceDefinition) { this.label = definition.label; this.sourceSite = `${new URL(definition.url).hostname.replace(/^www\./, "")}/${definition.id}`; this.requestPrefixes = [new URL(definition.url).origin + "/"]; }
  isEnabled() { return true; }
  async fetchOffers(): Promise<RawOffer[]> {
    this.warnings.length = 0;
    const offers: RawOffer[] = [];
    try {
      switch (this.definition.kind) {
        case "teamtailor": await this.rss(offers); break;
        case "smartrecruiters": await this.smartRecruiters(offers); break;
        default: await this.html(offers);
      }
    } catch (error) {
      if (!(error instanceof RateLimitedError)) this.warnings.push(error instanceof Error ? error.message : "Source indisponible");
      else this.warnings.push(error.message);
    }
    return offers;
  }
  private async accept(input: PersonalOfferInput, offers: RawOffer[]) {
    if (classifyJob(input.title).universe !== this.definition.universe) return;
    const offer = await makePersonalOffer(input);
    if (offer) offers.push({ ...offer, sourceSite: this.sourceSite });
  }
  private async rss(offers: RawOffer[]) {
    for (let offset = 0; offset < 600; offset += 200) {
      assertCollectionBudget(); const url = new URL(this.definition.url); url.searchParams.set("per_page", "200"); url.searchParams.set("offset", String(offset));
      const xml = await fetchText(url, { ...HTTP, cacheTtlMs: 15 * 60000 });
      if (!xml || !/<rss[\s>]/i.test(xml)) { this.warnings.push("Flux RSS absent ou format modifié"); return; }
      const $ = load(xml, { xmlMode: true }), items = $("item").toArray();
      for (const item of items) {
        const node = $(item), field = (name: string) => node.find("*").filter((_, element) => element.type === "tag" && element.name.replace(/^.*:/, "") === name).first().text().trim();
        const remote = node.find("remoteStatus").text();
        await this.accept({ title: node.find("title").text(), company: this.definition.company!, city: field("city"), country: field("country"), description: node.find("description").text(), publishedAt: node.find("pubDate").text(), url: node.find("link").text(), remote: remote === "fully" ? "remote" : remote === "hybrid" ? "hybrid" : remote === "none" ? "onsite" : undefined }, offers);
      }
      if (items.length < 200) return;
    }
    this.warnings.push("Budget RSS atteint ; couverture partielle");
  }
  private async smartRecruiters(offers: RawOffer[]) {
    type Posting = { id: string; name: string; releasedDate?: string; location?: { city?: string; country?: string; latitude?: string; longitude?: string; remote?: boolean; hybrid?: boolean }; typeOfEmployment?: { id?: string; label?: string } };
    const postings: Posting[] = [];
    for (let offset = 0; offset < 500; offset += 100) {
      const url = new URL(this.definition.url); url.searchParams.set("country", "fr"); url.searchParams.set("limit", "100"); url.searchParams.set("offset", String(offset));
      const page = await fetchJson<{ content?: Posting[]; totalFound?: number }>(url, { ...HTTP, cacheTtlMs: 10 * 60000 });
      if (!page?.content) { this.warnings.push("Catalogue employeur illisible"); break; }
      postings.push(...page.content.filter((entry) => entry.location?.country?.toLowerCase() === "fr" && classifyJob(entry.name).universe === "COMMERCE"));
      if (offset + page.content.length >= (page.totalFound ?? 0) || page.content.length < 100) break;
      if (offset === 400) this.warnings.push("Budget employeur atteint ; couverture partielle");
    }
    postings.sort((a, b) => priorityCity(a.location?.city ?? "") - priorityCity(b.location?.city ?? ""));
    const results = await mapPool(postings.slice(0, 160), 3, async (posting) => {
      const detail = await fetchJson<Posting & { postingUrl?: string; active?: boolean; jobAd?: { sections?: Record<string, { text?: string }> } }>(`${this.definition.url}/${posting.id}`, { ...HTTP, cacheTtlMs: 60 * 60000 });
      if (!detail?.postingUrl || detail.active === false) return null;
      const description = Object.values(detail.jobAd?.sections ?? {}).map((section) => section.text ?? "").join("\n\n");
      return makePersonalOffer({ title: detail.name, company: this.definition.company!, city: detail.location?.city, country: detail.location?.country, description, url: detail.postingUrl, publishedAt: detail.releasedDate, contract: detail.typeOfEmployment?.id, lat: detail.location?.latitude ? Number(detail.location.latitude) : undefined, lng: detail.location?.longitude ? Number(detail.location.longitude) : undefined, remote: detail.location?.remote ? "remote" : detail.location?.hybrid ? "hybrid" : detail.location?.remote === false ? "onsite" : undefined });
    });
    offers.push(...results.filter((offer): offer is RawOffer => !!offer));
    if (postings.length > 160) this.warnings.push("160 détails employeur par cycle ; couverture partielle");
  }
  private async html(offers: RawOffer[]) {
    const { definition: source } = this;
    const links = new Map<string, string>();
    for (let page = 1; page <= (source.kind === "jsonld-board" ? 3 : 2); page++) {
      const url = new URL(source.url);
      if (source.kind === "france-travail") { url.searchParams.set("motsCles", source.query!); url.searchParams.set("offresPartenaires", "true"); url.searchParams.set("tri", "0"); if (source.place) { url.searchParams.set("lieux", source.place); url.searchParams.set("rayon", "100"); } if (page > 1) url.searchParams.set("range", `${(page - 1) * 20}-${page * 20 - 1}`); }
      else if (source.kind === "hellowork") { url.searchParams.set("k", source.query!); if (source.place) { url.searchParams.set("l", source.place); url.searchParams.set("ray", "100"); } url.searchParams.set("p", String(page)); }
      else if (page > 1) url.searchParams.set("paged", String(page));
      const html = await fetchText(url, { ...HTTP, cacheTtlMs: 10 * 60000 });
      if (!html) { this.warnings.push("Page de recherche inaccessible"); break; }
      const $ = load(html), previous = links.size;
      $("a[href]").each((_, element) => {
        const href = $(element).attr("href")!; let target: URL; try { target = new URL(href, source.url); } catch { return; }
        if (target.origin !== url.origin) return;
        const pattern = source.kind === "france-travail" ? /\/offres\/recherche\/detail\/[A-Z0-9]+$/i : source.kind === "hellowork" ? /\/fr-fr\/emplois\/\d+\.html/ : new RegExp(source.pattern!);
        if (!pattern.test(target.pathname) || target.search) return;
        const text = $(element).text().replace(/\s+/g, " ").trim();
        if (source.kind === "jsonld-board" && !/asv|auxiliaire|assistant.*v[eé]t[eé]rinaire/i.test(text + " " + target.pathname)) return;
        links.set(target.href, text);
      });
      if (links.size === previous) break;
      if (page === 2 && source.kind !== "jsonld-board") this.warnings.push("Deux pages de recherche par cycle ; couverture partielle");
    }
    const ordered = [...links.entries()].sort((a, b) => Number(/toulouse|blagnac|colomiers|lab[eè]ge|balma/i.test(b[1])) - Number(/toulouse|blagnac|colomiers|lab[eè]ge|balma/i.test(a[1])));
    const results = await mapPool(ordered.slice(0, 60), 3, async ([url]) => {
      if (source.kind === "france-travail") return this.franceTravail(url);
      const html = await fetchText(url, { ...HTTP, cacheTtlMs: 60 * 60000 }); if (!html) return null;
      const $ = load(html);
      const posting = extractJobPosting(html);
      if (!posting?.title) { if (!this.warnings.includes("Annonce sans données structurées lisibles")) this.warnings.push("Annonce sans données structurées lisibles"); return null; }
      const main = $("main").clone(); main.find("script,style,form,nav").remove();
      const description = posting.description || (source.kind === "jsonld-board" ? main.html() ?? "" : "");
      if (!description) { this.warnings.push("Description de l’annonce absente"); return null; }
      const title = load(`<span>${posting.title}</span>`)("span").text();
      const salary = posting.baseSalary as { value?: { minValue?: number; maxValue?: number; value?: number; unitText?: string } } | undefined;
      const unit = salary?.value?.unitText?.toUpperCase();
      return makePersonalOffer({ title, company: posting.hiringOrganization?.name ?? source.company ?? "Employeur non précisé", description, city: jobLocationCity(posting) ?? undefined, country: jobLocationCountry(posting) ?? "FR", url, publishedAt: posting.datePosted, validThrough: posting.validThrough, contract: [$("main").text().match(/(?:Contrat|Type de contrat)\s*(CDI|CDD|Intérim|Alternance|Stage)/i)?.[1] ?? "", ...(Array.isArray(posting.employmentType) ? posting.employmentType : [posting.employmentType ?? ""])].join(" "), remote: posting.jobLocationType === "TELECOMMUTE" ? "remote" : undefined, salaryMin: typeof salary?.value?.minValue === "number" ? salary.value.minValue : typeof salary?.value?.value === "number" ? salary.value.value : undefined, salaryMax: typeof salary?.value?.maxValue === "number" ? salary.value.maxValue : undefined, salaryPeriod: unit === "YEAR" ? "YEAR" : unit === "MONTH" ? "MONTH" : unit === "HOUR" ? "HOUR" : "UNKNOWN" });
    });
    offers.push(...results.filter((offer): offer is RawOffer => !!offer));
    if (ordered.length > 60) this.warnings.push("60 détails par source et cycle ; couverture partielle");
  }
  private async franceTravail(url: string): Promise<RawOffer | null> {
    const target = new URL(url), id = target.pathname.split("/").at(-1)!;
    const config = await fetchJson<{ pn330cwdescriptifoffreBff?: string }>(`${target.origin}/ihm-descriptifoffre/configuration.json`, { ...HTTP, cacheTtlMs: 86400000 });
    if (!config?.pn330cwdescriptifoffreBff) { this.warnings.push("Configuration publique France Travail inaccessible"); return null; }
    const base = new URL(config.pn330cwdescriptifoffreBff, target.origin); if (base.origin !== target.origin) throw new Error("Hôte de descriptif non autorisé");
    const detail = await fetchJson<{ intituleOffre?: string; descriptif?: string; lieuTravail?: string | { libelleCommuneLieuTravail?: string; libelleLieuTravail?: string }; salaire?: string; syntheseContrat?: string; etablissement?: { libelleEnseigne?: string }; dateCreation?: string }>(`${base.href.replace(/\/$/, "")}/offre/${encodeURIComponent(id)}`, { ...HTTP, minIntervalMs: 500, cacheTtlMs: 60 * 60000 });
    if (!detail?.intituleOffre || !detail.descriptif) { this.warnings.push("Descriptif France Travail inaccessible"); return null; }
    const location = typeof detail.lieuTravail === "string" ? detail.lieuTravail : detail.lieuTravail?.libelleCommuneLieuTravail ?? detail.lieuTravail?.libelleLieuTravail ?? "";
    const city = location.replace(/^\d{2,3}\s*-\s*/, "").replace(/\s*\(\d{2,5}\)\s*$/, "");
    if (classifyJob(detail.intituleOffre).universe !== this.definition.universe) return null;
    const amounts = [...(detail.salaire ?? "").matchAll(/(\d+(?:[.,]\d+)?)\s*Euros?/gi)].map((match) => Number(match[1].replace(",", ".")));
    return makePersonalOffer({ salaryMin: amounts[0], salaryMax: amounts[1], salaryPeriod: /annuel/i.test(detail.salaire ?? "") ? "YEAR" : /mensuel/i.test(detail.salaire ?? "") ? "MONTH" : /horaire/i.test(detail.salaire ?? "") ? "HOUR" : "UNKNOWN", title: detail.intituleOffre, company: detail.etablissement?.libelleEnseigne ?? "Employeur confidentiel (France Travail)", description: detail.descriptif, city, country: "FR", contract: detail.syntheseContrat, url, publishedAt: detail.dateCreation });
  }
}
export function personalConnectors(area?: { city: string; code: string; postcode?: string }) {
  return [...definitions].sort((a, b) => a.priority - b.priority).map((original) => {
    const definition = area && original.place ? { ...original, label: original.label.replace("Toulouse", area.city), place: original.kind === "france-travail" ? area.code : `${area.city}${area.postcode ? `-${area.postcode}` : ""}` } : original;
    return { id: definition.id, connector: new PersonalConnector(definition) };
  });
}
