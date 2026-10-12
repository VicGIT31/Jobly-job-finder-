"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { StatusScreen } from "@/components/ui/status-screen";

/** Frontière d'erreur globale : message clair et nouvelle tentative. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <StatusScreen
      eyebrow="Erreur inattendue"
      title="Un imprévu de notre côté."
      actions={
        <>
          <button type="button" onClick={reset} className="btn-cobalt">
            <RotateCcw aria-hidden="true" size={16} /> Réessayer
          </button>
          <Link href="/" className="btn-outline">
            Accueil
          </Link>
        </>
      }
    >
      La page n&apos;a pas pu s&apos;afficher. Réessayez dans un instant.
    </StatusScreen>
  );
}
