import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StatusScreen } from "@/components/ui/status-screen";

export const metadata: Metadata = {
  title: "Offre introuvable",
  robots: { index: false },
};

/** Cible du /go/ quand l'offre n'existe pas (lien mort, offre supprimée). */
export default function OffreIntrouvablePage() {
  return (
    <StatusScreen
      eyebrow="Lien expiré"
      title="Cette offre n'existe plus"
      actions={
        <Link href="/offres" className="btn-cobalt">
          Explorer les offres actives <ArrowRight aria-hidden="true" size={16} />
        </Link>
      }
    >
      Le lien que vous avez suivi pointe vers une offre qui a été retirée de Jobly.
    </StatusScreen>
  );
}
