import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offre introuvable",
  robots: { index: false },
};

/** Cible du /go/ quand l'offre n'existe pas (lien mort, offre supprimée). */
export default function OffreIntrouvablePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-24 text-center">
      <p className="stamp">Lien expiré</p>
      <h1 className="mt-4 font-display text-3xl font-bold">Cette offre n'existe plus</h1>
      <p className="mx-auto mt-3 max-w-md text-ink/70">
        Le lien que vous avez suivi pointe vers une offre qui a été retirée de Jobly.
      </p>
      <div className="mt-8">
        <Link href="/offres" className="btn-cobalt">
          Explorer les offres actives
        </Link>
      </div>
    </div>
  );
}
