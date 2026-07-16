"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

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
      <span className="text-sm font-semibold text-cobalt" role="status">
        ✓ Alerte créée
      </span>
    );
  }

  return (
    <button
      type="button"
      className="btn-outline !min-h-[36px] !px-3 !py-1 text-sm"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? "Création…" : "＋ Créer une alerte"}
    </button>
  );
}
