"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { CityAutocomplete } from "@/components/offers/city-autocomplete";
import { TOP_CITY_RADIUS_KM } from "@/lib/search-params";

export function HomeSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [ville, setVille] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (ville.trim()) {
      params.set("ville", ville.trim());
      params.set("rayon", String(TOP_CITY_RADIUS_KM));
    }
    router.push(`/offres${params.size ? `?${params}` : ""}`);
  }

  return (
    <form onSubmit={submit} role="search" aria-label="Recherche d’offres" className="national-search">
      <div className="national-search-field">
        <label htmlFor="home-q">Métier ou entreprise</label>
        <div className="relative">
          <Search aria-hidden="true" size={18} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink/55" />
          <input id="home-q" type="search" className="h-11 w-full rounded-lg bg-transparent pl-9 pr-2 text-base" placeholder="Infirmier, développeur, boulanger…" value={q} onChange={(event) => setQ(event.target.value)} />
        </div>
      </div>
      <div className="national-search-field national-search-city">
        <span className="national-search-label">Lieu</span>
        <CityAutocomplete variant="bare" value={ville} onChange={setVille} placeholder="Toute la France" />
      </div>
      <button className="btn-cobalt national-search-submit" type="submit">Rechercher</button>
    </form>
  );
}
