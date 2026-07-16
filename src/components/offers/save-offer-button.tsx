"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SaveOfferButton({
  offerId,
  initialSaved,
  isLoggedIn,
}: {
  offerId: string;
  initialSaved: boolean;
  isLoggedIn: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/offres/${offerId}/sauvegarde`, {
        method: saved ? "DELETE" : "POST",
      });
      if (!res.ok) throw new Error("Action impossible");
    },
    onSuccess: () => setSaved((s) => !s),
  });

  if (!isLoggedIn) {
    return (
      <button
        type="button"
        className="btn-outline w-full"
        onClick={() => router.push(`/connexion?callbackUrl=${encodeURIComponent(window.location.pathname)}`)}
      >
        ☆ Sauvegarder (connexion)
      </button>
    );
  }

  return (
    <button
      type="button"
      className="btn-outline w-full"
      aria-pressed={saved}
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      {saved ? "★ Sauvegardée" : "☆ Sauvegarder"}
    </button>
  );
}
