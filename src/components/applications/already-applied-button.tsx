"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAlreadyApplied } from "@/server/applications/actions";

/**
 * « Déjà postulée » : pour les candidats qui ont postulé hors du flux
 * `/go/:offerId` (site externe visité directement) et veulent quand même que
 * l'offre apparaisse dans leur suivi.
 */
export function AlreadyAppliedButton({
  offerId,
  isLoggedIn,
  initialTracked,
}: {
  offerId: string;
  isLoggedIn: boolean;
  initialTracked: boolean;
}) {
  const [tracked, setTracked] = useState(initialTracked);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (tracked) {
    return (
      <p className="mt-2 text-center text-xs font-semibold text-cobalt">✓ Dans vos candidatures</p>
    );
  }

  if (!isLoggedIn) {
    return (
      <button
        type="button"
        className="mt-2 w-full text-center text-xs text-ink/50 underline-offset-4 hover:text-ink hover:underline"
        onClick={() =>
          router.push(`/connexion?callbackUrl=${encodeURIComponent(window.location.pathname)}`)
        }
      >
        Déjà postulé·e ? Suivre cette candidature
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      className="mt-2 w-full text-center text-xs text-ink/50 underline-offset-4 hover:text-ink hover:underline disabled:opacity-50"
      onClick={() =>
        startTransition(async () => {
          const res = await markAlreadyApplied(offerId);
          if (res.ok) setTracked(true);
          else alert(res.error);
        })
      }
    >
      {pending ? "…" : "Déjà postulé·e ? Suivre cette candidature"}
    </button>
  );
}
