"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, LoaderCircle } from "lucide-react";
import { updateProfile } from "@/server/account/actions";
import type { ActionResult } from "@/server/auth/actions";
import {
  EDUCATION_LABELS,
  EDUCATION_LEVELS,
  SPECIALTIES,
  SPECIALTY_LABELS,
} from "@/lib/search-params";

type ProfileInitial = {
  name: string;
  headline: string;
  school: string;
  graduationYear: string;
  city: string;
  educationLevel: string;
  targetSpecialty: string;
};

// « Indifférent » n'a de sens que côté offre (aucun niveau requis) : côté
// candidat, l'absence de sélection (chaîne vide → null) joue déjà ce rôle.
const CANDIDATE_EDUCATION_LEVELS = EDUCATION_LEVELS.filter((l) => l !== "INDIFFERENT");

export function ProfileForm({
  initial,
  email,
  emailVerified,
}: {
  initial: ProfileInitial;
  email: string;
  emailVerified: boolean;
}) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      setResult(await updateProfile(form));
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <span className="field-label">Email</span>
        <p className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-[10px] border border-dashed border-line px-3.5 text-sm">
          <span className="min-w-0 truncate">{email}</span>
          {emailVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
              <BadgeCheck aria-hidden="true" size={13} />
              vérifié
            </span>
          ) : (
            <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-xs text-ink/60">
              non vérifié
            </span>
          )}
        </p>
      </div>
      <div>
        <label htmlFor="name" className="field-label">
          Nom complet
        </label>
        <input
          id="name"
          name="name"
          defaultValue={initial.name}
          required
          minLength={2}
          className="input-ink"
        />
      </div>
      <div>
        <label htmlFor="headline" className="field-label">
          Titre <span className="font-normal text-ink/60">(ex. « Étudiante en M2 Data »)</span>
        </label>
        <input
          id="headline"
          name="headline"
          defaultValue={initial.headline}
          className="input-ink"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="school" className="field-label">
            École / Université
          </label>
          <input id="school" name="school" defaultValue={initial.school} className="input-ink" />
        </div>
        <div>
          <label htmlFor="graduationYear" className="field-label">
            Année de diplôme
          </label>
          <input
            id="graduationYear"
            name="graduationYear"
            type="number"
            min={1990}
            max={2040}
            defaultValue={initial.graduationYear}
            className="input-ink"
          />
        </div>
      </div>
      <div>
        <label htmlFor="city" className="field-label">
          Ville
        </label>
        <input id="city" name="city" defaultValue={initial.city} className="input-ink" />
      </div>

      <div className="mt-2 rounded-xl border border-line bg-surface/50 p-4">
        <p className="eyebrow">Préférences de correspondance</p>
        <p className="mt-1.5 text-xs text-ink/60">
          Utilisées pour calculer votre score de correspondance sur chaque offre. Laissez vide si
          vous ne savez pas encore.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="educationLevel" className="field-label">
              Votre niveau d'études
            </label>
            <select
              id="educationLevel"
              name="educationLevel"
              defaultValue={initial.educationLevel}
              className="input-ink"
            >
              <option value="">Non renseigné</option>
              {CANDIDATE_EDUCATION_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {EDUCATION_LABELS[level]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="targetSpecialty" className="field-label">
              Spécialité recherchée
            </label>
            <select
              id="targetSpecialty"
              name="targetSpecialty"
              defaultValue={initial.targetSpecialty}
              className="input-ink"
            >
              <option value="">Non renseigné</option>
              {SPECIALTIES.map((specialty) => (
                <option key={specialty} value={specialty}>
                  {SPECIALTY_LABELS[specialty]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {result && (
        <p
          className={result.ok ? "alert-success" : "alert-error"}
          role={result.ok ? "status" : "alert"}
        >
          {result.ok ? `✓ ${result.message}` : result.error}
        </p>
      )}

      <button type="submit" className="btn-cobalt self-start" disabled={pending}>
        {pending && <LoaderCircle aria-hidden="true" size={16} className="animate-spin" />}
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
