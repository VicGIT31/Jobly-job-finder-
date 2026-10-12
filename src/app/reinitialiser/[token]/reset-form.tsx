"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { resetPassword, type ActionResult } from "@/server/auth/actions";

export function ResetForm({ token, email }: { token: string; email: string }) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set("token", token);
    form.set("email", email);
    startTransition(async () => {
      setResult(await resetPassword(form));
    });
  }

  if (result?.ok) {
    return (
      <div>
        <p className="alert-success" role="status">
          ✓ {result.message}
        </p>
        <Link href="/connexion" className="btn-cobalt mt-4 w-full">
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="password" className="field-label">
          Nouveau mot de passe <span className="font-normal text-ink/60">(8 caractères min.)</span>
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
        {pending ? "Mise à jour…" : "Mettre à jour"}
      </button>
    </form>
  );
}
