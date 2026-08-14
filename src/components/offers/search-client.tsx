"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useCallback, useMemo, useState } from "react";
import { SearchX, SlidersHorizontal } from "lucide-react";
import type { OfferSearchResult } from "@/server/search/query";
import {
  CONTRACT_LABELS,
  COUNTRY_FLAGS,
  COUNTRY_LABELS,
  DATE_RANGE_LABELS,
  EDUCATION_LABELS,
  REMOTE_LABELS,
  SORTS,
  SPECIALTY_ICONS,
  SPECIALTY_LABELS,
  TOP_CITY_RADIUS_KM,
} from "@/lib/search-params";
import { OfferCard } from "./offer-card";
import { ResultsSkeleton } from "./skeletons";
import { FacetPanel } from "./facet-panel";
import { CityAutocomplete } from "./city-autocomplete";
import { SaveSearchButton } from "./save-search-button";

const searchStateParsers = {
  q: parseAsString.withDefault(""),
  ville: parseAsString.withDefault(""),
  rayon: parseAsInteger,
  contrat: parseAsString.withDefault(""),
  remote: parseAsString.withDefault(""),
  niveau: parseAsString.withDefault(""),
  specialite: parseAsString.withDefault(""),
  pays: parseAsString.withDefault(""),
  secteur: parseAsString.withDefault(""),
  datePub: parseAsString,
  tri: parseAsStringLiteral(SORTS).withDefault("date"),
  page: parseAsInteger.withDefault(1),
};

const csv = (value: string): string[] => (value ? value.split(",").filter(Boolean) : []);
const uncsv = (values: string[]): string => values.join(",");

