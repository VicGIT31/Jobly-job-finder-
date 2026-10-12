import Link from "next/link";
import { FileText } from "lucide-react";
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
      <div className="panel">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <FileText aria-hidden="true" size={17} className="text-accent" />
          Correspondance CV
        </h2>
        <p className="mt-2 text-sm text-ink/60">
          <Link href="/mon-espace" className="link">
            Ajoutez votre CV
          </Link>{" "}
          pour voir les mots-clés de cette offre que vous couvrez déjà.
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="panel">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <FileText aria-hidden="true" size={17} className="text-accent" />
          Correspondance CV
        </h2>
        <p className="mt-2 text-sm text-ink/60">
          Cette offre ne mentionne pas de compétences techniques reconnues à comparer.
        </p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
        <FileText aria-hidden="true" size={17} className="text-accent" />
        Correspondance CV
      </h2>
      <p className="mt-1">
        <span className="font-mono text-3xl font-semibold tabular-nums tracking-[-0.04em]">
          {result.score}%
        </span>{" "}
        <span className="text-sm text-ink/60">des mots-clés de l'offre trouvés dans votre CV</span>
      </p>
      <p className="mt-0.5 text-xs text-ink/60">
        Comparaison lexicale simple, pas une analyse par IA.
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
        <div className="h-full rounded-full bg-cobalt/70" style={{ width: `${result.score}%` }} />
      </div>

      {result.found.length > 0 && (
        <div className="mt-3">
          <p className="eyebrow">Trouvés</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {result.found.map((kw) => (
              <span
                key={kw}
                className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success"
              >
                ✓ {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.missing.length > 0 && (
        <div className="mt-3">
          <p className="eyebrow">Manquants ou non détectés</p>
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
