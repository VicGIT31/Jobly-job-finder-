import { readCatalogCursor, saveCatalogCursor, selectCatalogDetails } from "../catalog-rotation";
import { load } from "cheerio";
import definitions from "../../../../config/personal-sources.json";
import { classifyJob } from "../job-classifier";
import { geocodeCity } from "./geocode";
import { distanceKm, TOULOUSE } from "@/lib/geo";
import { fetchText, fetchJson, mapPool, RateLimitedError, assertCollectionBudget } from "../http";
import { extractJobPosting, jobLocationCity, jobLocationCountry } from "../jsonld";
import { makePersonalOffer, PERSONAL_CONTRACTS, type PersonalOfferInput } from "../personal-offer";
import { robotsAllows } from "../robots";
import type { RawOffer } from "../normalize";
import type { SourceConnector } from "./types";

export type PersonalSourceDefinition = {
  id: string;
  label: string;
  kind: string;
  url: string;
  company?: string;
  pattern?: string;
  query?: string;
  place?: string;
  radiusKm?: number;
  priority: number;
  universe: string;
  /** Sitemap complétant un flux plafonné (Teamtailor limite son RSS à 100 offres). */
  sitemap?: string;
  /** Expression retenant les liens de la liste (défaut des boards JSON-LD : ASV). Vide = tous. */
  filter?: string;
  /** Fiches sans JSON-LD : titre h1 et texte de la page. */
  textFallback?: boolean;
  /** Les liens de la liste portent un paramètre de requête (redirections). */
  allowQuery?: boolean;
  /** false : la date publiée par le site n'est pas fiable (valeur du jour), on la tient pour inconnue. */
  dates?: boolean;
  maxPages?: number;
  maxDetails?: number;
  rotatePages?: boolean;
};
const ASV_LINK = /asv|auxiliaire|assistant.*v[eé]t[eé]rinaire/i;
const ASV_FIRST = /asv|auxiliaire|assistant|soigneur|animalier|infirmi|capacitaire|toiletteu/i;
/**
 * Lieu annoncé dans le texte d'une fiche sans données structurées : « Lieu : X »,
 * ou « Commune (code postal) ». Un lieu-dit répété avant la commune est écarté.
 */
