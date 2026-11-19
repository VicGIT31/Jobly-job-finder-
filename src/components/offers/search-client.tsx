"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  RotateCcw,
  Search,
  SearchX,
  SlidersHorizontal,
  TriangleAlert,
  X,
} from "lucide-react";
import type { OfferSearchResult } from "@/server/search/query";
import type { MatchCandidate } from "@/server/match/score";
import {
  COLLECTION_ICONS,
  COLLECTION_LABELS,
  CONTRACT_LABELS,
  COUNTRY_FLAGS,
  COUNTRY_LABELS,
  DATE_RANGE_LABELS,
  EDUCATION_LABELS,
  REMOTE_LABELS,
  resolveSort,
  SORTS,
  SPECIALTY_LABELS,
  TOP_CITY_RADIUS_KM,
} from "@/lib/search-params";
import {
  EXPERIENCE_LABELS,
  FAMILY_LABELS,
  TAG_LABELS,
  UNIVERSE_SHORT_LABELS,
  type JobUniverse,
} from "@/lib/job-taxonomy";
import { DURATION, SPRING } from "@/components/motion/tokens";
import { Segmented } from "@/components/ui/segmented";
import { OfferCard } from "./offer-card";
import { OfferWorkspace } from "./offer-workspace";
import { ResultsSkeleton } from "./skeletons";
import { FacetPanel, type FacetKey } from "./facet-panel";
import { CollectionBar } from "./collection-bar";
import { CityAutocomplete } from "./city-autocomplete";
import { SaveSearchButton } from "./save-search-button";
import { MotionProvider } from "@/components/motion/motion-provider";

/** Rayon appliqué dès qu'une commune est choisie : distance exacte plutôt que nom de ville. */
const DEFAULT_RADIUS_KM = 30;

const searchStateParsers = {
  q: parseAsString.withDefault(""),
  ville: parseAsString.withDefault(""),
  rayon: parseAsInteger,
  univers: parseAsString.withDefault(""),
  metier: parseAsString.withDefault(""),
  experience: parseAsString.withDefault(""),
  tag: parseAsString.withDefault(""),
  qualification: parseAsString.withDefault(""),
  salaire: parseAsInteger,
  incertaines: parseAsString.withDefault(""),
  contrat: parseAsString.withDefault(""),
  remote: parseAsString.withDefault(""),
  niveau: parseAsString.withDefault(""),
  specialite: parseAsString.withDefault(""),
  pays: parseAsString.withDefault(""),
  secteur: parseAsString.withDefault(""),
  categorie: parseAsString.withDefault(""),
  datePub: parseAsString,
  tri: parseAsStringLiteral(SORTS),
  page: parseAsInteger.withDefault(1),
};

