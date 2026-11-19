"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { FacetCounts } from "@/server/search/query";
import {
  EXPERIENCE_LABELS,
  FAMILY_LABELS,
  TAG_LABELS,
  UNIVERSE_FAMILIES,
  UNIVERSE_LABELS,
  UNIVERSES,
  type JobUniverse,
} from "@/lib/job-taxonomy";
import {
  COLLECTION_ICONS,
  COLLECTION_KEYS,
  COLLECTION_LABELS,
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
  SPECIALTY_LABELS,
  TOP_CITIES,
  TOP_CITY_RADIUS_KM,
} from "@/lib/search-params";
import { SpecialtyIcon } from "@/components/ui/specialty-icon";

/** Section repliable du panneau : en-tête monospace + compteur de sélection. */
function Section({
  title,
  hint,
  selectedCount = 0,
  defaultOpen = true,
  children,
}: {
  title: string;
  hint?: string;
  selectedCount?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen || selectedCount > 0);
  return (
    <fieldset className="border-t border-line py-4 first:border-t-0 first:pt-0">
      <legend className="contents">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 rounded-md text-left"
        >
          <span className="eyebrow flex items-center gap-2 text-ink/70">
            {title}
            {hint && <span className="normal-case tracking-normal text-ink/60">{hint}</span>}
            {selectedCount > 0 && (
              <span className="grid h-4 min-w-[16px] place-items-center rounded-full bg-accent px-1 text-[10px] tracking-normal text-accent-fg">
                {selectedCount}
              </span>
            )}
          </span>
          <ChevronDown
            aria-hidden="true"
            size={15}
            className={`text-ink/60 transition-transform duration-base ease-out ${open ? "" : "-rotate-90"}`}
          />
        </button>
      </legend>
      {/* Grille 0fr→1fr : repli animé sans mesurer la hauteur en JS. */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-slow ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div
          className="overflow-hidden"
          // `inert` (non typé en React 18) : contenu replié hors du parcours clavier.
          ref={(el) => {
            if (el) el.toggleAttribute("inert", !open);
          }}
        >
          <div className="pt-3">{children}</div>
        </div>
      </div>
    </fieldset>
  );
}

type FacetGroupProps = {
  options: Array<{ value: string; label: string; count: number }>;
  selected: string[];
  onToggle: (value: string) => void;
};

/** Liste de cases à cocher stylées (la vraie case reste dans le DOM pour l'accessibilité). */
function CheckList({ options, selected, onToggle }: FacetGroupProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {options.map((opt) => {
        const checked = selected.includes(opt.value);
        return (
          <label
            key={opt.value}
            className="group/opt flex min-h-[36px] cursor-pointer items-center justify-between gap-2 rounded-lg px-2 text-sm transition-colors hover:bg-ink/[0.04]"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={checked}
                onChange={() => onToggle(opt.value)}
              />
              <span
                aria-hidden="true"
                className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border border-ink/25 bg-paper text-accent-fg transition-[background-color,border-color] duration-fast peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-paper"
              >
                <Check
                  size={12}
                  strokeWidth={3}
                  className={`transition-[transform,opacity] duration-base ease-spring ${
                    checked ? "scale-100 opacity-100" : "scale-50 opacity-0"
                  }`}
                />
              </span>
              <span className={`truncate ${checked ? "font-medium text-ink" : "text-ink/75"}`}>
                {opt.label}
              </span>
            </span>
            <span className="font-mono text-2xs tabular-nums text-ink/60">{opt.count}</span>
          </label>
        );
      })}
    </div>
  );
}

function ChipToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" aria-pressed={active} className="chip" onClick={onClick}>
      {children}
    </button>
  );
}

export type FacetKey =
  | "contrat"
  | "remote"
  | "niveau"
  | "specialite"
  | "pays"
  | "secteur"
  | "categorie"
  | "univers"
  | "metier"
  | "experience"
  | "tag";

export type FacetSelection = {
  contrat: string[];
  remote: string[];
  niveau: string[];
  specialite: string[];
  pays: string[];
  secteur: string[];
  categorie: string[];
  univers: string[];
  metier: string[];
  experience: string[];
  tag: string[];
  datePub?: string;
  rayon?: number;
  ville: string;
  qualification: string;
  salaire: number | null;
  incertaines: boolean;
};

/** Ordre d'affichage des tags : celui de la déclaration, du plus général au plus spécialisé. */
const TAG_ORDER = Object.keys(TAG_LABELS);

