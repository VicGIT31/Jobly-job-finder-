import type { RawOffer } from "@/server/ingest/normalize";
import { inferContractType, inferEducationLevel, inferRemotePolicy } from "@/server/ingest/enrich";
import { RateLimitedError, fetchText, mapPool } from "@/server/ingest/http";
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
const PAGES_PER_QUERY = 3;
const PAGE_SIZE = 25;
/** Descriptions récupérées de front. Au-delà, LinkedIn rate-limite vite. */
const DETAIL_CONCURRENCY = 4;
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
    const cards = await this.collectCards();
    if (cards.length === 0) return [];

    // Descriptions + géocodage en parallèle borné. `mapPool` interrompt tout le
    // pool si LinkedIn coupe, et renvoie ce qui a déjà été construit.
    return mapPool(cards, DETAIL_CONCURRENCY, async (card) => {
      const description = await fetchDescription(card.id);
      if (!description) return null;
      const geo = await geocodeCityFull(card.city);

      // Type déduit du titre + description (fiable), sinon de la requête d'origine.
      const inferred = inferContractType(card.title, description.slice(0, 1200));
      const contractType = inferred ?? (card.alternance ? "alternance" : "stage");

      const offer: RawOffer = {
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
      return offer;
    });
  }

  /**
   * Balaie toutes les requêtes tech et déduplique les cartes par identifiant
   * LinkedIn. Une page vide ou en échec arrête la pagination de *cette* requête
   * seulement ; un rate-limit arrête la collecte entière mais conserve l'acquis.
   */
  private async collectCards(): Promise<Array<Card & { alternance: boolean }>> {
    const cardsById = new Map<string, Card & { alternance: boolean }>();

    for (const q of QUERIES) {
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
          if (err instanceof RateLimitedError) {
            console.warn(
              `[linkedin] Rate limit atteint — collecte arrêtée avec ${cardsById.size} carte(s).`,
            );
            return [...cardsById.values()];
          }
          throw err;
        }
        if (!html) break;

        const cards = parseCards(html);
        if (cards.length === 0) break;

        let fresh = 0;
        for (const c of cards) {
          if (c.id && !cardsById.has(c.id)) {
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
