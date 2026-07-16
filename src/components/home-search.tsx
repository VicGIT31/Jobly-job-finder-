"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CityAutocomplete } from "@/components/offers/city-autocomplete";

export function HomeSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [ville, setVille] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (ville) params.set("ville", ville);
    router.push(`/offres${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <form onSubmit={submit} role="search" aria-label="Recherche d'offres" className="flex flex-col gap-2 sm:flex-row">
      <div className="flex-1">
        <label htmlFor="home-q" className="sr-only">
          Métier ou mot-clé
        </label>
        <input
          id="home-q"
          type="search"
          className="input-ink"
          placeholder="Métier, mot-clé, entreprise…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="sm:w-52">
        <CityAutocomplete value={ville} onChange={setVille} placeholder="Ville" />
      </div>
      <button type="submit" className="btn-cobalt">
        Rechercher
      </button>
    </form>
  );
}
