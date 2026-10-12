"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";

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
        onClick={() =>
          router.push(`/connexion?callbackUrl=${encodeURIComponent(window.location.pathname)}`)
        }
      >
        <Bookmark aria-hidden="true" size={16} />
        Sauvegarder
        <span className="text-xs font-normal text-ink/60">(connexion)</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`btn-outline w-full ${saved ? "!border-accent/40 !bg-accent-soft !text-accent" : ""}`}
      aria-pressed={saved}
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      {saved ? (
        <BookmarkCheck aria-hidden="true" size={16} className="animate-[page-in_260ms_ease-out]" />
      ) : (
        <Bookmark aria-hidden="true" size={16} />
      )}
      {saved ? "Sauvegardée" : "Sauvegarder"}
    </button>
  );
}
