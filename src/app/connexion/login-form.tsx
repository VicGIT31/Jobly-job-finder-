"use client";

import Link from "next/link";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedUrl = searchParams.get("callbackUrl");
  const safeRequestedUrl =
    requestedUrl?.startsWith("/") && !requestedUrl.startsWith("//") ? requestedUrl : null;
  const callbackUrl = safeRequestedUrl ?? "/connexion/retour";
  const verification = searchParams.get("verification");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const result = await signIn("credentials", {
        email: form.get("email"),
        password: form.get("password"),
        redirect: false,
      });
      if (result?.error) {
        setError("Identifiant ou mot de passe incorrect.");
      } else {
        const session = await getSession();
        router.push(
          safeRequestedUrl ?? (session?.user?.role === "ADMIN" ? "/admin" : "/mon-espace"),
        );
        router.refresh();
      }
    } catch {
      setError("Connexion impossible pour le moment. Réessayez en conservant vos identifiants.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      {verification === "ok" && (
        <p className="alert-success mb-5" role="status">
          ✓ Adresse email confirmée, vous pouvez vous connecter.
        </p>
      )}
      {verification === "erreur" && (
        <p className="alert-error mb-5" role="alert">
          Lien de vérification invalide ou expiré.
        </p>
      )}

      <OAuthButtons callbackUrl={callbackUrl} />

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="field-label">
            Email ou identifiant
          </label>
          {/* `type="text"` volontairement : le champ accepte aussi un identifiant
              court, que la validation HTML `type="email"` rejetterait. */}
          <input
            id="email"
            name="email"
            type="text"
            autoComplete="username"
            aria-invalid={!!error}
            aria-describedby={error ? "login-error" : undefined}
            required
            className="input-ink"
          />
        </div>
        <div>
          <label htmlFor="password" className="field-label">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!error}
            aria-describedby={error ? "login-error" : undefined}
            required
            className="input-ink"
          />
        </div>

        {error && (
          <p id="login-error" className="alert-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn-cobalt mt-1 w-full" disabled={pending}>
          {pending ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <div className="mt-8 flex flex-col gap-2 border-t border-line pt-6 text-sm">
        <Link href="/mot-de-passe-oublie" className="link">
          Mot de passe oublié ?
        </Link>
        <p className="text-ink/60">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="link">
            Inscrivez-vous
          </Link>
        </p>
      </div>
    </div>
  );
}
