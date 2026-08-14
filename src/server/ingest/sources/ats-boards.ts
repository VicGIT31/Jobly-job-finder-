import type { ContractType } from "@prisma/client";
import type { RawOffer } from "@/server/ingest/normalize";
import { inferEducationLevel, inferRemotePolicy } from "@/server/ingest/enrich";
import { RateLimitedError, fetchJson } from "@/server/ingest/http";
import { htmlToText } from "@/server/ingest/html-to-text";
import { TECH_SECTOR, TECH_KEYWORDS, type SourceConnector } from "./types";

/**
 * Connecteur générique pour les ATS qui exposent une API publique de
 * postings (spec §13 : « Support adapters for major ATS ecosystems »).
 * Contrairement aux autres connecteurs, celui-ci ne cible pas un pays mais
 * une liste d'entreprises suivies (`BOARDS`) — chaque entreprise peut
 * recruter dans n'importe quel pays, ce qui en fait la source la plus
 * scalable pour l'extension Europe/Asie (voir SOURCES_EUROPE_ASIA.md §4) :
 * ajouter un pays ne demande aucun nouveau code, juste des entrées dans
 * `BOARDS`.
 *
 * Les 3 endpoints ci-dessous sont publics, sans authentification, et ont
 * été vérifiés en conditions réelles le 2026-08-14 :
 *   - Greenhouse : GET boards-api.greenhouse.io/v1/boards/{slug}/jobs
 *   - Lever      : GET api.lever.co/v0/postings/{slug}?mode=json
 *   - Ashby      : GET api.ashbyhq.com/posting-api/job-board/{slug}
 *
 * La liste `BOARDS` est volontairement courte (quelques entreprises connues
 * et vérifiées) : l'élargir est une simple liste à éditer, pas un nouveau
 * connecteur — voir CONTEXTE_AI_WORK.md pour la suite.
 */

type AtsKind = "greenhouse" | "lever" | "ashby";
type Board = { ats: AtsKind; slug: string };

const BOARDS: Board[] = [
  { ats: "greenhouse", slug: "gitlab" },
  { ats: "greenhouse", slug: "teneo" },
  { ats: "greenhouse", slug: "n26" },
  { ats: "greenhouse", slug: "wise" },
  { ats: "lever", slug: "lever" },
  { ats: "lever", slug: "plaid" },
  { ats: "ashby", slug: "notion" },
  { ats: "ashby", slug: "openai" },
  { ats: "ashby", slug: "ramp" },
  { ats: "ashby", slug: "linear" },
  { ats: "ashby", slug: "railway" },
];

/** Nom d'affichage propre pour les board slugs (souvent en minuscules dans l'URL). */
const DISPLAY_NAME: Record<string, string> = {
  gitlab: "GitLab",
  teneo: "Teneo",
  n26: "N26",
  wise: "Wise",
  lever: "Lever",
  plaid: "Plaid",
  notion: "Notion",
  openai: "OpenAI",
  ramp: "Ramp",
  linear: "Linear",
  railway: "Railway",
};

/** Correspondance nom de pays (anglais, tel qu'exposé par les ATS) → ISO 3166-1 alpha-2. */
const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  "united states": "US",
  usa: "US",
  "united kingdom": "GB",
  uk: "GB",
  germany: "DE",
  france: "FR",
  spain: "ES",
  italy: "IT",
  netherlands: "NL",
  ireland: "IE",
  poland: "PL",
  austria: "AT",
  switzerland: "CH",
  sweden: "SE",
  denmark: "DK",
  norway: "NO",
  finland: "FI",
  belgium: "BE",
  portugal: "PT",
  "czech republic": "CZ",
  singapore: "SG",
  india: "IN",
  japan: "JP",
  "south korea": "KR",
  "united arab emirates": "AE",
  "hong kong": "HK",
  malaysia: "MY",
  indonesia: "ID",
  thailand: "TH",
  vietnam: "VN",
  philippines: "PH",
  taiwan: "TW",
  canada: "CA",
  australia: "AU",
};

/**
 * Grandes villes tech sans suffixe pays dans la localisation source (ex.
 * Greenhouse renvoie souvent juste "Berlin", pas "Berlin, Germany" — observé
 * sur N26/Wise en conditions réelles). Repli utilisé quand le dernier
 * segment ne correspond à aucun nom de pays.
 */
