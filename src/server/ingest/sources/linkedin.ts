import type { RawOffer } from "@/server/ingest/normalize";
import { inferContractType, inferEducationLevel, inferRemotePolicy } from "@/server/ingest/enrich";
import { RateLimitedError, fetchText, isHostCircuitOpen, mapPool } from "@/server/ingest/http";
import { geocodeCityFull } from "./geocode";
import { TECH_KEYWORDS, TECH_SECTOR, type SourceConnector } from "./types";

/**
 * Connecteur LinkedIn — endpoint public « invité » (jobs-guest), celui qui
 * alimente la page emploi de LinkedIn en navigation déconnectée. Aucune clé
 * requise. On récupère les cartes d'offres (stage `f_JT=I`, alternance via
 * mots-clés), puis la description réelle de chaque annonce. Chaque offre pointe
 * vers son URL LinkedIn réelle (`/jobs/view/...`).
 *
 * Robustesse (voir `ingest/http.ts`) : chaque requête est rejouée avec backoff,
 * throttlée par hôte et protégée par un disjoncteur. Quand LinkedIn nous coupe,
 * on **rend les offres déjà collectées** au lieu de perdre le cycle entier.
 * Les descriptions sont récupérées en parallèle borné, ce qui divise la durée
 * du cycle par ~4 à pression réseau équivalente.
 */

const SEARCH_URL = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";
const DETAIL_URL = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting";

// Requêtes ciblées tech FR, générées depuis TECH_KEYWORDS pour maximiser le
// volume. f_JT=I = Internship (stage) ; l'alternance n'a pas de type LinkedIn
// dédié → ciblée par mot-clé (le pipeline rejette ensuite le hors périmètre).
const QUERIES: Array<{ keywords: string; internshipType: boolean }> = TECH_KEYWORDS.flatMap(
  (kw) => [
    { keywords: `stage ${kw}`, internshipType: true },
    { keywords: `alternance ${kw}`, internshipType: false },
  ],
);
const PAGES_PER_QUERY = 2;
const PAGE_SIZE = 25;
/** Descriptions récupérées de front. Au-delà, LinkedIn rate-limite vite. */
const DETAIL_CONCURRENCY = 4;
/**
 * Nombre de requêtes traitées avant d'aller chercher leurs descriptions.
 *
 * LinkedIn coupe autour de quelques dizaines de requêtes par cycle. En
 * cherchant *toutes* les requêtes d'abord, on épuisait le quota pendant la
 * recherche et il n'en restait plus pour les descriptions : le cycle rendait
 * des centaines de cartes… et zéro offre exploitable. En alternant recherche et
 * descriptions par petits lots, chaque lot produit des offres complètes, et une
 * coupure en cours de route ne fait perdre que le lot en cours.
 */
const QUERY_BATCH = 4;
const HOST = "www.linkedin.com";
/** Espacement minimum entre deux requêtes LinkedIn (throttle poli). */
const MIN_INTERVAL_MS = 300;
/** `f_TPR=r604800` = publiées depuis 7 jours : on reste sur du frais. */
const RECENT_WINDOW = "r604800";

const HTTP = { minIntervalMs: MIN_INTERVAL_MS, retries: 2, timeoutMs: 15_000 };

type Card = {
  id: string;
  title: string;
  company: string;
  city: string;
  url: string;
  postedAt: string | null;
  logoUrl: string | null;
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function firstMatch(html: string, re: RegExp): string | null {
  const m = re.exec(html);
  return m ? decodeEntities(m[1].trim()) : null;
}

/** Extrait les cartes d'offres d'une page de résultats guest. */
export function parseCards(html: string): Card[] {
  const cards: Card[] = [];
  for (const block of html.split("<li>").slice(1)) {
    const url = firstMatch(block, /href="(https:\/\/[a-z.]*linkedin\.com\/jobs\/view\/[^"?]+)/);
    const title = firstMatch(block, /base-search-card__title">\s*([^<]+?)\s*</);
    const company = firstMatch(
      block,
      /base-search-card__subtitle">\s*(?:<a[^>]*>)?\s*([^<]+?)\s*</,
    );
    const location = firstMatch(block, /job-search-card__location">\s*([^<]+?)\s*</);
    if (!url || !title || !company || !location) continue;
    const id = /\/view\/[^/]*-(\d+)(?:[/?]|$)/.exec(url)?.[1] ?? "";
    const city = location.split(",")[0].trim();
    // Date de publication réelle de l'annonce (attribut datetime du <time> de la carte).
    const postedAt = firstMatch(block, /datetime="(\d{4}-\d{2}-\d{2})"/);
    // Logo entreprise : media.licdn.com uniquement (static.licdn.com = placeholder).
    const logoRaw = firstMatch(block, /data-delayed-url="([^"]+)"/);
    const logoUrl = logoRaw && logoRaw.includes("company-logo") ? logoRaw : null;
    cards.push({ id, title, company, city, url: url.split("?")[0], postedAt, logoUrl });
  }
  return cards;
}

