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

import { readCachedBody, writeCachedBody } from "./public-cache";
import { assertPublicTarget } from "./public-network";
import { AsyncLocalStorage } from "node:async_hooks";

const requestBudget = new AsyncLocalStorage<AbortSignal>();
export class CollectionDeadlineError extends RateLimitedError {
  constructor() {
    super("source");
    this.name = "CollectionDeadlineError";
    this.message = "Budget de temps de la source atteint ; couverture partielle";
  }
}
export function withCollectionBudget<T>(
  timeoutMs: number,
  collect: () => Promise<T>,
  onTimeout?: () => void,
  cancelSignal?: AbortSignal,
): Promise<T> {
  const signal = AbortSignal.any([AbortSignal.timeout(timeoutMs), ...(cancelSignal ? [cancelSignal] : [])]);
  return requestBudget.run(signal, async () => {
    try {
      return await collect();
    } finally {
      if (signal.aborted) onTimeout?.();
    }
  });
}
export function assertCollectionBudget(): void {
  if (requestBudget.getStore()?.aborted) throw new CollectionDeadlineError();
}

export class AccessDeniedError extends RateLimitedError {
  constructor(
    host: string,
    readonly status: number,
  ) {
    super(host);
    this.name = "AccessDeniedError";
    this.message = `Accès public refusé sur ${host} (HTTP ${status})`;
  }
}

type HttpFailure = { url: string; status: number | null; message: string };
const failures: HttpFailure[] = [];
export function getHttpFailures(): readonly HttpFailure[] {
  return failures;
}

