"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { BellPlus, Check, LoaderCircle } from "lucide-react";

/** Crée une alerte depuis la recherche filtrée courante, en un clic. */
export function SaveSearchButton({ queryString }: { queryString: string }) {
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/alertes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queryString }),
      });
      if (!res.ok) throw new Error("Impossible de créer l'alerte");
      return res.json();
    },
    onSuccess: () => setSaved(true),
  });

  if (saved) {
    return (
      <span
        className="inline-flex h-9 animate-page-in items-center gap-1.5 rounded-lg bg-success-soft px-3 text-[13px] font-semibold text-success"
        role="status"
      >
        <Check aria-hidden="true" size={15} strokeWidth={2.5} />
        Recherche enregistrée
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        className="btn-outline btn-sm"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <LoaderCircle aria-hidden="true" size={15} className="animate-spin" />
        ) : (
          <BellPlus aria-hidden="true" size={15} />
        )}
        <span className="hidden sm:inline">
          {mutation.isPending ? "Création…" : "Enregistrer la recherche"}
        </span>
        <span className="sr-only sm:hidden">Enregistrer la recherche</span>
      </button>
      {mutation.isError && (
        <span className="text-xs text-danger" role="alert">
          Échec, réessayez.
        </span>
      )}
    </>
  );
}