export function FacetPanel({
  facets,
  selection,
  onToggle,
  onDatePub,
  onRayon,
  onCity,
  onField,
}: {
  facets: FacetCounts;
  selection: FacetSelection;
  onToggle: (facet: FacetKey, value: string) => void;
  onDatePub: (value?: string) => void;
  onRayon: (value?: number) => void;
  onCity: (city?: string) => void;
  onField: (field: "qualification" | "salaire" | "incertaines", value: string | boolean) => void;
}) {
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

  const experienceOptions = Object.keys(EXPERIENCE_LABELS)
    .filter((e) => (facets.experienceLevel?.[e] ?? 0) > 0 || selection.experience.includes(e))
    .map((e) => ({
      value: e,
      label: EXPERIENCE_LABELS[e],
      count: facets.experienceLevel?.[e] ?? 0,
    }));

  const sectorOptions = Object.entries(facets.sector ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([value, count]) => ({ value, label: value, count }));

  const tagOptions = TAG_ORDER.filter(
    (tag) => (facets.tags?.[tag] ?? 0) > 0 || selection.tag.includes(tag),
  ).map((tag) => ({ value: tag, label: TAG_LABELS[tag], count: facets.tags?.[tag] ?? 0 }));

  // Un seul filtre « Métier » : spécialités tech et familles de métiers côte à côte.
  const specialtyRows = SPECIALTIES.map((value) => ({
    kind: "specialite" as const,
    value,
    label: SPECIALTY_LABELS[value],
    count: facets.specialty?.[value] ?? 0,
    active: selection.specialite.includes(value),
  }));
  const familyRows = (universe: Exclude<JobUniverse, "TECH">) =>
    UNIVERSE_FAMILIES[universe].map((value) => ({
      kind: "metier" as const,
      value,
      label: FAMILY_LABELS[value],
      count: facets.jobFamily?.[value] ?? 0,
      active: selection.metier.includes(value),
    }));
  const jobGroups = [
    { universe: "TECH" as const, rows: specialtyRows },
    ...UNIVERSES.filter((universe) => universe !== "TECH").map((universe) => ({ universe, rows: familyRows(universe) })),
  ]
    // Une ligne sans résultat reste affichée si elle est sélectionnée, sinon on évite le cul-de-sac.
    .map((group) => ({ ...group, rows: group.rows.filter((row) => row.count > 0 || row.active) }))
    .filter((group) => group.rows.length > 0);

  const activeCity = TOP_CITIES.find((c) => c.toLowerCase() === selection.ville.toLowerCase());

  return (
    <aside aria-label="Filtres" className="flex flex-col">
      <Section title="Domaine" selectedCount={selection.univers.length}>
        <div className="flex flex-col gap-0.5">
          {UNIVERSES.map((universe) => {
            const count = facets.universe?.[universe] ?? 0;
            const active = selection.univers.includes(universe);
            if (count === 0 && !active) return null;
            return (
              <button
                key={universe}
                type="button"
                aria-pressed={active}
                onClick={() => onToggle("univers", universe)}
                className={`flex min-h-[38px] items-center justify-between gap-2 rounded-lg px-2 text-left text-sm transition-colors duration-fast ${
                  active ? "bg-ink text-canvas" : "text-ink/75 hover:bg-ink/[0.04] hover:text-ink"
                }`}
              >
                <span>{UNIVERSE_LABELS[universe]}</span>
                <span
                  className={`font-mono text-2xs tabular-nums ${active ? "text-canvas/60" : "text-ink/60"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Métier" selectedCount={selection.metier.length + selection.specialite.length}>
        <div className="flex flex-col gap-3">
          {jobGroups.map((group) => (
            <div key={group.universe} className="flex flex-col gap-0.5">
              {jobGroups.length > 1 && (
                <p className="px-2 pb-1 font-mono text-2xs uppercase tracking-[0.1em] text-ink/50">
                  {UNIVERSE_LABELS[group.universe]}
                </p>
              )}
              {group.rows.map((row) => (
                <button
                  key={`${row.kind}-${row.value}`}
                  type="button"
                  aria-pressed={row.active}
                  onClick={() => onToggle(row.kind, row.value)}
                  className={`flex min-h-[38px] items-center justify-between gap-2 rounded-lg px-2 text-left text-sm transition-colors duration-fast ${
                    row.active
                      ? "bg-ink text-canvas"
                      : "text-ink/75 hover:bg-ink/[0.04] hover:text-ink"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    {row.kind === "specialite" && (
                      <SpecialtyIcon
                        specialty={row.value as (typeof SPECIALTIES)[number]}
                        size={16}
                        className={row.active ? "text-volt" : "text-ink/45"}
                      />
                    )}
                    <span className="truncate">{row.label}</span>
                  </span>
                  <span
                    className={`font-mono text-2xs tabular-nums ${row.active ? "text-canvas/60" : "text-ink/60"}`}
                  >
                    {row.count}
                  </span>
                </button>
              ))}
            </div>
          ))}
          {jobGroups.length === 0 && (
            <p className="px-2 text-sm text-ink/60">Aucun métier à affiner.</p>
          )}
        </div>
      </Section>

      <Section
        title="Grandes villes"
        hint={`+${TOP_CITY_RADIUS_KM} km`}
        selectedCount={activeCity ? 1 : 0}
      >
        <div className="flex flex-wrap gap-1.5">
          {TOP_CITIES.map((city) => {
            const active = city === activeCity;
            return (
              <ChipToggle
                key={city}
                active={active}
                onClick={() => onCity(active ? undefined : city)}
              >
                {city}
              </ChipToggle>
            );
          })}
        </div>
      </Section>

      {selection.ville && (
        <Section title={`Rayon · ${selection.ville}`}>
          <select
            aria-label="Rayon de recherche"
            className="input-ink !min-h-[40px] text-sm"
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
          <p className="mt-2 text-xs text-ink/60">
            Distance à vol d&apos;oiseau, depuis le centre de la commune.
          </p>
        </Section>
      )}

      {experienceOptions.length > 0 && (
        <Section title="Expérience" selectedCount={selection.experience.length}>
          <CheckList
            options={experienceOptions}
            selected={selection.experience}
            onToggle={(v) => onToggle("experience", v)}
          />
        </Section>
      )}

      {remoteOptions.length > 0 && (
        <Section title="Télétravail" selectedCount={selection.remote.length}>
          <CheckList
            options={remoteOptions}
            selected={selection.remote}
            onToggle={(v) => onToggle("remote", v)}
          />
        </Section>
      )}

      <Section title="Date de publication" selectedCount={selection.datePub ? 1 : 0}>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Date de publication">
          {[undefined, ...DATE_RANGES].map((range) => {
            const active = selection.datePub === range;
            return (
              <button
                key={range ?? "all"}
                type="button"
                role="radio"
                aria-checked={active}
                className="chip"
                onClick={() => onDatePub(range)}
              >
                {range ? DATE_RANGE_LABELS[range] : "Toutes"}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-ink/60">
          Une publication non précisée est datée par sa première détection.
        </p>
      </Section>

      {tagOptions.length > 0 && (
        <Section title="Détails de l'annonce" selectedCount={selection.tag.length}>
          <div className="flex flex-wrap gap-1.5">
            {tagOptions.map((tag) => (
              <ChipToggle
                key={tag.value}
                active={selection.tag.includes(tag.value)}
                onClick={() => onToggle("tag", tag.value)}
              >
                {tag.label}
                <span className="font-mono text-2xs text-ink/55">{tag.count}</span>
              </ChipToggle>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink/60">
            Déduits du texte de l&apos;annonce, à vérifier.
          </p>
        </Section>
      )}

      <Section title="Catégorie" selectedCount={selection.categorie.length}>
        <div className="flex flex-wrap gap-1.5">
          {COLLECTION_KEYS.map((key) => (
            <ChipToggle
              key={key}
              active={selection.categorie.includes(key)}
              onClick={() => onToggle("categorie", key)}
            >
              <span aria-hidden="true">{COLLECTION_ICONS[key]}</span>
              {COLLECTION_LABELS[key]}
            </ChipToggle>
          ))}
        </div>
      </Section>

      {educationOptions.length > 0 && (
        <Section
          title="Niveau d'études"
          selectedCount={selection.niveau.length}
          defaultOpen={false}
        >
          <CheckList
            options={educationOptions}
            selected={selection.niveau}
            onToggle={(v) => onToggle("niveau", v)}
          />
        </Section>
      )}

      {countryOptions.length > 0 && (
        <Section
          title="Pays"
          hint="hors France"
          selectedCount={selection.pays.length}
          defaultOpen={false}
        >
          <CheckList
            options={countryOptions}
            selected={selection.pays}
            onToggle={(v) => onToggle("pays", v)}
          />
        </Section>
      )}

      {sectorOptions.length > 0 && (
        <Section title="Secteur" selectedCount={selection.secteur.length} defaultOpen={false}>
          <CheckList
            options={sectorOptions}
            selected={selection.secteur}
            onToggle={(v) => onToggle("secteur", v)}
          />
        </Section>
      )}

      <Section
        title="Plus de critères"
        selectedCount={
          (selection.qualification ? 1 : 0) +
          (selection.salaire ? 1 : 0) +
          (selection.incertaines ? 1 : 0)
        }
        defaultOpen={false}
      >
        <div className="flex flex-col gap-3">
          <label className="text-sm">
            <span className="text-ink/70">Qualification mentionnée</span>
            <input
              key={`qualification-${selection.qualification}`}
              className="input-ink mt-1 !min-h-[40px] w-full text-sm"
              placeholder="APFORM, AVQ, BTS, master…"
              defaultValue={selection.qualification}
              onBlur={(e) => onField("qualification", e.target.value.trim())}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          </label>
          <label className="text-sm">
            <span className="text-ink/70">Salaire annuel brut minimum (€)</span>
            <input
              key={`salaire-${selection.salaire ?? ""}`}
              className="input-ink mt-1 !min-h-[40px] w-full text-sm"
              type="number"
              min={0}
              max={500000}
              placeholder="Ex. 28000"
              defaultValue={selection.salaire ?? ""}
              onBlur={(e) => onField("salaire", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          </label>
          <p className="text-xs text-ink/60">
            Un salaire ou une qualification non précisés restent visibles : seuls les montants
            annuels connus sont comparés.
          </p>
          <label className="flex min-h-[36px] cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={selection.incertaines}
              onChange={(e) => onField("incertaines", e.target.checked)}
            />
            Inclure les offres à revérifier
          </label>
        </div>
      </Section>
    </aside>
  );
}
