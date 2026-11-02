"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";

export function SaveOfferButton({
  offerId,
  initialSaved,
}: {
  offerId: string;
  initialSaved: boolean;
  isLoggedIn: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/offres/${offerId}/sauvegarde`, {
        method: saved ? "DELETE" : "POST",
      });
      if (!res.ok) throw new Error("Action impossible");
    },
    onSuccess: () => setSaved((s) => !s),
  });


  return (
    <div><button
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
    </button>{mutation.isError && <p role="alert" className="mt-1 text-xs text-danger">Enregistrement impossible. Réessayez.</p>}</div>
  );
}
