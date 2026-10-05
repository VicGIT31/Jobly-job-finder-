/**
 * Enrichissement des offres brutes à partir de leur texte.
 *
 * Les sources exposent rarement les champs « télétravail » et « niveau
 * d'études » de façon structurée : jusqu'ici toutes les offres ingérées
 * tombaient donc sur les valeurs par défaut (`ONSITE` / `INDIFFERENT`), ce qui
 * rendait les facettes correspondantes inutilisables. On les déduit du titre +
 * description, avec un vocabulaire volontairement conservateur : en cas de
 * doute on renvoie la valeur neutre plutôt qu'une valeur fausse.
 *
 * Les chaînes renvoyées sont des clés reconnues par `normalize.ts`.
 */

function fold(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Télétravail total : « full remote », « 100 % télétravail », « à distance ». */
const FULL_REMOTE =
  /(full[\s-]?remote|remote[\s-]?first|100\s*%\s*(?:de\s*)?teletravail|teletravail\s*(?:complet|total|integral|100\s*%)|entierement\s*a\s*distance)/;

/** Télétravail partiel : « hybride », « 2 jours de télétravail », « remote partiel ». */
const HYBRID =
  /(hybride|hybrid|teletravail\s*(?:partiel|possible|ponctuel)|remote\s*partiel|\d\s*(?:a\s*\d\s*)?jours?\s*(?:de\s*)?(?:teletravail|remote)|possibilite\s*de\s*teletravail)/;

/** Mention explicite de présentiel obligatoire. */
const ONSITE = /(sur\s*site|presentiel|100\s*%\s*presentiel|pas\s*de\s*teletravail)/;

/**
 * Déduit la politique de télétravail. « full remote » l'emporte sur
 * « hybride », qui l'emporte sur « sur site » : la mention la plus forte est la
 * plus informative pour le candidat.
 */
export function inferRemotePolicy(...parts: Array<string | null | undefined>): string {
  const text = fold(parts.filter(Boolean).join(" "));
  if (FULL_REMOTE.test(text)) return "remote";
  if (HYBRID.test(text)) return "hybride";
  if (ONSITE.test(text)) return "sur site";
  return "onsite";
}

/**
 * Niveaux d'études, du plus élevé au plus bas. On s'arrête au premier trouvé :
 * une offre « Bac+3 à Bac+5 » est indexée sur le niveau le plus haut, qui est
 * celui qui filtre le moins de candidats à l'affichage.
 */
const EDUCATION_PATTERNS: Array<[RegExp, string]> = [
  [/(doctorat|\bphd\b|\bthese\b)/, "doctorat"],
  [/(bac\s*\+?\s*5|\bmaster\b|\bm2\b|\bm1\b|ingenieur|ecole\s*d.?ingenieur|\bmba\b)/, "bac+5"],
  [/(bac\s*\+?\s*3|licence|\bbachelor\b|\bl3\b|\bbut\b)/, "bac+3"],
  [/(bac\s*\+?\s*2|\bbts\b|\bdut\b|\bdeug\b)/, "bac+2"],
  [/(niveau\s*bac\b|bac\s*general|bac\s*pro)/, "bac"],
];

/** Déduit le niveau d'études requis, « indifférent » si rien n'est reconnu. */
export function inferEducationLevel(...parts: Array<string | null | undefined>): string {
  const text = fold(parts.filter(Boolean).join(" "));
  for (const [pattern, level] of EDUCATION_PATTERNS) {
    if (pattern.test(text)) return level;
  }
  return "indifférent";
}

/**
 * Déduit le type de contrat depuis le titre et la description.
 * L'alternance prime : beaucoup d'annonces titrent « Stage / Alternance » alors
 * que le corps précise un rythme d'apprentissage. Renvoie `null` si aucun des
 * deux vocabulaires n'apparaît, pour que l'appelant garde son propre indice.
 */
export function inferContractType(...parts: Array<string | null | undefined>): string | null {
  const text = fold(parts.filter(Boolean).join(" "));
  if (
    /\b(alternance|alternant\w*|apprentice(?:ship)?|apprenti(?:e|s|es)?|contrat\s*pro)\b|^apprentissage\b|\ben apprentissage\b|contrat\s*d.apprentissage/.test(
      text,
    )
  )
    return "alternance";
  if (
    /(\bstage\b|stagiaire|\binternship\b|\bintern\b|\bpfe\b)/.test(text) &&
    !/\b(?:early|late|seed)[ -]stage\b/.test(text)
  )
    return "stage";
  return null;
}
