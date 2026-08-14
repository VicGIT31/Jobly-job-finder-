/**
 * Comparaison CV ↔ offre par mots-clés (spec §21 « Resume Analysis »).
 * Purement lexical, aucun appel IA : compare le vocabulaire contrôlé de
 * `skills.ts` présent dans le texte de l'offre à celui présent dans le CV.
 * Ne calcule JAMAIS de score si l'offre ne mentionne aucun mot-clé reconnu
 * (pas assez de signal) — cohérent avec `computeMatchScore` (§11).
 */
import { SKILL_KEYWORDS } from "./skills";

export type CvMatchResult = {
  score: number; // 0-100
  found: string[];
  missing: string[];
};

function fold(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Correspondance sur limite de mot plutôt que simple `.includes()` : un
 * `.includes()` naïf ferait matcher le mot-clé "go" dans "rigoureuse" ou
 * "ui" dans un mot quelconque contenant ces deux lettres consécutives —
 * observé en test avant ce correctif. Lookaround plutôt que `\b` : certains
 * mots-clés (`c++`, `c#`, `.net`, `ci/cd`) commencent/finissent par un
 * caractère non alphanumérique, sur lequel `\b` ne se comporte pas comme
 * attendu.
 */
function containsKeyword(foldedText: string, foldedKeyword: string): boolean {
  const pattern = new RegExp(`(?<![a-z0-9])${escapeRegExp(foldedKeyword)}(?![a-z0-9])`, "i");
  return pattern.test(foldedText);
}

const FOLDED_SKILLS = SKILL_KEYWORDS.map((kw) => ({ display: kw, folded: fold(kw) }));

/**
 * `null` si l'offre ne contient aucun mot-clé du vocabulaire contrôlé —
 * rien de fiable à comparer, mieux vaut ne rien afficher qu'un score creux.
 */
export function computeCvMatch(cvText: string, jobText: string): CvMatchResult | null {
  const foldedJob = fold(jobText);
  const jobSkills = FOLDED_SKILLS.filter((s) => containsKeyword(foldedJob, s.folded));
  if (jobSkills.length === 0) return null;

  const foldedCv = fold(cvText);
  const found: string[] = [];
  const missing: string[] = [];
  for (const skill of jobSkills) {
    if (containsKeyword(foldedCv, skill.folded)) found.push(skill.display);
    else missing.push(skill.display);
  }

  return {
    score: Math.round((found.length / jobSkills.length) * 100),
    found,
    missing,
  };
}