export function SearchClient({
  initialResult,
  isLoggedIn,
}: {
  initialResult: OfferSearchResult;
  isLoggedIn: boolean;
}) {
  const [state, setState] = useQueryStates(searchStateParsers, { history: "replace" });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (state.q) params.set("q", state.q);
    if (state.ville) params.set("ville", state.ville);
    if (state.rayon) params.set("rayon", String(state.rayon));
    if (state.contrat) params.set("contrat", state.contrat);
    if (state.remote) params.set("remote", state.remote);
    if (state.niveau) params.set("niveau", state.niveau);
    if (state.specialite) params.set("specialite", state.specialite);
    if (state.pays) params.set("pays", state.pays);
    if (state.secteur) params.set("secteur", state.secteur);
    if (state.datePub) params.set("datePub", state.datePub);
    if (state.tri !== "date") params.set("tri", state.tri);
    if (state.page > 1) params.set("page", String(state.page));
    return params.toString();
  }, [state]);

  const { data, isFetching, isPlaceholderData } = useQuery<OfferSearchResult>({
    queryKey: ["search", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/search?${queryString}`);
      if (!res.ok) throw new Error("Recherche indisponible");
      return res.json();
    },
    placeholderData: keepPreviousData,
  });

  const result = data ?? initialResult;

  const toggleFacet = useCallback(
    (facet: "contrat" | "remote" | "niveau" | "specialite" | "pays" | "secteur", value: string) => {
      const current = csv(state[facet]);
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      void setState({ [facet]: uncsv(next) || null, page: 1 });
    },
    [state, setState],
  );

  const activeTickets = useMemo(() => {
    const tickets: Array<{ key: string; label: string; remove: () => void }> = [];
    for (const c of csv(state.contrat)) {
      tickets.push({
        key: `contrat-${c}`,
        label: CONTRACT_LABELS[c as keyof typeof CONTRACT_LABELS] ?? c,
        remove: () => toggleFacet("contrat", c),
      });
    }
    for (const r of csv(state.remote)) {
      tickets.push({
        key: `remote-${r}`,
        label: REMOTE_LABELS[r as keyof typeof REMOTE_LABELS] ?? r,
        remove: () => toggleFacet("remote", r),
      });
    }
    for (const n of csv(state.niveau)) {
      tickets.push({
        key: `niveau-${n}`,
        label: EDUCATION_LABELS[n as keyof typeof EDUCATION_LABELS] ?? n,
        remove: () => toggleFacet("niveau", n),
      });
    }
    for (const sp of csv(state.specialite)) {
      tickets.push({
        key: `specialite-${sp}`,
        label: `${SPECIALTY_ICONS[sp as keyof typeof SPECIALTY_ICONS] ?? ""} ${
          SPECIALTY_LABELS[sp as keyof typeof SPECIALTY_LABELS] ?? sp
        }`.trim(),
        remove: () => toggleFacet("specialite", sp),
      });
    }
    for (const p of csv(state.pays)) {
      tickets.push({
        key: `pays-${p}`,
        label: `${COUNTRY_FLAGS[p] ?? ""} ${COUNTRY_LABELS[p] ?? p}`.trim(),
        remove: () => toggleFacet("pays", p),
      });
    }
    for (const s of csv(state.secteur)) {
      tickets.push({ key: `secteur-${s}`, label: s, remove: () => toggleFacet("secteur", s) });
    }
    if (state.datePub) {
      tickets.push({
        key: "datePub",
        label: DATE_RANGE_LABELS[state.datePub as keyof typeof DATE_RANGE_LABELS] ?? state.datePub,
        remove: () => void setState({ datePub: null, page: 1 }),
      });
    }
    if (state.ville) {
      tickets.push({
        key: "ville",
        label: state.rayon ? `${state.ville} (< ${state.rayon} km)` : state.ville,
        remove: () => void setState({ ville: null, rayon: null, page: 1 }),
      });
    }
    return tickets;
  }, [state, setState, toggleFacet]);

  const showSkeleton = isFetching && !isPlaceholderData && !data;

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <button
        type="button"
        className="btn-outline flex !min-h-[40px] items-center justify-center gap-2 text-sm lg:hidden"
        aria-expanded={filtersOpen}
        aria-controls="facet-panel"
        onClick={() => setFiltersOpen((open) => !open)}
      >
        <SlidersHorizontal aria-hidden="true" size={16} />
        {filtersOpen ? "Masquer les filtres" : "Filtres"}
        {activeTickets.length > 0 && (
          <span className="rounded-full bg-cobalt px-1.5 py-0.5 text-xs font-semibold text-white">
            {activeTickets.length}
          </span>
        )}
      </button>

      <div id="facet-panel" className={filtersOpen ? "block" : "hidden lg:block"}>
        <FacetPanel
          facets={result.facets}
          selection={{
            contrat: csv(state.contrat),
            remote: csv(state.remote),
            niveau: csv(state.niveau),
            specialite: csv(state.specialite),
            pays: csv(state.pays),
            secteur: csv(state.secteur),
            datePub: state.datePub ?? undefined,
            rayon: state.rayon ?? undefined,
            ville: state.ville,
          }}
          onToggle={toggleFacet}
          onDatePub={(v) => void setState({ datePub: v ?? null, page: 1 })}
          onRayon={(v) => void setState({ rayon: v ?? null, page: 1 })}
          onCity={(city) =>
            void setState({
              ville: city ?? null,
              rayon: city ? TOP_CITY_RADIUS_KM : null,
              page: 1,
            })
          }
        />
      </div>

      <div>
        <search role="search" aria-label="Recherche d'offres">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <label htmlFor="recherche-q" className="sr-only">
                Mot-clé
              </label>
              <input
                id="recherche-q"
                type="search"
                className="input-ink"
                placeholder="Métier, mot-clé, entreprise…"
                value={state.q}
                onChange={(e) => void setState({ q: e.target.value || null, page: 1 })}
              />
            </div>
            <div className="sm:w-56">
              <CityAutocomplete
                value={state.ville}
                onChange={(city) => void setState({ ville: city || null, rayon: null, page: 1 })}
              />
            </div>
          </div>
        </search>

        {activeTickets.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Filtres actifs">
            {activeTickets.map((ticket) => (
              <li key={ticket.key}>
                <button
                  type="button"
                  className="ticket hover:border-ink/30"
                  onClick={ticket.remove}
                >
                  {ticket.label}
                  <span aria-hidden="true">×</span>
                  <span className="sr-only">Retirer le filtre {ticket.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="rule mt-4 flex items-center justify-between pt-3">
          <p className="text-sm text-ink/70" aria-live="polite">
            <strong className="font-display text-lg text-ink">{result.totalHits}</strong> offre
            {result.totalHits > 1 ? "s" : ""}
            {isFetching && <span className="ml-2 text-ink/40">(mise à jour…)</span>}
          </p>
          <div className="flex items-center gap-3">
            {isLoggedIn && <SaveSearchButton queryString={queryString} />}
            <label htmlFor="tri" className="text-sm text-ink/70">
              Trier :
            </label>
            <select
              id="tri"
              className="input-ink !min-h-[36px] !w-auto !py-1 text-sm"
              value={state.tri}
              onChange={(e) =>
                void setState({ tri: e.target.value as (typeof SORTS)[number], page: 1 })
              }
            >
              <option value="date">Plus récentes</option>
              <option value="pertinence">Pertinence</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          {showSkeleton ? (
            <ResultsSkeleton />
          ) : result.hits.length === 0 ? (
            <EmptyState
              onReset={() =>
                void setState(
                  Object.fromEntries(Object.keys(searchStateParsers).map((k) => [k, null])),
                )
              }
            />
          ) : (
            <div className={`grid gap-3 ${isPlaceholderData ? "opacity-60" : ""}`}>
              {result.hits.map((offer) => (
                <OfferCard key={offer.id} offer={offer} />
              ))}
            </div>
          )}
        </div>

        {result.totalPages > 1 && (
          <nav aria-label="Pagination" className="rule mt-6 flex items-center justify-between pt-4">
            <button
              type="button"
              className="btn-outline !min-h-[40px] !px-4 !py-1.5 text-sm disabled:pointer-events-none disabled:opacity-40"
              disabled={result.page <= 1}
              onClick={() => void setState({ page: result.page - 1 })}
            >
              ← Précédent
            </button>
            <p className="text-sm text-ink/70">
              Page {result.page} / {result.totalPages}
            </p>
            <button
              type="button"
              className="btn-outline !min-h-[40px] !px-4 !py-1.5 text-sm disabled:pointer-events-none disabled:opacity-40"
              disabled={result.page >= result.totalPages}
              onClick={() => void setState({ page: result.page + 1 })}
            >
              Suivant →
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-ink/20 p-10 text-center">
      <SearchX aria-hidden="true" size={32} className="mx-auto text-ink/30" />
      <p className="mt-3 font-display text-2xl font-bold">Aucune offre ne correspond</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink/70">
        Essayez d'élargir votre recherche : moins de filtres, un rayon plus grand, ou un mot-clé
        plus général.
      </p>
      <button type="button" className="btn-outline mt-6" onClick={onReset}>
        Réinitialiser les filtres
      </button>
    </div>
  );
}