export function cityFromText(text: string): string | undefined {
  const labeled =
    /(?:[Ll]ieu(?: de travail)?|[Ll]ocalisation|[Vv]ille)\s*:?\s*([A-ZÉÈÀ][\p{L}'’ -]{2,40})/u.exec(text);
  if (labeled)
    return labeled[1].replace(/\s+(?:Contrat|Type|Date|Poste|Salaire|Temps).*$/u, "").trim();
  const postal = /\b((?:[A-ZÉÈÀ][\p{L}'’-]*\s){1,4})\(\d{5}\)/u.exec(text);
  if (!postal) return undefined;
  const tokens = postal[1].trim().split(/\s+/);
  const last = tokens.at(-1)!;
  return tokens.length > 1 && last.startsWith(tokens.at(-2)!) ? last : tokens.join(" ");
}
const HTTP = { timeoutMs: 12000, retries: 1, minIntervalMs: 300 };
function priorityCity(city: string) {
  const point = geocodeCity(city);
  return point ? distanceKm(TOULOUSE, point) : 10000;
}
export class PersonalConnector implements SourceConnector {
  readonly personal = true;
  readonly group;
  readonly acceptedContracts = PERSONAL_CONTRACTS;
  readonly warnings: string[] = [];
  readonly sourceSite: string;
  readonly label: string;
  readonly requestPrefixes: string[];
  constructor(readonly definition: PersonalSourceDefinition) {
    this.group = definition.universe === "ASV" ? ("ASV" as const) : definition.universe === "FINANCE" ? ("FINANCE" as const) : definition.universe === "HOSPITALITY" ? ("HOSPITALITY" as const) : ("COMMERCE" as const);
    this.label = definition.label;
    this.sourceSite = `${new URL(definition.url).hostname.replace(/^www\./, "")}/${definition.id}`;
    this.requestPrefixes = [new URL(definition.url).origin + "/"];
  }
  isEnabled() {
    return true;
  }
  async fetchOffers(): Promise<RawOffer[]> {
    this.warnings.length = 0;
    const offers: RawOffer[] = [];
    try {
      switch (this.definition.kind) {
        case "teamtailor":
          await this.rss(offers);
          break;
        case "sitemap-jsonld":
          await this.sitemap(offers);
          break;
        case "wp-rest":
          await this.wpRest(offers);
          break;
        case "smartrecruiters":
          await this.smartRecruiters(offers);
          break;
        default:
          await this.html(offers);
      }
    } catch (error) {
      if (!(error instanceof RateLimitedError))
        this.warnings.push(error instanceof Error ? error.message : "Source indisponible");
      else this.warnings.push(error.message);
    }
    return offers;
  }
  private async accept(input: PersonalOfferInput, offers: RawOffer[]) {
    const offer = await makePersonalOffer(input);
    if (offer) offers.push({ ...offer, sourceSite: this.sourceSite });
  }
  private async rss(offers: RawOffer[]) {
    const seen = new Set<string>();
    await this.rssFeed(offers, seen);
    if (this.definition.sitemap) await this.sitemapExtras(offers, seen);
  }
  private async rssFeed(offers: RawOffer[], seen: Set<string>) {
    for (let offset = 0; offset < 600; offset += 200) {
      assertCollectionBudget();
      const url = new URL(this.definition.url);
      url.searchParams.set("per_page", "200");
      url.searchParams.set("offset", String(offset));
      const xml = await fetchText(url, { ...HTTP, cacheTtlMs: 15 * 60000 });
      if (!xml || !/<rss[\s>]/i.test(xml)) {
        this.warnings.push("Flux RSS absent ou format modifié");
        return;
      }
      const $ = load(xml, { xmlMode: true }),
        items = $("item").toArray();
      for (const item of items) {
        const node = $(item),
          field = (name: string) =>
            node
              .find("*")
              .filter(
                (_, element) => element.type === "tag" && element.name.replace(/^.*:/, "") === name,
              )
              .first()
              .text()
              .trim();
        const remote = node.find("remoteStatus").text();
        seen.add(node.find("link").text().trim());
        await this.accept(
          {
            title: node.find("title").text(),
            company: this.definition.company!,
            city: field("city"),
            country: field("country"),
            description: node.find("description").text(),
            publishedAt: node.find("pubDate").text(),
            url: node.find("link").text(),
            remote:
              remote === "fully"
                ? "remote"
                : remote === "hybrid"
                  ? "hybrid"
                  : remote === "none"
                    ? "onsite"
                    : undefined,
          },
          offers,
        );
      }
      if (items.length < 200) return;
    }
    this.warnings.push("Budget RSS atteint ; couverture partielle");
  }
  private async smartRecruiters(offers: RawOffer[]) {
    type Posting = {
      id: string;
      name: string;
      releasedDate?: string;
      location?: {
        city?: string;
        country?: string;
        latitude?: string;
        longitude?: string;
        remote?: boolean;
        hybrid?: boolean;
      };
      typeOfEmployment?: { id?: string; label?: string };
    };
    const postings: Posting[] = [];
    for (let offset = 0; offset < 500; offset += 100) {
      const url = new URL(this.definition.url);
      url.searchParams.set("country", "fr");
      url.searchParams.set("limit", "100");
      url.searchParams.set("offset", String(offset));
      const page = await fetchJson<{ content?: Posting[]; totalFound?: number }>(url, {
        ...HTTP,
        cacheTtlMs: 10 * 60000,
      });
      if (!page?.content) {
        this.warnings.push("Catalogue employeur illisible");
        break;
      }
      postings.push(
        ...page.content.filter(
          (entry) =>
            entry.location?.country?.toLowerCase() === "fr" &&
            ["COMMERCE", "ASV", "FINANCE"].includes(
              classifyJob(entry.name, "", { company: this.definition.company }).universe,
            ),
        ),
      );
      if (offset + page.content.length >= (page.totalFound ?? 0) || page.content.length < 100)
        break;
      if (offset === 400) this.warnings.push("Budget employeur atteint ; couverture partielle");
    }
    postings.sort(
      (a, b) => priorityCity(a.location?.city ?? "") - priorityCity(b.location?.city ?? ""),
    );
    const results = await mapPool(postings.slice(0, 160), 3, async (posting) => {
      const detail = await fetchJson<
        Posting & {
          postingUrl?: string;
          active?: boolean;
          jobAd?: { sections?: Record<string, { text?: string }> };
        }
      >(`${this.definition.url}/${posting.id}`, { ...HTTP, cacheTtlMs: 60 * 60000 });
      if (!detail?.postingUrl || detail.active === false) return null;
      const description = Object.values(detail.jobAd?.sections ?? {})
        .map((section) => section.text ?? "")
        .join("\n\n");
      return makePersonalOffer({
        title: detail.name,
        company: this.definition.company!,
        city: detail.location?.city,
        country: detail.location?.country,
        description,
        url: detail.postingUrl,
        publishedAt: detail.releasedDate,
        contract: detail.typeOfEmployment?.id,
        lat: detail.location?.latitude ? Number(detail.location.latitude) : undefined,
        lng: detail.location?.longitude ? Number(detail.location.longitude) : undefined,
        remote: detail.location?.remote
          ? "remote"
          : detail.location?.hybrid
            ? "hybrid"
            : detail.location?.remote === false
              ? "onsite"
              : undefined,
      });
    });
    offers.push(...results.filter((offer): offer is RawOffer => !!offer));
    if (postings.length > 160)
      this.warnings.push("160 détails employeur par cycle ; couverture partielle");
  }
  private async html(offers: RawOffer[]) {
    const { definition: source } = this;
    const links = new Map<string, string>();
    const pageBudget = source.maxPages ?? (source.kind === "jsonld-board" ? 3 : 2);
    const stored = source.rotatePages ? Number(await readCatalogCursor(`${source.id}:page`)) : 2;
    const start = Number.isInteger(stored) && stored >= 2 && stored <= 500 ? stored : 2;
    const pages = source.rotatePages ? [1, ...Array.from({ length: pageBudget - 1 }, (_, i) => start + i)] : Array.from({ length: pageBudget }, (_, i) => i + 1);
    let nextPage = 2;
    for (const page of pages) {
      const url = new URL(source.url);
      if (source.kind === "france-travail") {
        url.searchParams.set("motsCles", source.query!);
        url.searchParams.set("offresPartenaires", "true");
        url.searchParams.set("tri", "0");
        if (source.place) {
          url.searchParams.set("lieux", source.place);
          url.searchParams.set("rayon", String(source.radiusKm ?? 100));
        }
        if (page > 1) url.searchParams.set("range", `${(page - 1) * 20}-${page * 20 - 1}`);
      } else if (source.kind === "hellowork") {
        url.searchParams.set("k", source.query!);
        if (source.place) {
          url.searchParams.set("l", source.place);
          url.searchParams.set("ray", String(source.radiusKm ?? 100));
        }
        url.searchParams.set("p", String(page));
      } else if (page > 1) url.searchParams.set("paged", String(page));
      const html = await fetchText(url, { ...HTTP, cacheTtlMs: 10 * 60000 });
      if (!html) {
        this.warnings.push("Page de recherche inaccessible");
        break;
      }
      const $ = load(html),
        previous = links.size;
      // Certains sites (Maxi Zoo) servent leur liste d'offres dans un <noscript> : le parseur
      // n'en fait que du texte, on l'analyse donc à part.
      const noscript = $("noscript")
        .toArray()
        .map((element) => load($(element).text()));
      const anchors = [$, ...noscript].flatMap((document) =>
        document("a[href]")
          .toArray()
          .map((element) => ({
            href: document(element).attr("href")!,
            text: document(element).text(),
          })),
      );
      anchors.forEach(({ href, text: rawText }) => {
        let target: URL;
        try {
          target = new URL(href, source.url);
        } catch {
          return;
        }
        if (target.origin !== url.origin) return;
        const pattern =
          source.kind === "france-travail"
            ? /\/offres\/recherche\/detail\/[A-Z0-9]+$/i
            : source.kind === "hellowork"
              ? /\/fr-fr\/emplois\/\d+\.html/
              : new RegExp(source.pattern!);
        if (
          !pattern.test(target.pathname + (source.allowQuery ? target.search : "")) ||
          (target.search && !source.allowQuery)
        )
          return;
        const text = rawText.replace(/\s+/g, " ").trim();
        if (source.kind === "jsonld-board") {
          const wanted =
            source.filter === undefined
              ? ASV_LINK
              : source.filter
                ? new RegExp(source.filter, "i")
                : null;
          if (wanted && !wanted.test(text + " " + target.pathname)) return;
        }
        links.set(target.href, text);
      });
      if (links.size === previous) {
        if (page === 1 && ["france-travail", "hellowork"].includes(source.kind) && !/aucune offre|aucun r[ée]sultat|0 offre|pas d.offre/i.test(html))
          this.warnings.push("Recherche sans liens d’annonces : page dynamique, accès limité ou format modifié");
        nextPage = 2; break;
      }
      nextPage = page + 1;
      if (page === pages.at(-1) && source.kind !== "jsonld-board")
        this.warnings.push(`${pageBudget} pages de recherche par cycle ; couverture partielle`);
    }
    const ordered = [...links.entries()].sort(
      (a, b) =>
        Number(/toulouse|blagnac|colomiers|lab[eè]ge|balma/i.test(b[1])) -
        Number(/toulouse|blagnac|colomiers|lab[eè]ge|balma/i.test(a[1])),
    );
    const detailBudget = source.maxDetails ?? 60;
    const rotation = selectCatalogDetails(ordered, detailBudget, source.rotatePages ? await readCatalogCursor(`${source.id}:detail`) : "");
    const results = await mapPool(rotation.selected, 3, async ([url]) => {
      if (source.kind === "france-travail") return this.franceTravail(url);
      return this.detail(url);
    });
    offers.push(...results.filter((offer): offer is RawOffer => !!offer));
    if (source.rotatePages) {
      // Tant qu'un lot de détails est incomplet, on ne saute pas aux pages suivantes.
      await saveCatalogCursor(`${source.id}:page`, String(ordered.length > detailBudget ? start : nextPage > 500 ? 2 : nextPage));
      await saveCatalogCursor(`${source.id}:detail`, rotation.nextCursor);
    }
    if (ordered.length > detailBudget)
      this.warnings.push(`${detailBudget} détails par source et cycle ; couverture partielle`);
  }
  /** Fiche d'annonce : JSON-LD en priorité, sinon (si la source le déclare) le titre et le texte de la page. */
  private async detail(url: string, hint: { publishedAt?: string } = {}): Promise<RawOffer | null> {
    const { definition: source } = this;
    if (source.kind !== "hellowork" && !(await robotsAllows(url))) return null;
    const html = await fetchText(url, { ...HTTP, cacheTtlMs: 60 * 60000 });
    if (!html) return null;
    const $ = load(html);
    const posting = extractJobPosting(html);
    const main = $("main").length ? $("main").clone() : $("body").clone();
    main.find("script,style,form,nav,header,footer").remove();
    const known = source.dates === false ? undefined : (posting?.datePosted ?? hint.publishedAt);
    if (!posting?.title) {
      const title = $("h1").first().text().replace(/\s+/g, " ").trim();
      if (!source.textFallback || !title) {
        if (!this.warnings.includes("Annonce sans données structurées lisibles"))
          this.warnings.push("Annonce sans données structurées lisibles");
        return null;
      }
      const text = main.text().replace(/\s+/g, " ").trim();
      return makePersonalOffer({
        title,
        company: source.company ?? "Employeur non précisé",
        description: main.html() ?? "",
        city: cityFromText(text),
        country: "FR",
        url,
        publishedAt: known,
        contract: text.match(/\b(CDI|CDD|Intérim|Alternance|Stage)\b/i)?.[1],
      });
    }
    const description = posting.description || main.html() || "";
    if (!description) {
      this.warnings.push("Description de l’annonce absente");
      return null;
    }
    const title = load(`<span>${posting.title}</span>`)("span").text();
    const salary = posting.baseSalary as
      | { value?: { minValue?: number; maxValue?: number; value?: number; unitText?: string } }
      | undefined;
    const unit = salary?.value?.unitText?.toUpperCase();
    return makePersonalOffer({
      title,
      company: posting.hiringOrganization?.name ?? source.company ?? "Employeur non précisé",
      description,
      city: jobLocationCity(posting) ?? undefined,
      country: jobLocationCountry(posting) ?? "FR",
      url,
      publishedAt: known,
      validThrough: posting.validThrough,
      contract: [
        main
          .text()
          .match(/(?:Contrat|Type de contrat)\s*(CDI|CDD|Intérim|Alternance|Stage)/i)?.[1] ?? "",
        ...(Array.isArray(posting.employmentType)
          ? posting.employmentType
          : [posting.employmentType ?? ""]),
      ].join(" "),
      remote: posting.jobLocationType === "TELECOMMUTE" ? "remote" : undefined,
      salaryMin:
        typeof salary?.value?.minValue === "number"
          ? salary.value.minValue
          : typeof salary?.value?.value === "number"
            ? salary.value.value
            : undefined,
      salaryMax: typeof salary?.value?.maxValue === "number" ? salary.value.maxValue : undefined,
      salaryPeriod:
        unit === "YEAR"
          ? "YEAR"
          : unit === "MONTH"
            ? "MONTH"
            : unit === "HOUR"
              ? "HOUR"
              : "UNKNOWN",
    });
  }
  /** Adresses `<loc>` d'un sitemap, les métiers recherchés d'abord. */
  private async sitemapLinks(
    url: string,
    pattern: RegExp,
    exclude: Set<string> = new Set(),
  ): Promise<string[]> {
    const xml = await fetchText(url, { ...HTTP, cacheTtlMs: 60 * 60000 });
    if (!xml) {
      this.warnings.push("Sitemap inaccessible");
      return [];
    }
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)]
      .map((match) => match[1])
      .filter((loc) => pattern.test(new URL(loc).pathname) && !exclude.has(loc));
    return [...new Set(locs)].sort((a, b) => Number(ASV_FIRST.test(b)) - Number(ASV_FIRST.test(a)));
  }
  private async sitemap(offers: RawOffer[]) {
    const links = await this.sitemapLinks(
      this.definition.url,
      new RegExp(this.definition.pattern ?? "/"),
    );
    const results = await mapPool(links.slice(0, 60), 3, (url) => this.detail(url));
    offers.push(...results);
    if (links.length > 60)
      this.warnings.push("60 fiches par cycle, métiers recherchés d’abord ; couverture partielle");
  }
  /** Flux Teamtailor plafonné à 100 offres : les fiches manquantes viennent du sitemap. */
  private async sitemapExtras(offers: RawOffer[], seen: Set<string>) {
    const links = await this.sitemapLinks(this.definition.sitemap!, /\/jobs\/\d+/, seen);
    const results = await mapPool(links.slice(0, 40), 3, (url) => this.detail(url));
    offers.push(...results);
    if (links.length > 40)
      this.warnings.push(
        "Flux plafonné : 40 fiches du sitemap lues par cycle, métiers recherchés d’abord",
      );
  }
  /** API REST WordPress des offres : liens et dates, puis lecture des fiches. */
  private async wpRest(offers: RawOffer[]) {
    const rows = await fetchJson<Array<{ link?: string; date?: string }>>(this.definition.url, {
      ...HTTP,
      cacheTtlMs: 15 * 60000,
    });
    if (!Array.isArray(rows)) {
      this.warnings.push("API d’offres illisible");
      return;
    }
    const origin = new URL(this.definition.url).origin;
    const usable = rows.filter(
      (row): row is { link: string; date?: string } =>
        !!row.link && row.link.startsWith(origin + "/") && !/_trashed/.test(row.link),
    );
    const results = await mapPool(usable.slice(0, 60), 3, (row) =>
      this.detail(row.link, { publishedAt: row.date }),
    );
    offers.push(...results);
  }
  private async franceTravail(url: string): Promise<RawOffer | null> {
    const target = new URL(url),
      id = target.pathname.split("/").at(-1)!;
    const config = await fetchJson<{ pn330cwdescriptifoffreBff?: string }>(
      `${target.origin}/ihm-descriptifoffre/configuration.json`,
      { ...HTTP, cacheTtlMs: 86400000 },
    );
    if (!config?.pn330cwdescriptifoffreBff) {
      this.warnings.push("Configuration publique France Travail inaccessible");
      return null;
    }
    const base = new URL(config.pn330cwdescriptifoffreBff, target.origin);
    if (base.origin !== target.origin) throw new Error("Hôte de descriptif non autorisé");
    const detail = await fetchJson<{
      intituleOffre?: string;
      descriptif?: string;
      lieuTravail?: string | { libelleCommuneLieuTravail?: string; libelleLieuTravail?: string };
      salaire?: string;
      syntheseContrat?: string;
      etablissement?: { libelleEnseigne?: string };
      dateCreation?: string;
    }>(`${base.href.replace(/\/$/, "")}/offre/${encodeURIComponent(id)}`, {
      ...HTTP,
      minIntervalMs: 500,
      cacheTtlMs: 60 * 60000,
    });
    if (!detail?.intituleOffre || !detail.descriptif) {
      this.warnings.push("Descriptif France Travail inaccessible");
      return null;
    }
    const location =
      typeof detail.lieuTravail === "string"
        ? detail.lieuTravail
        : (detail.lieuTravail?.libelleCommuneLieuTravail ??
          detail.lieuTravail?.libelleLieuTravail ??
          "");
    const city = location.replace(/^\d{2,3}\s*-\s*/, "").replace(/\s*\(\d{2,5}\)\s*$/, "");
    const amounts = [...(detail.salaire ?? "").matchAll(/(\d+(?:[.,]\d+)?)\s*Euros?/gi)].map(
      (match) => Number(match[1].replace(",", ".")),
    );
    return makePersonalOffer({
      salaryMin: amounts[0],
      salaryMax: amounts[1],
      salaryPeriod: /annuel/i.test(detail.salaire ?? "")
        ? "YEAR"
        : /mensuel/i.test(detail.salaire ?? "")
          ? "MONTH"
          : /horaire/i.test(detail.salaire ?? "")
            ? "HOUR"
            : "UNKNOWN",
      title: detail.intituleOffre,
      company: detail.etablissement?.libelleEnseigne ?? "Employeur confidentiel (France Travail)",
      description: detail.descriptif,
      city,
      country: "FR",
      contract: detail.syntheseContrat,
      url,
      publishedAt: detail.dateCreation,
    });
  }
}
export function personalConnectors(area?: { city: string; code: string; postcode?: string }) {
  return [...definitions]
    .sort((a, b) => a.priority - b.priority)
    .map((original) => {
      const definition =
        area && original.place
          ? {
              ...original,
              label: original.label.replace("Toulouse", area.city),
              place:
                original.kind === "france-travail"
                  ? area.code
                  : `${area.city}${area.postcode ? `-${area.postcode}` : ""}`,
            }
          : original;
      return { id: definition.id, connector: new PersonalConnector(definition) };
    });
}