const CITY_TO_ISO: Record<string, string> = {
  berlin: "DE",
  munich: "DE",
  hamburg: "DE",
  frankfurt: "DE",
  barcelona: "ES",
  madrid: "ES",
  paris: "FR",
  vienna: "AT",
  milan: "IT",
  rome: "IT",
  london: "GB",
  dublin: "IE",
  amsterdam: "NL",
  rotterdam: "NL",
  stockholm: "SE",
  copenhagen: "DK",
  oslo: "NO",
  helsinki: "FI",
  brussels: "BE",
  lisbon: "PT",
  warsaw: "PL",
  prague: "CZ",
  zurich: "CH",
  geneva: "CH",
  singapore: "SG",
  bangalore: "IN",
  bengaluru: "IN",
  mumbai: "IN",
  delhi: "IN",
  hyderabad: "IN",
  tokyo: "JP",
  osaka: "JP",
  seoul: "KR",
  "hong kong": "HK",
  dubai: "AE",
  "abu dhabi": "AE",
  "kuala lumpur": "MY",
  jakarta: "ID",
  bangkok: "TH",
  manila: "PH",
  taipei: "TW",
  toronto: "CA",
  vancouver: "CA",
  sydney: "AU",
  melbourne: "AU",
};

/**
 * "Ville, Pays" / "Remote, Pays" → code pays via nom de pays, sinon via nom
 * de ville connue (CITY_TO_ISO), sinon "XX". Une localisation multi-villes
 * ("Berlin, Barcelona") retient la première reconnue.
 */
function guessCountryFromLocation(location: string | null | undefined): string {
  if (!location) return "XX";
  const segments = location.split(",").map((s) => s.trim().toLowerCase());

  const lastSegment = segments[segments.length - 1] ?? "";
  if (COUNTRY_NAME_TO_ISO[lastSegment]) return COUNTRY_NAME_TO_ISO[lastSegment];

  for (const segment of segments) {
    if (CITY_TO_ISO[segment]) return CITY_TO_ISO[segment];
  }
  return "XX";
}

function isTechRole(title: string): boolean {
  const folded = title.toLowerCase();
  return (
    TECH_KEYWORDS.some((kw) => folded.includes(kw)) ||
    /(engineer|developer|swe|software|data|devops|sre|security|infrastructure|platform|backend|frontend|full[\s-]?stack)/.test(
      folded,
    )
  );
}

// ---------- Greenhouse ----------

type GreenhouseJob = {
  id: number;
  title: string;
  absolute_url: string;
  content?: string;
  updated_at?: string;
  first_published?: string;
  location?: { name?: string };
};

async function fetchGreenhouse(slug: string): Promise<RawOffer[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`;
  const json = await fetchJson<{ jobs?: GreenhouseJob[] }>(url, { timeoutMs: 15_000 });
  if (!json) return [];

  const raw: RawOffer[] = [];
  for (const job of json.jobs ?? []) {
    if (!isTechRole(job.title)) continue;
    const description = htmlToText(job.content ?? "");
    if (description.length < 20) continue;
    const location = job.location?.name ?? null;
    raw.push({
      title: job.title.trim().slice(0, 200),
      companyName: DISPLAY_NAME[slug] ?? slug,
      city: (location ?? "Remote").slice(0, 120),
      description: description.slice(0, 6000),
      contractType: "employment_full_time",
      remotePolicy: inferRemotePolicy(job.title, location, description),
      educationLevel: inferEducationLevel(job.title, description),
      sector: TECH_SECTOR,
      sourceUrl: job.absolute_url,
      scrapedAt: new Date(),
      countryCode: guessCountryFromLocation(location),
      ...(job.first_published ? { publishedAt: new Date(job.first_published) } : {}),
    });
  }
  return raw;
}

// ---------- Lever ----------

type LeverPosting = {
  id: string;
  text: string;
  hostedUrl: string;
  descriptionPlain?: string;
  description?: string;
  categories?: { location?: string; commitment?: string };
  createdAt?: number;
};

function leverContractKey(commitment: string | undefined): string {
  const folded = (commitment ?? "").toLowerCase();
  if (folded.includes("intern")) return "employment_internship";
  if (folded.includes("part")) return "employment_part_time";
  if (folded.includes("contract") || folded.includes("temporary")) return "employment_contract";
  return "employment_full_time";
}

async function fetchLever(slug: string): Promise<RawOffer[]> {
  const url = `https://api.lever.co/v0/postings/${slug}?mode=json`;
  const json = await fetchJson<LeverPosting[]>(url, { timeoutMs: 15_000 });
  if (!json) return [];

  const raw: RawOffer[] = [];
  for (const posting of json) {
    if (!isTechRole(posting.text)) continue;
    const description = (posting.descriptionPlain ?? htmlToText(posting.description ?? "")).trim();
    if (description.length < 20) continue;
    const location = posting.categories?.location ?? null;
    raw.push({
      title: posting.text.trim().slice(0, 200),
      companyName: DISPLAY_NAME[slug] ?? slug,
      city: (location ?? "Remote").slice(0, 120),
      description: description.slice(0, 6000),
      contractType: leverContractKey(posting.categories?.commitment),
      remotePolicy: inferRemotePolicy(posting.text, location, description),
      educationLevel: inferEducationLevel(posting.text, description),
      sector: TECH_SECTOR,
      sourceUrl: posting.hostedUrl,
      scrapedAt: new Date(),
      countryCode: guessCountryFromLocation(location),
      ...(posting.createdAt ? { publishedAt: new Date(posting.createdAt) } : {}),
    });
  }
  return raw;
}

