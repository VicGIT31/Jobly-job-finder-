"use client";

import type { FacetCounts } from "@/server/search/query";
import {
  CONTRACT_LABELS,
  CONTRACT_TYPES,
  COUNTRY_FLAGS,
  COUNTRY_LABELS,
  DATE_RANGE_LABELS,
  DATE_RANGES,
  EDUCATION_LABELS,
  EDUCATION_LEVELS,
  RADII,
  REMOTE_LABELS,
  REMOTE_POLICIES,
  SPECIALTIES,
  SPECIALTY_ICONS,
  SPECIALTY_LABELS,
  TOP_CITIES,
  TOP_CITY_RADIUS_KM,
} from "@/lib/search-params";

type FacetGroupProps = {
  title: string;
  options: Array<{ value: string; label: string; count: number }>;
  selected: string[];
  onToggle: (value: string) => void;
};

function FacetGroup({ title, options, selected, onToggle }: FacetGroupProps) {
  if (options.length === 0) return null;
  return (
    <fieldset className="rule pt-4">
      <legend className="pb-2 text-xs font-bold uppercase tracking-widest">{title}</legend>
      <div className="flex flex-col gap-0.5">
        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex min-h-[32px] cursor-pointer items-center justify-between gap-2 px-1 text-sm hover:bg-ink/5"
          >
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-cobalt"
                checked={selected.includes(opt.value)}
                onChange={() => onToggle(opt.value)}
              />
              {opt.label}
            </span>
            <span className="text-xs tabular-nums text-ink/50">{opt.count}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export type FacetSelection = {
  contrat: string[];
  remote: string[];
  niveau: string[];
  specialite: string[];
  pays: string[];
  secteur: string[];
  datePub?: string;
  rayon?: number;
  ville: string;
};

export function FacetPanel({
  facets,
  selection,
  onToggle,
  onDatePub,
  onRayon,
  onCity,
}: {
  facets: FacetCounts;
  selection: FacetSelection;
  onToggle: (
    facet: "contrat" | "remote" | "niveau" | "specialite" | "pays" | "secteur",
    value: string,
  ) => void;
  onDatePub: (value?: string) => void;
  onRayon: (value?: number) => void;
  onCity: (city?: string) => void;
}) {
  const contractOptions = CONTRACT_TYPES.filter(
    (c) => (facets.contractType?.[c] ?? 0) > 0 || selection.contrat.includes(c),
  ).map((c) => ({ value: c, label: CONTRACT_LABELS[c], count: facets.contractType?.[c] ?? 0 }));

  // "FR" n'est pas proposé ici : c'est le défaut implicite de tout le monde,
  // le filtrer par pays sert à trouver les offres *internationales*.
  const countryOptions = Object.keys(COUNTRY_LABELS)
    .filter((c) => c !== "FR")
    .filter((c) => (facets.countryCode?.[c] ?? 0) > 0 || selection.pays.includes(c))
    .map((c) => ({
      value: c,
      label: `${COUNTRY_FLAGS[c] ?? ""} ${COUNTRY_LABELS[c]}`.trim(),
      count: facets.countryCode?.[c] ?? 0,
    }));

  const remoteOptions = REMOTE_POLICIES.filter(
    (r) => (facets.remotePolicy?.[r] ?? 0) > 0 || selection.remote.includes(r),
  ).map((r) => ({ value: r, label: REMOTE_LABELS[r], count: facets.remotePolicy?.[r] ?? 0 }));

  const educationOptions = EDUCATION_LEVELS.filter(
    (e) => (facets.educationLevel?.[e] ?? 0) > 0 || selection.niveau.includes(e),
  ).map((e) => ({ value: e, label: EDUCATION_LABELS[e], count: facets.educationLevel?.[e] ?? 0 }));

  const sectorOptions = Object.entries(facets.sector ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([value, count]) => ({ value, label: value, count }));

  return (
    <aside aria-label="Filtres" className="flex flex-col gap-4">
      {/* Spécialité en tête : c'est le premier tri qu'un dev fait mentalement. */}
      <fieldset>
        <legend className="pb-2 text-xs font-bold uppercase tracking-widest">Spécialité</legend>
        <div className="flex flex-wrap gap-1.5">
          {SPECIALTIES.map((specialty) => {
            const count = facets.specialty?.[specialty] ?? 0;
            const active = selection.specialite.includes(specialty);
            // Une spécialité sans résultat reste affichée si elle est
            // sélectionnée, sinon on la masque pour ne pas proposer un cul-de-sac.
            if (count === 0 && !active) return null;
            return (
              <button
                key={specialty}
                type="button"
                aria-pressed={active}
                className={
                  active
                    ? "ticket border-cobalt bg-cobalt text-white"
                    : "ticket hover:border-ink/30"
                }
                onClick={() => onToggle("specialite", specialty)}
              >
                <span aria-hidden="true">{SPECIALTY_ICONS[specialty]}</span>
                {SPECIALTY_LABELS[specialty]}
                <span
                  className={`text-xs tabular-nums ${active ? "text-white/70" : "text-ink/50"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="rule pt-4">
        <legend className="pb-2 text-xs font-bold uppercase tracking-widest">
          Grandes villes
          <span className="ml-1 font-normal normal-case tracking-normal text-ink/50">
            (ville + {TOP_CITY_RADIUS_KM} km)
          </span>
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {TOP_CITIES.map((city) => {
            const active = selection.ville.toLowerCase() === city.toLowerCase();
            return (
              <button
                key={city}
                type="button"
                aria-pressed={active}
                className={
                  active
                    ? "ticket border-cobalt bg-cobalt text-white"
                    : "ticket hover:border-ink/30"
                }
                onClick={() => onCity(active ? undefined : city)}
              >
                {city}
              </button>
            );
          })}
        </div>
      </fieldset>

      <FacetGroup
        title="Type de contrat"
        options={contractOptions}
        selected={selection.contrat}
        onToggle={(v) => onToggle("contrat", v)}
      />

      {countryOptions.length > 0 && (
        <fieldset className="rule pt-4">
          <legend className="pb-2 text-xs font-bold uppercase tracking-widest">
            Pays
            <span className="ml-1 font-normal normal-case tracking-normal text-ink/50">
              (hors France)
            </span>
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {countryOptions.map((opt) => {
              const active = selection.pays.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={active}
                  className={
                    active
                      ? "ticket border-cobalt bg-cobalt text-white"
                      : "ticket hover:border-ink/30"
                  }
                  onClick={() => onToggle("pays", opt.value)}
                >
                  {opt.label}
                  <span
                    className={`text-xs tabular-nums ${active ? "text-white/70" : "text-ink/50"}`}
                  >
                    {opt.count}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <FacetGroup
        title="Télétravail"
        options={remoteOptions}
        selected={selection.remote}
        onToggle={(v) => onToggle("remote", v)}
      />
      <FacetGroup
        title="Niveau d'études"
        options={educationOptions}
        selected={selection.niveau}
        onToggle={(v) => onToggle("niveau", v)}
      />
      <FacetGroup
        title="Secteur"
        options={sectorOptions}
        selected={selection.secteur}
        onToggle={(v) => onToggle("secteur", v)}
      />

      <fieldset className="rule pt-4">
        <legend className="pb-2 text-xs font-bold uppercase tracking-widest">
          Date de publication
        </legend>
        <div className="flex flex-col gap-0.5">
          <label className="flex min-h-[32px] cursor-pointer items-center gap-2 px-1 text-sm hover:bg-ink/5">
            <input
              type="radio"
              name="datePub"
              className="h-4 w-4 accent-cobalt"
              checked={!selection.datePub}
              onChange={() => onDatePub(undefined)}
            />
            Toutes
          </label>
          {DATE_RANGES.map((range) => (
            <label
              key={range}
              className="flex min-h-[32px] cursor-pointer items-center gap-2 px-1 text-sm hover:bg-ink/5"
            >
              <input
                type="radio"
                name="datePub"
                className="h-4 w-4 accent-cobalt"
                checked={selection.datePub === range}
                onChange={() => onDatePub(range)}
              />
              {DATE_RANGE_LABELS[range]}
            </label>
          ))}
        </div>
      </fieldset>

      {selection.ville && (
        <fieldset className="rule pt-4">
          <legend className="pb-2 text-xs font-bold uppercase tracking-widest">
            Rayon autour de {selection.ville}
          </legend>
          <select
            aria-label="Rayon de recherche"
            className="input-ink"
            value={selection.rayon ?? ""}
            onChange={(e) => onRayon(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">Ville exacte</option>
            {RADII.map((r) => (
              <option key={r} value={r}>
                À moins de {r} km
              </option>
            ))}
          </select>
        </fieldset>
      )}
    </aside>
  );
}
