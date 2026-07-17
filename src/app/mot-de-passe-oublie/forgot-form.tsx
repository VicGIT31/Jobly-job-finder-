"use client";

import { useState, useTransition } from "react";
import { requestPasswordReset, type ActionResult } from "@/server/auth/actions";

export function ForgotForm() {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      setResult(await requestPasswordReset(form));
    });
  }

  if (result?.ok) {
    return (
      <p className="border border-ink bg-signal p-4 text-sm text-[#141414]" role="status">
        ✓ {result.message}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <p className="text-sm text-ink/70">
        Indiquez votre email : nous vous enverrons un lien pour choisir un nouveau mot de passe.
      </p>
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
      {result && !result.ok && (
        <p className="border border-ink p-2 text-sm" role="alert">
          {result.error}
        </p>
      )}
      <button type="submit" className="btn-cobalt w-full" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer le lien"}
      </button>
    </form>
  );
}
