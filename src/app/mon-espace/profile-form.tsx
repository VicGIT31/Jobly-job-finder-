"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/server/account/actions";
import type { ActionResult } from "@/server/auth/actions";

type ProfileInitial = {
  name: string;
  headline: string;
  school: string;
  graduationYear: string;
  city: string;
};

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