export type FetchOptions = {
  /** Valide DNS et chaque redirection pour les URLs découvertes. */
  publicOnly?: boolean;
  redirectCount?: number;
  maxBodyBytes?: number;
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
  /** Cache persistant réservé aux réponses publiques GET, en millisecondes. */
  cacheTtlMs?: number;
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
/** Les Retry-After longs survivent au changement de cycle. */
const cooldownUntil = new Map<string, number>();

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Remet à zéro throttle et disjoncteurs. À appeler au début de chaque cycle
 * d'ingestion : un hôte coupé au cycle précédent redevient interrogeable.
 */
export function resetHttpState(): void {
  lastCallAt.clear();
  rateLimitHits.clear();
  failures.length = 0;
}

/** True si l'hôte a été coupé par le disjoncteur pour le cycle courant. */
export function isHostCircuitOpen(host: string): boolean {
  const until = cooldownUntil.get(host);
  if (until && until > Date.now()) return true;
  if (until) cooldownUntil.delete(host);
  return (rateLimitHits.get(host) ?? 0) >= CIRCUIT_THRESHOLD;
}

/** Espace les appels vers un même hôte d'au moins `minIntervalMs`. */
async function throttle(host: string, minIntervalMs: number): Promise<void> {
  // Réserver le créneau AVANT de dormir : les workers concurrents ne prennent
  // plus tous le même créneau (ancienne course dans le pool de détails).
  const slot = Math.max(Date.now(), (lastCallAt.get(host) ?? 0) + minIntervalMs);
  lastCallAt.set(host, slot);
  const wait = slot - Date.now();
  if (wait > 0) await sleep(wait);
}

/** Lit `Retry-After` (secondes ou date HTTP) et le borne à 30 s. */
function retryAfterMs(response: Response): number | null {
  const header = response.headers.get("retry-after");
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(seconds * 1000, 0);
  const date = Date.parse(header);
  if (Number.isNaN(date)) return null;
  return Math.max(date - Date.now(), 0);
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
  if (config.publicOnly) await assertPublicTarget(target);

  if (isHostCircuitOpen(host)) throw new RateLimitedError(host);

  for (let attempt = 0; attempt <= config.retries; attempt++) {
    assertCollectionBudget();
    await throttle(host, config.minIntervalMs);
    assertCollectionBudget();
    if (isHostCircuitOpen(host)) throw new RateLimitedError(host);

    let response: Response | null = null;
    try {
      response = await fetch(target, {
        method: config.method ?? "GET",
        ...(config.body !== undefined ? { body: config.body } : {}),
        headers: {
          "User-Agent": "Jobly/1.0 (public job listings; personal use)",
          "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
          ...config.headers,
        },
        signal: AbortSignal.any([
          AbortSignal.timeout(config.timeoutMs),
          ...(requestBudget.getStore() ? [requestBudget.getStore()!] : []),
        ]),
        redirect: config.publicOnly ? "manual" : "follow",
        cache: "no-store",
      });
    } catch {
      assertCollectionBudget();
      // Réseau ou timeout : rejouable.
      response = null;
    }

    if (config.publicOnly && response && [301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location || (config.redirectCount ?? 0) >= 5) return null;
      const next = new URL(location, target);
      // Une redirection ne reçoit jamais le corps ou les secrets d'une API.
      if (next.origin !== target.origin && (config.body || config.headers?.Authorization)) return null;
      return fetchWithRetry(next, { ...options, redirectCount: (config.redirectCount ?? 0) + 1 });
    }
    if (response?.ok) {
      // Un succès efface un rate-limit passé : seuls les échecs *rapprochés*
      // doivent faire tomber le disjoncteur, pas leur cumul sur tout le cycle.
      rateLimitHits.delete(host);
      return response;
    }

    failures.push({
      url: target.href,
      status: response?.status ?? null,
      message: response ? `HTTP ${response.status}` : "Réseau ou délai dépassé",
    });
    if (response?.status === 401 || response?.status === 403) {
      rateLimitHits.set(host, CIRCUIT_THRESHOLD);
      throw new AccessDeniedError(host, response.status);
    }

    if (response && config.rateLimitStatuses.includes(response.status)) {
      const hits = (rateLimitHits.get(host) ?? 0) + 1;
      rateLimitHits.set(host, hits);
      if (hits >= CIRCUIT_THRESHOLD) throw new RateLimitedError(host);
      const wait = retryAfterMs(response) ?? config.backoffMs * 2 ** attempt;
      // Ne pas rejouer AVANT un Retry-After long et ne pas immobiliser le cycle.
      if (wait > 30_000) {
        cooldownUntil.set(host, Date.now() + wait);
        rateLimitHits.set(host, CIRCUIT_THRESHOLD);
        throw new RateLimitedError(host);
      }
      if (attempt === config.retries) return null;
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
  assertCollectionBudget();
  const key = `${String(url)}|${options.headers?.Accept ?? "text"}`;
  const cacheable =
    (options.cacheTtlMs ?? 0) > 0 &&
    (!options.method || options.method === "GET") &&
    !options.headers?.Authorization &&
    !options.body;
  if (cacheable) {
    const cached = await readCachedBody(key, options.cacheTtlMs!);
    if (cached !== null) return cached;
  }
  const response = await fetchWithRetry(url, options);
  if (!response) return null;
  try {
    const limit = options.maxBodyBytes ?? 8_000_000;
    const reader = response.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) { await reader.cancel(); return null; }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = Buffer.concat(chunks);
    // Les sitemaps WTTJ sont des fichiers .gz, sans Content-Encoding HTTP.
    const body =
      bytes[0] === 0x1f && bytes[1] === 0x8b
        ? (await import("node:zlib")).gunzipSync(bytes, { maxOutputLength: limit }).toString("utf8")
        : new TextDecoder().decode(bytes);
    if (cacheable) await writeCachedBody(key, body);
    return body;
  } catch {
    return null;
  }
}

/** `fetchWithRetry` + parsing JSON. `null` si l'appel ou le parsing a échoué. */
export async function fetchJson<T>(
  url: string | URL,
  options: FetchOptions = {},
): Promise<T | null> {
  const body = await fetchText(url, {
    ...options,
    headers: { Accept: "application/json", ...options.headers },
  });
  if (body === null) return null;
  try {
    return JSON.parse(body) as T;
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
