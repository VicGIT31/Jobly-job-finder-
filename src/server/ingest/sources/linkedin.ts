import type { RawOffer } from "@/server/ingest/normalize";
import { geocodeCity } from "./geocode";
import { TECH_KEYWORDS, TECH_SECTOR, type SourceConnector } from "./types";

/**
 * Connecteur LinkedIn — endpoint public « invité » (jobs-guest), celui qui
 * alimente la page emploi de LinkedIn en navigation déconnectée. Aucune clé
 * requise. On récupère les cartes d'offres (stage `f_JT=I`, alternance via
 * mots-clés), puis la description réelle de chaque annonce. Chaque offre pointe
 * vers son URL LinkedIn réelle (`/jobs/view/...`).
 *
 * Endpoint non contractuel : en cas de changement de HTML ou de throttling, le
 * connecteur échoue proprement sans bloquer les autres sources.
 */

const SEARCH_URL = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";
const DETAIL_URL = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

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

type Card = { id: string; title: string; company: string; city: string; url: string };

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
function parseCards(html: string): Card[] {
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
    cards.push({ id, title, company, city, url: url.split("?")[0] });
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
  try {
    const res = await fetch(`${DETAIL_URL}/${id}`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = /show-more-less-html__markup[^>]*>([\s\S]*?)<\/div>/.exec(html);
    if (!m) return null;
    const text = htmlToText(m[1]);
    return text.length >= 20 ? text.slice(0, 8000) : null;
  } catch {
    return null;
  }
}

export class LinkedInConnector implements SourceConnector {
  readonly sourceSite = "linkedin.com";
  readonly label = "LinkedIn";

  isEnabled(): boolean {
    return true; // Endpoint invité public : aucune clé requise.
  }

  async fetchOffers(): Promise<RawOffer[]> {
    const cardsById = new Map<string, Card & { alternance: boolean }>();

    for (const q of QUERIES) {
      for (let page = 0; page < PAGES_PER_QUERY; page++) {
        const url = new URL(SEARCH_URL);
        url.searchParams.set("keywords", q.keywords);
        url.searchParams.set("location", "France");
        url.searchParams.set("start", String(page * PAGE_SIZE));
        if (q.internshipType) url.searchParams.set("f_JT", "I");

        let html: string;
        try {
          const res = await fetch(url, {
            headers: { "User-Agent": UA },
            signal: AbortSignal.timeout(15_000),
          });
          if (!res.ok) break;
          html = await res.text();
        } catch {
          break;
        }
        const cards = parseCards(html);
        if (cards.length === 0) break;
        for (const c of cards) {
          if (c.id && !cardsById.has(c.id)) {
            cardsById.set(c.id, { ...c, alternance: !q.internshipType });
          }
        }
      }
    }

    const offers: RawOffer[] = [];
    for (const card of cardsById.values()) {
      const description = await fetchDescription(card.id);
      if (!description) continue;
      const geo = geocodeCity(card.city);
      // Type déduit du titre en priorité (fiable), sinon de la requête d'origine.
      const isAlt = /alternance|apprentissage|alternant/i.test(card.title) || card.alternance;
      offers.push({
        title: card.title.slice(0, 200),
        companyName: card.company.slice(0, 120),
        city: card.city.slice(0, 120),
        description,
        contractType: isAlt ? "alternance" : "stage",
        sector: TECH_SECTOR,
        sourceUrl: card.url,
        scrapedAt: new Date(),
        ...(geo ? { latitude: geo.lat, longitude: geo.lng } : {}),
      });
    }
    return offers;
  }
}
