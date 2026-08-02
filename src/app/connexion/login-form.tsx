"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/mon-espace";
  const verification = searchParams.get("verification");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });
    setPending(false);
    if (result?.error) {
      setError("Identifiant ou mot de passe incorrect.");
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <div>
      {verification === "ok" && (
        <p
          className="mb-4 rounded-lg border border-cobalt/20 bg-cobalt-soft p-3 text-sm"
          role="status"
        >
          ✓ Adresse email confirmée, vous pouvez vous connecter.
        </p>
      )}
      {verification === "erreur" && (
        <p className="mb-4 rounded-lg border border-ink/15 p-3 text-sm" role="alert">
          Lien de vérification invalide ou expiré.
        </p>
      )}

      <OAuthButtons callbackUrl={callbackUrl} />

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-semibold">
            Email ou identifiant
          </label>
          {/* `type="text"` volontairement : le champ accepte aussi un identifiant
              court, que la validation HTML `type="email"` rejetterait. */}
          <input
            id="email"
            name="email"
            type="text"
            autoComplete="username"
            required
            className="input-ink"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-semibold">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="input-ink"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-ink/15 p-2 text-sm" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn-cobalt w-full" disabled={pending}>
          {pending ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <div className="rule mt-5 flex flex-col gap-1 pt-4 text-sm">
        <Link
          href="/mot-de-passe-oublie"
          className="text-cobalt underline-offset-4 hover:underline"
        >
          Mot de passe oublié ?
        </Link>
        <p className="text-ink/70">
          Pas encore de compte ?{" "}
          <Link
            href="/inscription"
            className="font-semibold text-cobalt underline-offset-4 hover:underline"
          >
            Inscrivez-vous
          </Link>
        </p>
      </div>
    </div>
  );
}