const csv = (value: string): string[] => (value ? value.split(",").filter(Boolean) : []);
const uncsv = (values: string[]): string => values.join(",");

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function SearchClient({
  initialResult,
  isLoggedIn,
  candidateProfile,
}: {
  initialResult: OfferSearchResult;
  isLoggedIn: boolean;
  /** Profil du candidat connecté, pour le score de correspondance sur chaque carte (spec §11). */
  candidateProfile?: MatchCandidate | null;
}) {
  const [state, setState] = useQueryStates(searchStateParsers, { history: "replace" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterTrigger = useRef<HTMLButtonElement>(null);
  const filterDialog = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsTopRef = useRef<HTMLDivElement>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (state.q) params.set("q", state.q);
    if (state.ville) params.set("ville", state.ville);
    if (state.rayon) params.set("rayon", String(state.rayon));
    if (state.univers) params.set("univers", state.univers);
    if (state.metier) params.set("metier", state.metier);
    if (state.experience) params.set("experience", state.experience);
    if (state.tag) params.set("tag", state.tag);
    if (state.qualification) params.set("qualification", state.qualification);
    if (state.salaire) params.set("salaire", String(state.salaire));
    if (state.incertaines) params.set("incertaines", state.incertaines);
    if (state.contrat) params.set("contrat", state.contrat);
    if (state.remote) params.set("remote", state.remote);
    if (state.niveau) params.set("niveau", state.niveau);
    if (state.specialite) params.set("specialite", state.specialite);
    if (state.pays) params.set("pays", state.pays);
    if (state.secteur) params.set("secteur", state.secteur);
    if (state.categorie) params.set("categorie", state.categorie);
    if (state.datePub) params.set("datePub", state.datePub);
    if (state.tri) params.set("tri", state.tri);
    if (state.page > 1) params.set("page", String(state.page));
    return params.toString();
  }, [state]);

  // Capturé une seule fois au montage : les mêmes paramètres d'URL ont déjà
  // été utilisés côté serveur pour produire `initialResult`. Sert à ne
  // réutiliser cette donnée SSR que pour la requête initiale exacte, jamais
  // pour une recherche suivante après changement de filtre.
  const initialQueryStringRef = useRef(queryString);

  const { data, isFetching, isPlaceholderData, isError, refetch } = useQuery<OfferSearchResult>({
    queryKey: ["search", queryString],
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/search?${queryString}`, { signal });
      if (!res.ok) throw new Error("Recherche indisponible");
      return res.json();
    },
    // Sans ceci, le premier rendu (y compris le HTML servi par le serveur,
    // avant hydratation) affichait toujours le squelette de chargement au
    // lieu des offres déjà connues via `initialResult` — la recherche
    // paraissait vide à toute requête sans JavaScript (SEO, crawlers,
    // partage de lien) alors que le commentaire du composant parent
    // affirmait explicitement un rendu SSR à cette fin.
    initialData: queryString === initialQueryStringRef.current ? initialResult : undefined,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  // En cas d'erreur, les derniers résultats restent affichés plutôt qu'un écran vide.
  const lastResult = useRef(initialResult);
  if (data) lastResult.current = data;
  const result = data ?? lastResult.current;

  const toggleFacet = useCallback(
    (facet: FacetKey, value: string) => {
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
    for (const u of csv(state.univers)) {
      tickets.push({
        key: `univers-${u}`,
        label: UNIVERSE_SHORT_LABELS[u as JobUniverse] ?? u,
        remove: () => toggleFacet("univers", u),
      });
    }
    for (const m of csv(state.metier)) {
      tickets.push({
        key: `metier-${m}`,
        label: FAMILY_LABELS[m] ?? m,
        remove: () => toggleFacet("metier", m),
      });
    }
    for (const e of csv(state.experience)) {
      tickets.push({
        key: `experience-${e}`,
        label: EXPERIENCE_LABELS[e] ?? e,
        remove: () => toggleFacet("experience", e),
      });
    }
    for (const t of csv(state.tag)) {
      tickets.push({
        key: `tag-${t}`,
        label: TAG_LABELS[t] ?? t,
        remove: () => toggleFacet("tag", t),
      });
    }
    if (state.qualification) {
      tickets.push({
        key: "qualification",
        label: `Qualification : ${state.qualification}`,
        remove: () => void setState({ qualification: null, page: 1 }),
      });
    }
    if (state.salaire) {
      tickets.push({
        key: "salaire",
        label: `≥ ${state.salaire.toLocaleString("fr-FR")} € / an`,
        remove: () => void setState({ salaire: null, page: 1 }),
      });
    }
    if (state.incertaines === "1") {
      tickets.push({
        key: "incertaines",
        label: "Offres à revérifier incluses",
        remove: () => void setState({ incertaines: null, page: 1 }),
      });
    }
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
        label: SPECIALTY_LABELS[sp as keyof typeof SPECIALTY_LABELS] ?? sp,
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
    for (const cat of csv(state.categorie)) {
      tickets.push({
        key: `categorie-${cat}`,
        label: `${COLLECTION_ICONS[cat] ?? ""} ${COLLECTION_LABELS[cat] ?? cat}`.trim(),
        remove: () => toggleFacet("categorie", cat),
      });
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

  const resetAll = useCallback(
    () => void setState(Object.fromEntries(Object.keys(searchStateParsers).map((k) => [k, null]))),
    [setState],
  );

  const showSkeleton = isFetching && !isPlaceholderData && !data;
  const sort = resolveSort({ tri: state.tri ?? undefined, q: state.q, ville: state.ville });

  // Contrat : contrôle segmenté (Tous / Stage / Alternance) au-dessus des
  // résultats — c'est le critère le plus discriminant du catalogue.
  const contracts = csv(state.contrat);
  const contractValue = contracts.length === 1 ? contracts[0] : "ALL";
  // Les facettes sont calculées après filtrage : une fois un contrat choisi,
  // l'autre afficherait « 0 ». On ne montre donc les volumes que sur « Tous ».
  const contractCount = (type: string) =>
    contractValue === "ALL" ? (result.facets.contractType?.[type] ?? 0) : null;

  // « / » place le curseur dans la recherche, comme sur les outils de dev.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || filterDialog.current) return;
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      searchInputRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Tiroir de filtres mobile : Échap pour fermer, défilement de fond bloqué.
  useEffect(() => {
    if (!filtersOpen) return;
    const trigger = filterTrigger.current;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setFiltersOpen(false); return; }
      if (event.key !== "Tab") return;
      const controls = [...(filterDialog.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), summary, a[href]',
      ) ?? [])].filter((control) => control.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || !filterDialog.current?.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !filterDialog.current?.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      trigger?.focus();
    };
  }, [filtersOpen]);

  function goToPage(page: number) {
    void setState({ page });
    resultsTopRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  }

  // Clé de la liste : change quand de *nouveaux* résultats arrivent, pour
  // rejouer l'entrée en cascade — pas pendant l'affichage des anciens.
  const listKey = `${result.page}-${result.hits
    .slice(0, 4)
    .map((h) => h.id)
    .join("|")}`;

  const facetPanel = (
    <FacetPanel
      facets={result.facets}
      selection={{
        univers: csv(state.univers),
        metier: csv(state.metier),
        experience: csv(state.experience),
        tag: csv(state.tag),
        qualification: state.qualification,
        salaire: state.salaire,
        incertaines: state.incertaines === "1",
        contrat: csv(state.contrat),
        remote: csv(state.remote),
        niveau: csv(state.niveau),
        specialite: csv(state.specialite),
        pays: csv(state.pays),
        secteur: csv(state.secteur),
        categorie: csv(state.categorie),
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
      onField={(field, value) =>
        void setState({
          ...(field === "incertaines" ? { incertaines: value ? "1" : null } : {}),
          ...(field === "qualification" ? { qualification: String(value) || null } : {}),
          ...(field === "salaire" ? { salaire: Number(value) > 0 ? Number(value) : null } : {}),
          page: 1,
        })
      }
    />
  );

  return (
    <MotionProvider>
      <div>
        {/* Barre de recherche collante : le point d'entrée principal du catalogue. */}
        <div className="sticky top-[var(--header-h)] z-30 -mx-4 border-b border-line bg-canvas px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <search role="search" aria-label="Recherche d'offres" className="flex gap-2">
            <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-line bg-paper shadow-card transition-[border-color,box-shadow] duration-base focus-within:border-accent focus-within:shadow-ring sm:flex-row sm:items-stretch">
              <div className="relative min-w-0 flex-1">
                <label htmlFor="recherche-q" className="sr-only">
                  Mot-clé
                </label>
                <Search
                  aria-hidden="true"
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/60"
                />
                <input
                  ref={searchInputRef}
                  id="recherche-q"
                  type="search"
                  className="h-full min-h-[48px] w-full rounded-xl bg-transparent pl-10 pr-10 text-[15px] text-ink placeholder:text-ink/50 focus:outline-none"
                  placeholder="Métier, intitulé, entreprise…"
                  value={state.q}
                  onChange={(e) => void setState({ q: e.target.value || null, page: 1 })}
                />
                <span className="kbd pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 sm:inline-flex">
                  /
                </span>
              </div>
              <div className="border-t border-line sm:w-60 sm:border-l sm:border-t-0">
                <CityAutocomplete
                  variant="bare"
                  value={state.ville}
                  onChange={(city) =>
                    void setState({
                      ville: city || null,
                      rayon: city ? (state.rayon ?? DEFAULT_RADIUS_KM) : null,
                      page: 1,
                    })
                  }
                />
              </div>
            </div>
            <button
              type="button"
              className="relative grid w-12 shrink-0 place-items-center self-start rounded-xl border border-line bg-paper shadow-card transition-colors hover:border-ink/25 lg:hidden"
              style={{ height: 48 }}
              ref={filterTrigger}
              aria-expanded={filtersOpen}
              aria-controls="filtres-mobile"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal aria-hidden="true" size={18} />
              <span className="sr-only">Filtres</span>
              {activeTickets.length > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-accent px-1 font-mono text-2xs font-semibold text-accent-fg">
                  {activeTickets.length}
                </span>
              )}
            </button>
          </search>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[218px_minmax(0,1fr)] xl:gap-8">
          <div className="hidden lg:block">
            <div className="scrollbar-none sticky top-[calc(var(--header-h)+88px)] max-h-[calc(100vh-var(--header-h)-108px)] overflow-y-auto pb-6 pr-1">
              {facetPanel}
            </div>
          </div>

          <div ref={resultsTopRef} className="scroll-mt-[calc(var(--header-h)+88px)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="scrollbar-none -mx-1 max-w-full overflow-x-auto px-1">
                <Segmented
                  label="Type de contrat"
                  value={contractValue}
                  onChange={(v) => void setState({ contrat: v === "ALL" ? null : v, page: 1 })}
                  options={[
                    { value: "ALL", label: "Tous" },
                    {
                      value: "STAGE",
                      label: (
                        <>
                          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-stage" />
                          Stage
                          {contractCount("STAGE") !== null && (
                            <span className="font-mono text-2xs text-ink/60">
                              {contractCount("STAGE")}
                            </span>
                          )}
                        </>
                      ),
                    },
                    {
                      value: "ALTERNANCE",
                      label: (
                        <>
                          <span
                            aria-hidden="true"
                            className="h-1.5 w-1.5 rounded-full bg-alternance"
                          />
                          Alternance
                          {contractCount("ALTERNANCE") !== null && (
                            <span className="font-mono text-2xs text-ink/60">
                              {contractCount("ALTERNANCE")}
                            </span>
                          )}
                        </>
                      ),
                    },
                    ...(["CDI", "CDD"] as const).map((type) => ({
                      value: type,
                      label: (
                        <>
                          {type}
                          {contractCount(type) !== null && (
                            <span className="font-mono text-2xs text-ink/60">
                              {contractCount(type)}
                            </span>
                          )}
                        </>
                      ),
                    })),
                  ]}
                />
              </div>
              <div className="flex items-center gap-2">
                {isLoggedIn && <SaveSearchButton queryString={queryString} />}
                <Segmented
                  label="Trier les résultats"
                  size="sm"
                  value={sort}
                  onChange={(v) => void setState({ tri: v, page: 1 })}
                  options={[
                    { value: "date", label: "Récentes" },
                    { value: "pertinence", label: "Pertinence" },
                  ]}
                />
              </div>
            </div>

            <CollectionBar city={state.ville || undefined} onRefresh={() => void refetch()} />

            <div className="mt-5 flex min-h-[32px] flex-wrap items-center gap-x-4 gap-y-2">
              <p className="flex items-baseline gap-2 text-sm text-ink/60" aria-live="polite">
                <strong className="font-mono text-lg font-semibold tabular-nums tracking-tight text-ink">
                  {result.totalHits.toLocaleString("fr-FR")}
                </strong>
                offre{result.totalHits > 1 ? "s" : ""}
                <span
                  className={`inline-flex items-center gap-1 text-xs text-ink/60 transition-opacity duration-base ${
                    isFetching ? "opacity-100" : "opacity-0"
                  }`}
                  aria-hidden={!isFetching}
                >
                  <LoaderCircle size={13} className="animate-spin" />
                  mise à jour
                </span>
              </p>

              {activeTickets.length > 0 && (
                <ul className="flex flex-wrap items-center gap-1.5" aria-label="Filtres actifs">
                  <AnimatePresence initial={false} mode="popLayout">
                    {activeTickets.map((ticket) => (
                      <m.li
                        key={ticket.key}
                        layout
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={SPRING.snappy}
                      >
                        <button
                          type="button"
                          className="ticket !min-h-[28px] gap-1 !py-0.5 pl-2.5 pr-1.5 text-xs hover:border-ink/25"
                          onClick={ticket.remove}
                        >
                          {ticket.label}
                          <X aria-hidden="true" size={13} className="text-ink/45" />
                          <span className="sr-only">Retirer le filtre {ticket.label}</span>
                        </button>
                      </m.li>
                    ))}
                    <m.li key="reset" layout transition={SPRING.snappy}>
                      <button
                        type="button"
                        onClick={resetAll}
                        className="rounded-md px-1.5 py-1 text-xs font-medium text-ink/60 transition-colors hover:text-ink"
                      >
                        Tout effacer
                      </button>
                    </m.li>
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {result.location?.resolved === false && (
              <p className="mt-3 text-sm text-warning">
                Cette ville n’a pas pu être géolocalisée : seules les offres portant exactement ce
                nom de commune sont affichées.
              </p>
            )}
            {result.limited && (
              <p className="mt-3 text-sm text-warning">
                Plus de 5 000 résultats : précisez un métier ou une ville pour parcourir une
                sélection complète.
              </p>
            )}

            <div className="mt-4">
              <h2 className="sr-only">Résultats de la recherche</h2>
              {isError && (
                <div className="panel mb-4 flex flex-col items-start gap-3" role="alert">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-warning-soft text-warning">
                    <TriangleAlert aria-hidden="true" size={18} />
                  </span>
                  <div>
                    <p className="font-semibold">La recherche n&apos;a pas pu être actualisée.</p>
                    <p className="mt-1 text-sm text-ink/65">
                      Vos filtres et les derniers résultats sont conservés. Réessayez pour afficher
                      les résultats correspondants.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-outline btn-sm"
                    disabled={isFetching}
                    onClick={() => void refetch()}
                  >
                    <RotateCcw
                      aria-hidden="true"
                      size={14}
                      className={isFetching ? "animate-spin" : ""}
                    />
                    {isFetching ? "Nouvelle tentative…" : "Réessayer la recherche"}
                  </button>
                </div>
              )}
              {showSkeleton ? (
                <ResultsSkeleton />
              ) : result.hits.length === 0 ? (
                isError ? null : (
                  <EmptyState
                    hasFilters={activeTickets.length > 0 || !!state.q}
                    onReset={resetAll}
                    onWiden={
                      state.ville && state.rayon && state.rayon < 100
                        ? () => void setState({ rayon: 100, page: 1 })
                        : undefined
                    }
                    onNational={
                      state.ville
                        ? () => void setState({ ville: null, rayon: null, page: 1 })
                        : undefined
                    }
                  />
                )
              ) : (
                <>
                <div className={isPlaceholderData ? "pointer-events-none opacity-50" : ""}>
                  <OfferWorkspace offers={result.hits} />
                </div>
                <div
                  key={listKey}
                  className={`grid grid-cols-1 gap-3 transition-opacity duration-base xl:hidden ${
                    isPlaceholderData ? "pointer-events-none opacity-50" : ""
                  }`}
                  aria-busy={isPlaceholderData}
                >
                  {result.hits.map((offer, i) => (
                    // Entrée en cascade en CSS pur : jamais bloquée en état invisible.
                    <div
                      key={offer.id}
                      className="animate-[fade-up_520ms_cubic-bezier(0.16,1,0.3,1)_both]"
                      style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
                    >
                      <OfferCard offer={offer} candidateProfile={candidateProfile} layout="row" />
                    </div>
                  ))}
                </div>
                </>
              )}
            </div>

            {result.totalPages > 1 && (
              <Pagination page={result.page} totalPages={result.totalPages} onPage={goToPage} />
            )}
          </div>
        </div>

        {/* Tiroir de filtres (mobile/tablette) */}
        <AnimatePresence>
          {filtersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden" key="filtres">
              <m.div
                className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DURATION.base }}
                onClick={() => setFiltersOpen(false)}
              />
              <m.div
                ref={filterDialog}
                id="filtres-mobile"
                role="dialog"
                aria-modal="true"
                aria-label="Filtres"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={SPRING.soft}
                className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-3xl border-t border-line bg-paper shadow-pop"
              >
                <div
                  className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-ink/15"
                  aria-hidden="true"
                />
                <div className="flex items-center justify-between px-5 pb-2 pt-3">
                  <p className="text-lg font-semibold tracking-tight">Filtres</p>
                  <button
                    type="button"
                    autoFocus
                    onClick={() => setFiltersOpen(false)}
                    className="grid h-9 w-9 place-items-center rounded-full bg-ink/[0.06] text-ink/70"
                    aria-label="Fermer les filtres"
                  >
                    <X aria-hidden="true" size={18} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-3">
                  {facetPanel}
                </div>
                <div className="flex gap-2 border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  {activeTickets.length > 0 && (
                    <button type="button" onClick={resetAll} className="btn-outline">
                      Effacer
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    className="btn-cobalt flex-1"
                  >
                    {isFetching ? (
                      <LoaderCircle aria-hidden="true" size={16} className="animate-spin" />
                    ) : null}
                    Voir {result.totalHits.toLocaleString("fr-FR")} offre
                    {result.totalHits > 1 ? "s" : ""}
                  </button>
                </div>
              </m.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </MotionProvider>
  );
}

/** Pagination compacte : précédent / numéros (fenêtre glissante) / suivant. */
function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  const pages: Array<number | "…"> = [];
  const span = 1;
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= span) pages.push(p);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex items-center justify-between gap-3 border-t border-line pt-6"
    >
      <button
        type="button"
        className="btn-outline btn-sm"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        aria-label="Page précédente"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        <span className="hidden sm:inline">Précédent</span>
      </button>

      <ul className="flex items-center gap-1">
        {pages.map((p, i) =>
          p === "…" ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 font-mono text-xs text-ink/35">
              …
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                onClick={() => onPage(p)}
                aria-current={p === page ? "page" : undefined}
                aria-label={`Page ${p}`}
                className={`grid h-9 min-w-[36px] place-items-center rounded-lg px-2 font-mono text-[13px] tabular-nums transition-colors duration-base ${
                  p === page
                    ? "bg-ink text-canvas"
                    : "text-ink/60 hover:bg-ink/[0.06] hover:text-ink"
                }`}
              >
                {p}
              </button>
            </li>
          ),
        )}
      </ul>

      <button
        type="button"
        className="btn-outline btn-sm"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        aria-label="Page suivante"
      >
        <span className="hidden sm:inline">Suivant</span>
        <ChevronRight aria-hidden="true" size={16} />
      </button>
    </nav>
  );
}

function EmptyState({
  hasFilters,
  onReset,
  onWiden,
  onNational,
}: {
  hasFilters: boolean;
  onReset: () => void;
  onWiden?: () => void;
  onNational?: () => void;
}) {
  return (
    <div className="empty-state">
      <span className="grid h-14 w-14 place-items-center rounded-2xl border border-line bg-paper shadow-card">
        <SearchX aria-hidden="true" size={24} className="text-ink/45" />
      </span>
      <p className="mt-5 text-xl font-semibold tracking-tight">Aucune offre ne correspond</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
        Essayez d&apos;élargir votre recherche : moins de filtres, un rayon plus grand, ou un
        mot-clé plus général.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {onWiden && (
          <button type="button" className="btn-outline" onClick={onWiden}>
            Élargir à 100 km
          </button>
        )}
        {onNational && (
          <button type="button" className="btn-outline" onClick={onNational}>
            Chercher dans toute la France
          </button>
        )}
        {hasFilters && (
          <button type="button" className="btn-outline" onClick={onReset}>
            <RotateCcw aria-hidden="true" size={15} />
            Réinitialiser les filtres
          </button>
        )}
      </div>
    </div>
  );
}
