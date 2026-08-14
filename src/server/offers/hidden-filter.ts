/**
 * Exclusion des offres masquées (`HiddenOffer`) des résultats de recherche.
 * Volontairement appliqué APRÈS la recherche Meilisearch/PostgreSQL (voir
 * `src/server/search/query.ts`) plutôt que dans le moteur lui-même : ce
 * dernier est un système partagé, réglé finement (facettes, géo, repli) —
 * l'exclusion par utilisateur n'a pas sa place dedans pour un MVP.
 *
 * Limite connue : filtrer après pagination peut rendre une page avec moins
 * de résultats que `PAGE_SIZE`, et `totalHits` n'est décompté que pour la
 * page courante. Acceptable pour le volume actuel ; à revoir si le nombre
 * d'offres masquées par utilisateur devient significatif.
 */
export function excludeHiddenOffers<T extends { id: string }>(
  hits: T[],
  hiddenOfferIds: Set<string>,
): T[] {
  if (hiddenOfferIds.size === 0) return hits;
  return hits.filter((hit) => !hiddenOfferIds.has(hit.id));
}
