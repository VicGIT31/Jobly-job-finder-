/**
 * Couche HTTP commune aux connecteurs de scraping.
 *
 * Les connecteurs interrogent des endpoints publics **non contractuels**
 * (LinkedIn guest, agrégateurs, API ouvertes). Sans garde-fous, un cycle
 * d'ingestion se fait rate-limiter au bout de quelques dizaines de requêtes et
 * s'arrête net. Ce module apporte les quatre briques qui manquaient :
 *
 * 1. **Retry avec backoff exponentiel + jitter**, et respect de `Retry-After`.
 * 2. **Throttle par hôte** : un intervalle minimum entre deux requêtes vers le
 *    même domaine, pour rester poli et éviter le bannissement.
 * 3. **Disjoncteur par hôte** : après N échecs de rate-limit consécutifs, on
 *    coupe l'hôte pour le reste du cycle au lieu de s'acharner.
 * 4. **Parallélisme borné** (`mapPool`) : les descriptions d'offres étaient
 *    récupérées une par une ; on peut en traiter plusieurs de front tout en
 *    gardant la pression sous contrôle.
 */

/** Erreur levée quand un hôte nous a explicitement rate-limités. */
export class RateLimitedError extends Error {
  constructor(readonly host: string) {
    super(`Rate limit atteint sur ${host}`);
    this.name = "RateLimitedError";
  }
}

/**
 * Navigateurs récents — la rotation évite qu'un User-Agent unique soit
 * identifié comme robot par les défenses les plus simples.
 */
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
] as const;

export function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export type FetchOptions = {
  headers?: Record<string, string>;
  /** Méthode HTTP. Défaut GET ; certaines API de recherche exigent POST. */
  method?: "GET" | "POST";
  /** Corps de requête (POST). Rejoué tel quel à chaque tentative. */
  body?: string;
  /** Millisecondes avant abandon d'une tentative. Défaut 15 s. */
  timeoutMs?: number;
  /** Nombre de tentatives supplémentaires après le premier essai. Défaut 2. */
  retries?: number;
  /** Délai de base du backoff, doublé à chaque tentative. Défaut 600 ms. */
  backoffMs?: number;
  /** Intervalle minimum entre deux requêtes vers le même hôte. Défaut 250 ms. */
  minIntervalMs?: number;
  /** Codes HTTP considérés comme du rate-limit. Défaut 429, 503. */
  rateLimitStatuses?: number[];
};

const DEFAULTS = {
  timeoutMs: 15_000,
  retries: 2,
  backoffMs: 600,
  minIntervalMs: 250,
  rateLimitStatuses: [429, 503],
};

/**
 * Nombre d'échecs de rate-limit avant coupure de l'hôte pour le cycle.
 * Assez haut pour absorber quelques 429 isolés (une seule requête rejouée deux
 * fois en compte déjà trois), assez bas pour ne pas s'acharner.
 */
const CIRCUIT_THRESHOLD = 6;

/** Dernier instant d'appel par hôte, pour le throttle. */
const lastCallAt = new Map<string, number>();
/** Compteur d'événements de rate-limit par hôte, pour le disjoncteur. */
const rateLimitHits = new Map<string, number>();

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Remet à zéro throttle et disjoncteurs. À appeler au début de chaque cycle
 * d'ingestion : un hôte coupé au cycle précédent redevient interrogeable.
 */
export function resetHttpState(): void {
  lastCallAt.clear();
  rateLimitHits.clear();
}

/** True si l'hôte a été coupé par le disjoncteur pour le cycle courant. */
export function isHostCircuitOpen(host: string): boolean {
  return (rateLimitHits.get(host) ?? 0) >= CIRCUIT_THRESHOLD;
}

/** Espace les appels vers un même hôte d'au moins `minIntervalMs`. */
async function throttle(host: string, minIntervalMs: number): Promise<void> {
  const previous = lastCallAt.get(host);
  if (previous !== undefined) {
    const wait = previous + minIntervalMs - Date.now();
    if (wait > 0) await sleep(wait);
  }
  lastCallAt.set(host, Date.now());
}

/** Lit `Retry-After` (secondes ou date HTTP) et le borne à 30 s. */
function retryAfterMs(response: Response): number | null {
  const header = response.headers.get("retry-after");
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.min(seconds * 1000, 30_000);
  const date = Date.parse(header);
  if (Number.isNaN(date)) return null;
  return Math.min(Math.max(date - Date.now(), 0), 30_000);
}

