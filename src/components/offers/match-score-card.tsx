import Link from "next/link";
import { Target } from "lucide-react";
import { scoreTier, type MatchResult } from "@/server/match/score";

/**
 * Score de correspondance côté candidat (§11 du cahier des charges) : jamais
 * présenté comme une décision de l'employeur, toujours accompagné du détail
 * qui le justifie. `result === null` → profil insuffisant pour comparer.
 */
export function MatchScoreCard({
  isLoggedIn,
  result,
}: {
  isLoggedIn: boolean;
  result: MatchResult | null;
}) {
  if (!isLoggedIn) {
    return (
      <div className="panel">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <Target aria-hidden="true" size={17} className="text-accent" />
          Correspondance
        </h2>
        <p className="mt-2 text-sm text-ink/60">
          <Link href="/connexion" className="link">
            Connectez-vous
          </Link>{" "}
          pour voir en quoi cette offre correspond à votre profil.
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="panel">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <Target aria-hidden="true" size={17} className="text-accent" />
          Correspondance
        </h2>
        <p className="mt-2 text-sm text-ink/60">
          Complétez vos préférences (niveau d'études, spécialité, ville) pour voir votre score de
          correspondance sur cette offre.
        </p>
        <Link href="/mon-espace" className="link mt-3 inline-block text-sm">
          Compléter mon profil →
        </Link>
      </div>
    );
  }

  const tier = scoreTier(result.score);

  return (
    <div className="panel">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
        <Target aria-hidden="true" size={17} className="text-accent" />
        Correspondance
      </h2>
      <p className="mt-1">
        <span className="font-mono text-3xl font-semibold tabular-nums tracking-[-0.04em]">
          {result.score}%
        </span>{" "}
        <span className={`text-sm font-semibold ${tier.className}`}>{tier.label}</span>
      </p>
      <p className="mt-0.5 text-xs text-ink/60">
        Estimation basée sur votre profil, pas une décision de l'employeur.
      </p>

      <ul className="mt-4 space-y-3 text-sm">
        {result.factors.map((factor) => (
          <li key={factor.key}>
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{factor.label}</p>
              <span className="shrink-0 tabular-nums text-ink/70">{factor.score}%</span>
            </div>
            <p className="text-xs text-ink/60">{factor.explanation}</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
              <div
                className="h-full rounded-full bg-cobalt/70"
                style={{ width: `${factor.score}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
