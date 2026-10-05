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
      <div className="my-2 flex items-center gap-3 text-xs uppercase tracking-widest text-ink/40">
        <span className="rule flex-1" /> ou <span className="rule flex-1" />
      </div>
    </div>
  );
}
