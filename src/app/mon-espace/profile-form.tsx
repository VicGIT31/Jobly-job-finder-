"use client";

import { useState, useTransition } from "react";
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
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div>
        <span className="mb-1 block text-sm font-semibold">Email</span>
        <p className="text-sm">
          {email}{" "}
          {emailVerified ? (
            <span className="text-cobalt">✓ vérifié</span>
          ) : (
            <span className="text-ink/50">(non vérifié)</span>
          )}
        </p>
      </div>
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-semibold">
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
        <label htmlFor="headline" className="mb-1 block text-sm font-semibold">
          Titre <span className="font-normal text-ink/50">(ex. « Étudiante en M2 Data »)</span>
        </label>
        <input
          id="headline"
          name="headline"
          defaultValue={initial.headline}
          className="input-ink"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="school" className="mb-1 block text-sm font-semibold">
            École / Université
          </label>
          <input id="school" name="school" defaultValue={initial.school} className="input-ink" />
        </div>
        <div>
          <label htmlFor="graduationYear" className="mb-1 block text-sm font-semibold">
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
        <label htmlFor="city" className="mb-1 block text-sm font-semibold">
          Ville
        </label>
        <input id="city" name="city" defaultValue={initial.city} className="input-ink" />
      </div>

      <div className="rule pt-3">
        <p className="text-sm font-semibold">Préférences de correspondance</p>
        <p className="mt-0.5 text-xs text-ink/55">
          Utilisées pour calculer votre score de correspondance sur chaque offre. Laissez vide si
          vous ne savez pas encore.
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="educationLevel" className="mb-1 block text-sm font-semibold">
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
            <label htmlFor="targetSpecialty" className="mb-1 block text-sm font-semibold">
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
          className={`rounded-lg border p-2 text-sm ${result.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300" : "border-ink/15"}`}
          role={result.ok ? "status" : "alert"}
        >
          {result.ok ? `✓ ${result.message}` : result.error}
        </p>
      )}

      <button type="submit" className="btn-cobalt self-start" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
