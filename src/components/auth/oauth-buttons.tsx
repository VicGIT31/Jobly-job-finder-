"use client";

import { signIn } from "next-auth/react";

export function OAuthButtons({ callbackUrl = "/mon-espace" }: { callbackUrl?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="btn-outline w-full"
        onClick={() => signIn("google", { callbackUrl })}
      >
        Continuer avec Google
      </button>
      <button
        type="button"
        className="btn-outline w-full"
        onClick={() => signIn("linkedin", { callbackUrl })}
      >
        Continuer avec LinkedIn
      </button>
      <div className="my-2 flex items-center gap-3 text-xs uppercase tracking-widest text-ink/40">
        <span className="rule flex-1" /> ou <span className="rule flex-1" />
      </div>
    </div>
  );
}
