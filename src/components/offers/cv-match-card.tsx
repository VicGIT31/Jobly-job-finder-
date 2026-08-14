import Link from "next/link";
import type { CvMatchResult } from "@/server/cv/analyze";

/**
 * Comparaison CV ↔ offre par mots-clés (spec §21). Purement lexical — jamais
 * présenté comme une analyse IA, jamais de suggestion d'ajouter un mot-clé
 * non réellement maîtrisé (spec §21 : "NEVER invent experience").
 */
export function CvMatchCard({
  isLoggedIn,
  hasCv,
  result,
}: {
  isLoggedIn: boolean;
  hasCv: boolean;
  result: CvMatchResult | null;
}) {
  if (!isLoggedIn) return null;

  if (!hasCv) {
    return (
      <div className="card mt-4 p-5">
        <h2 className="font-display text-lg font-bold">Correspondance CV</h2>
        <p className="mt-2 text-sm text-ink/60">
          <Link href="/mon-espace" className="text-cobalt underline-offset-4 hover:underline">
            Ajoutez votre CV
          </Link>{" "}
          pour voir les mots-clés de cette offre que vous couvrez déjà.
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="card mt-4 p-5">
        <h2 className="font-display text-lg font-bold">Correspondance CV</h2>
        <p className="mt-2 text-sm text-ink/60">
          Cette offre ne mentionne pas de compétences techniques reconnues à comparer.
        </p>
      </div>
    );
  }

  return (
    <div className="card mt-4 p-5">
      <h2 className="font-display text-lg font-bold">Correspondance CV</h2>
      <p className="mt-1">
        <span className="font-display text-3xl font-bold tabular-nums">{result.score}%</span>{" "}
        <span className="text-sm text-ink/60">des mots-clés de l'offre trouvés dans votre CV</span>
      </p>
      <p className="mt-0.5 text-xs text-ink/45">
        Comparaison lexicale simple, pas une analyse par IA.
      </p>

      {result.found.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Trouvés</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {result.found.map((kw) => (
              <span
                key={kw}
                className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              >
                ✓ {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.missing.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
            Manquants ou non détectés
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {result.missing.map((kw) => (
              <span
                key={kw}
                className="rounded-full bg-ink/10 px-2 py-0.5 text-xs font-medium text-ink/60"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