/**
 * `fetch` durci : throttle par hôte, retries avec backoff exponentiel + jitter,
 * respect de `Retry-After`, disjoncteur. Renvoie `null` sur échec définitif
 * (4xx non rejouable ou tentatives épuisées) ; lève `RateLimitedError` quand
 * l'hôte est coupé, pour que l'appelant arrête sa boucle proprement.
 */
export async function fetchWithRetry(
  url: string | URL,
  options: FetchOptions = {},
): Promise<Response | null> {
  const config = { ...DEFAULTS, ...options };
  const target = typeof url === "string" ? new URL(url) : url;
  const host = target.host;

  if (isHostCircuitOpen(host)) throw new RateLimitedError(host);

  for (let attempt = 0; attempt <= config.retries; attempt++) {
    await throttle(host, config.minIntervalMs);

    let response: Response | null = null;
    try {
      response = await fetch(target, {
        method: config.method ?? "GET",
        ...(config.body !== undefined ? { body: config.body } : {}),
        headers: {
          "User-Agent": randomUserAgent(),
          "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
          ...config.headers,
        },
        signal: AbortSignal.timeout(config.timeoutMs),
        cache: "no-store",
      });
    } catch {
      // Réseau ou timeout : rejouable.
      response = null;
    }

    if (response?.ok) {
      // Un succès efface un rate-limit passé : seuls les échecs *rapprochés*
      // doivent faire tomber le disjoncteur, pas leur cumul sur tout le cycle.
      rateLimitHits.delete(host);
      return response;
    }

    if (response && config.rateLimitStatuses.includes(response.status)) {
      const hits = (rateLimitHits.get(host) ?? 0) + 1;
      rateLimitHits.set(host, hits);
      if (hits >= CIRCUIT_THRESHOLD) throw new RateLimitedError(host);
      const wait = retryAfterMs(response) ?? config.backoffMs * 2 ** attempt;
      await sleep(wait + Math.random() * 400);
      continue;
    }

    // 4xx définitif (404, 403, 410…) : inutile de réessayer.
    if (response && response.status >= 400 && response.status < 500) return null;

    if (attempt === config.retries) return null;
    // Backoff exponentiel + jitter, pour ne pas synchroniser les rejeux.
    await sleep(config.backoffMs * 2 ** attempt + Math.random() * 300);
  }

  return null;
}

/** `fetchWithRetry` + lecture du corps en texte. `null` si l'appel a échoué. */
export async function fetchText(
  url: string | URL,
  options: FetchOptions = {},
): Promise<string | null> {
  const response = await fetchWithRetry(url, options);
  if (!response) return null;
  try {
    return await response.text();
  } catch {
    return null;
  }
}

/** `fetchWithRetry` + parsing JSON. `null` si l'appel ou le parsing a échoué. */
export async function fetchJson<T>(
  url: string | URL,
  options: FetchOptions = {},
): Promise<T | null> {
  const response = await fetchWithRetry(url, {
    ...options,
    headers: { Accept: "application/json", ...options.headers },
  });
  if (!response) return null;
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Applique `worker` à tous les éléments avec au plus `concurrency` traitements
 * simultanés, en préservant l'ordre du tableau de sortie. Les éléments dont le
 * worker lève une exception sont simplement omis — une offre illisible ne doit
 * jamais faire échouer un cycle entier.
 */
export async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R | null>,
): Promise<R[]> {
  const results: Array<R | null> = new Array(items.length).fill(null);
  const width = Math.max(1, Math.min(concurrency, items.length));
  let cursor = 0;
  let aborted: unknown = null;

  async function run(): Promise<void> {
    for (;;) {
      const index = cursor++;
      if (index >= items.length || aborted) return;
      try {
        results[index] = await worker(items[index], index);
      } catch (err) {
        // Un hôte coupé doit stopper tout le pool, pas seulement cette tâche.
        if (err instanceof RateLimitedError) {
          aborted = err;
          return;
        }
        results[index] = null;
      }
    }
  }

  await Promise.all(Array.from({ length: width }, run));
  return results.filter((value): value is R => value !== null);
}
