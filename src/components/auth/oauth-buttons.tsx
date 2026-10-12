"use client";

import { signIn, getProviders } from "next-auth/react";
import { useEffect, useState } from "react";

export function OAuthButtons({ callbackUrl = "/mon-espace" }: { callbackUrl?: string }) {
  const [providers, setProviders] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    void getProviders()
      .then((items) => {
        if (active) setProviders(Object.keys(items ?? {}));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  if (!providers.some((provider) => provider === "google" || provider === "linkedin")) return null;
  return (
    <div className="flex flex-col gap-2">
      {providers.includes("google") && (
        <button
          type="button"
          className="btn-outline w-full"
          onClick={() => signIn("google", { callbackUrl })}
        >
          Continuer avec Google
        </button>
      )}
      {providers.includes("linkedin") && (
        <button
          type="button"
          className="btn-outline w-full"
          onClick={() => signIn("linkedin", { callbackUrl })}
        >
          Continuer avec LinkedIn
        </button>
      )}
      <div className="my-4 flex items-center gap-3 font-mono text-2xs uppercase tracking-[0.14em] text-ink/60">
        <span className="h-px flex-1 bg-line" /> ou <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
