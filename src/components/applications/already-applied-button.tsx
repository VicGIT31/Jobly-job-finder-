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
      <p className="mt-1 flex min-h-[32px] items-center justify-center gap-1 text-xs font-semibold text-success">
        ✓ Dans vos candidatures
      </p>
    );
  }

  if (!isLoggedIn) {
    return (
      <button
        type="button"
        className="mt-1 min-h-[32px] w-full rounded-md text-center text-xs text-ink/60 transition-colors hover:text-ink"
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
      className="mt-1 min-h-[32px] w-full rounded-md text-center text-xs text-ink/60 transition-colors hover:text-ink disabled:opacity-50"
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
