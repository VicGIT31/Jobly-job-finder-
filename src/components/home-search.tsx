"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { CityAutocomplete } from "@/components/offers/city-autocomplete";

/** Barre de recherche phare de l'accueil — renvoie vers /offres avec les paramètres. */
export function HomeSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [ville, setVille] = useState("");
  const [pending, setPending] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (ville) params.set("ville", ville);
    setPending(true);
    router.push(`/offres${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label="Recherche d'offres"
      className="group/search flex flex-col gap-1.5 rounded-2xl border border-line bg-paper p-1.5 shadow-lift transition-[border-color,box-shadow] duration-base ease-out focus-within:border-accent/60 focus-within:shadow-[0_0_0_5px_rgb(var(--accent)/0.12),0_20px_50px_-20px_rgb(var(--shadow)/0.3)] sm:flex-row sm:items-stretch"
    >
      <div className="relative flex-1">
        <label htmlFor="home-q" className="sr-only">
          Métier ou mot-clé
        </label>
        <Search
          aria-hidden="true"
          size={19}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/60"
        />
        <input
          id="home-q"
          type="search"
          className="h-full min-h-[52px] w-full rounded-xl bg-transparent pl-11 pr-3 text-base text-ink placeholder:text-ink/50 focus:outline-none"
          placeholder="Data, React, cybersécurité, Thales…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="border-t border-line sm:w-56 sm:border-l sm:border-t-0">
        <CityAutocomplete variant="bare" value={ville} onChange={setVille} placeholder="Ville" />
      </div>
      <button
        type="submit"
        className="btn-cobalt group/btn !min-h-[52px] !rounded-xl px-6 text-[15px]"
      >
        Rechercher
        <ArrowRight
          aria-hidden="true"
          size={17}
          className={`transition-transform duration-base ease-out group-hover/btn:translate-x-0.5 ${
            pending ? "translate-x-1 opacity-60" : ""
          }`}
        />
      </button>
    </form>
  );
}
