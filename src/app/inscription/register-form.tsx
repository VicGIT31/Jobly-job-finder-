"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { register, type ActionResult } from "@/server/auth/actions";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export function RegisterForm() {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      setResult(await register(form));
    });
  }

  if (result?.ok) {
    return (
      <div>
        <p className="rounded-lg border border-cobalt/20 bg-cobalt-soft p-4 text-sm" role="status">
          ✓ {result.message}
        </p>
        <Link href="/connexion" className="btn-cobalt mt-4 w-full">
          Aller à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div>
      <OAuthButtons />

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-semibold">
            Nom complet
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            className="input-ink"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-semibold">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input-ink"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-semibold">
            Mot de passe <span className="font-normal text-ink/50">(8 caractères min.)</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="input-ink"
          />
        </div>

        {result && !result.ok && (
          <p className="rounded-lg border border-ink/15 p-2 text-sm" role="alert">
            {result.error}
          </p>
        )}

        <button type="submit" className="btn-cobalt w-full" disabled={pending}>
          {pending ? "Création…" : "Créer mon compte"}
        </button>
      </form>

      <p className="rule mt-5 pt-4 text-sm text-ink/70">
        Déjà inscrit·e ?{" "}
        <Link
          href="/connexion"
          className="font-semibold text-cobalt underline-offset-4 hover:underline"
        >
          Connectez-vous
        </Link>
      </p>
    </div>
  );
}
