"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function HideOfferButton({
  offerId,
  initialHidden,
  isLoggedIn,
}: {
  offerId: string;
  initialHidden: boolean;
  isLoggedIn: boolean;
}) {
  const [hidden, setHidden] = useState(initialHidden);
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/offres/${offerId}/masquage`, {
        method: hidden ? "DELETE" : "POST",
      });
      if (!res.ok) throw new Error("Action impossible");
    },
    onSuccess: () => setHidden((h) => !h),
  });

  if (!isLoggedIn) {
    return (
      <button
        type="button"
        className="mt-2 w-full text-center text-xs text-ink/50 underline-offset-4 hover:text-ink hover:underline"
        onClick={() =>
          router.push(`/connexion?callbackUrl=${encodeURIComponent(window.location.pathname)}`)
        }
      >
        Masquer cette offre (connexion)
      </button>
    );
  }

  return (
    <button
      type="button"
      className="mt-2 w-full text-center text-xs text-ink/50 underline-offset-4 hover:text-ink hover:underline disabled:opacity-50"
      aria-pressed={hidden}
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      {hidden ? "✓ Offre masquée — réafficher" : "Ne plus me proposer cette offre"}
    </button>
  );
}