// ---------- Ashby ----------

type AshbyJob = {
  id: string;
  title: string;
  jobUrl: string;
  descriptionHtml?: string;
  employmentType?: string;
  workplaceType?: string;
  location?: string;
  publishedAt?: string;
  address?: { postalAddress?: { addressCountry?: string } };
};

function ashbyContractKey(employmentType: string | undefined): string {
  switch (employmentType) {
    case "PartTime":
      return "employment_part_time";
    case "Contract":
    case "Temporary":
      return "employment_contract";
    case "Intern":
    case "Internship":
      return "employment_internship";
    default:
      return "employment_full_time";
  }
}

function ashbyRemotePolicy(workplaceType: string | undefined): string {
  if (workplaceType === "Remote") return "remote";
  if (workplaceType === "Hybrid") return "hybride";
  return "onsite";
}

async function fetchAshby(slug: string): Promise<RawOffer[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${slug}`;
  const json = await fetchJson<{ jobs?: AshbyJob[] }>(url, { timeoutMs: 15_000 });
  if (!json) return [];

  const raw: RawOffer[] = [];
  for (const job of json.jobs ?? []) {
    if (!isTechRole(job.title)) continue;
    const description = htmlToText(job.descriptionHtml ?? "");
    if (description.length < 20) continue;
    const country = job.address?.postalAddress?.addressCountry ?? null;
    raw.push({
      title: job.title.trim().slice(0, 200),
      companyName: DISPLAY_NAME[slug] ?? slug,
      city: (job.location ?? "Remote").slice(0, 120),
      description: description.slice(0, 6000),
      contractType: ashbyContractKey(job.employmentType),
      remotePolicy: ashbyRemotePolicy(job.workplaceType),
      educationLevel: inferEducationLevel(job.title, description),
      sector: TECH_SECTOR,
      sourceUrl: job.jobUrl,
      scrapedAt: new Date(),
      countryCode: country
        ? (COUNTRY_NAME_TO_ISO[country.toLowerCase()] ?? "XX")
        : guessCountryFromLocation(job.location),
      ...(job.publishedAt ? { publishedAt: new Date(job.publishedAt) } : {}),
    });
  }
  return raw;
}

export class AtsBoardsConnector implements SourceConnector {
  readonly sourceSite = "ats-boards";
  readonly label = "Boards ATS (Greenhouse/Lever/Ashby)";
  readonly acceptedContracts: ReadonlySet<ContractType> = new Set([
    "FULL_TIME",
    "PART_TIME",
    "CONTRACT",
    "FREELANCE",
    "STAGE",
    "ALTERNANCE",
  ]);

  isEnabled(): boolean {
    return true; // APIs publiques, aucune clé requise.
  }

  async fetchOffers(): Promise<RawOffer[]> {
    const raw: RawOffer[] = [];
    for (const board of BOARDS) {
      try {
        const fetcher =
          board.ats === "greenhouse"
            ? fetchGreenhouse
            : board.ats === "lever"
              ? fetchLever
              : fetchAshby;
        raw.push(...(await fetcher(board.slug)));
      } catch (err) {
        // Un board indisponible (renommé, fermé) ne doit pas casser les autres.
        if (err instanceof RateLimitedError) continue;
        console.error(`[ats-boards] ${board.ats}/${board.slug} indisponible :`, err);
      }
    }
    return raw;
  }
}