function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<\/(p|div|li|h[1-6]|ul|br)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\n{2,}/g, "\n")
    .trim();
}

async function fetchDescription(id: string): Promise<string | null> {
  if (!id) return null;
  const html = await fetchText(`${DETAIL_URL}/${id}`, HTTP);
  if (!html) return null;
  const m = /show-more-less-html__markup[^>]*>([\s\S]*?)<\/div>/.exec(html);
  if (!m) return null;
  const text = htmlToText(m[1]);
  return text.length >= 20 ? text.slice(0, 8000) : null;
}

export class LinkedInConnector implements SourceConnector {
  readonly sourceSite = "linkedin.com";
  readonly label = "LinkedIn";

  isEnabled(): boolean {
    return true; // Endpoint invité public : aucune clé requise.
  }

  async fetchOffers(): Promise<RawOffer[]> {
    const offers: RawOffer[] = [];
    const seen = new Set<string>();

    // Alternance recherche → descriptions, lot par lot (voir QUERY_BATCH).
    for (let i = 0; i < QUERIES.length; i += QUERY_BATCH) {
      let cards: Array<Card & { alternance: boolean }>;
      try {
        cards = await this.collectCards(QUERIES.slice(i, i + QUERY_BATCH), seen);
      } catch (err) {
        if (err instanceof RateLimitedError) break;
        throw err;
      }

      // Descriptions + géocodage en parallèle borné. `mapPool` interrompt tout
      // le pool si LinkedIn coupe, et renvoie ce qui a déjà été construit.
      offers.push(...(await mapPool(cards, DETAIL_CONCURRENCY, (card) => this.toOffer(card))));

      // Hôte coupé : les lots suivants ne rendraient plus rien.
      if (isHostCircuitOpen(HOST)) {
        console.warn(
          `[linkedin] Rate limit atteint — cycle arrêté avec ${offers.length} offre(s) complète(s).`,
        );
        break;
      }
    }

    return offers;
  }

  /** Carte de résultat → offre brute complète (description, géo, enrichissement). */
  private async toOffer(card: Card & { alternance: boolean }): Promise<RawOffer | null> {
    const description = await fetchDescription(card.id);
    if (!description) return null;
    const geo = await geocodeCityFull(card.city);

    // Type déduit du titre + description (fiable), sinon de la requête d'origine.
    const inferred = inferContractType(card.title, description.slice(0, 1200));
    const contractType = inferred ?? (card.alternance ? "alternance" : "stage");

    return {
      title: card.title.slice(0, 200),
      companyName: card.company.slice(0, 120),
      city: card.city.slice(0, 120),
      description,
      contractType,
      remotePolicy: inferRemotePolicy(card.title, card.city, description),
      educationLevel: inferEducationLevel(card.title, description),
      sector: TECH_SECTOR,
      sourceUrl: card.url,
      scrapedAt: new Date(),
      ...(card.postedAt ? { publishedAt: new Date(card.postedAt) } : {}),
      ...(card.logoUrl ? { companyLogoUrl: card.logoUrl } : {}),
      ...(geo ? { latitude: geo.lat, longitude: geo.lng } : {}),
    };
  }

  /**
   * Balaie un lot de requêtes et déduplique les cartes par identifiant LinkedIn
   * (`seen` est partagé entre les lots). Une page vide ou en échec arrête la
   * pagination de *cette* requête seulement ; un rate-limit remonte à l'appelant
   * qui conserve les offres déjà construites.
   */
  private async collectCards(
    queries: typeof QUERIES,
    seen: Set<string>,
  ): Promise<Array<Card & { alternance: boolean }>> {
    const cardsById = new Map<string, Card & { alternance: boolean }>();

    for (const q of queries) {
      for (let page = 0; page < PAGES_PER_QUERY; page++) {
        const url = new URL(SEARCH_URL);
        url.searchParams.set("keywords", q.keywords);
        url.searchParams.set("location", "France");
        url.searchParams.set("start", String(page * PAGE_SIZE));
        url.searchParams.set("f_TPR", RECENT_WINDOW);
        if (q.internshipType) url.searchParams.set("f_JT", "I");

        let html: string | null;
        try {
          html = await fetchText(url, HTTP);
        } catch (err) {
          // Hôte coupé : on rend le lot partiel, dont les descriptions seront
          // tentées avant que l'appelant n'arrête le cycle.
          if (err instanceof RateLimitedError) return [...cardsById.values()];
          throw err;
        }
        if (!html) break;

        const cards = parseCards(html);
        if (cards.length === 0) break;

        let fresh = 0;
        for (const c of cards) {
          // `seen` couvre tout le cycle : une offre déjà traitée dans un lot
          // précédent ne repart pas chercher sa description.
          if (c.id && !seen.has(c.id)) {
            seen.add(c.id);
            cardsById.set(c.id, { ...c, alternance: !q.internshipType });
            fresh++;
          }
        }
        // Page entièrement composée de doublons : la requête n'apportera plus rien.
        if (fresh === 0) break;
      }
    }

    return [...cardsById.values()];
  }
}
