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
        <p className="alert-success" role="status">
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

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="name" className="field-label">
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
          <label htmlFor="email" className="field-label">
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
          <label htmlFor="password" className="field-label">
            Mot de passe <span className="font-normal text-ink/60">(8 caractères min.)</span>
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
          <p className="alert-error" role="alert">
            {result.error}
          </p>
        )}

        <button type="submit" className="btn-cobalt mt-1 w-full" disabled={pending}>
          {pending ? "Création…" : "Créer mon compte"}
        </button>
      </form>

      <p className="mt-8 border-t border-line pt-6 text-sm text-ink/60">
        Déjà inscrit·e ?{" "}
        <Link href="/connexion" className="link">
          Connectez-vous
        </Link>
      </p>
    </div>
  );
}
