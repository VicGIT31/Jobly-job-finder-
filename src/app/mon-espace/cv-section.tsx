"use client";

import { useRef, useState, useTransition } from "react";
import { deleteCv, uploadCv } from "@/server/account/actions";
import type { ActionResult } from "@/server/auth/actions";

export function CvSection({
  cvFilename,
  cvUploadedAt,
}: {
  cvFilename: string | null;
  cvUploadedAt: string | null;
}) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      setResult(await uploadCv(form));
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {cvFilename ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-ink/30 p-3">
          <div>
            <p className="text-sm font-semibold">{cvFilename}</p>
            <p className="text-xs text-ink/55">Importé le {cvUploadedAt}</p>
          </div>
          <div className="flex gap-2">
            <a
              href="/api/cv"
              target="_blank"
              rel="noopener"
              className="btn-outline !min-h-[36px] !px-3 !py-1 text-sm"
            >
              Voir ↗
            </a>
            <button
              type="button"
              className="btn-outline !min-h-[36px] !px-3 !py-1 text-sm"
              onClick={() => startTransition(async () => setResult(await deleteCv()))}
              disabled={pending}
            >
              Supprimer
            </button>
          </div>
        </div>
      ) : (
        <p className="border border-dashed border-ink/40 p-4 text-center text-sm text-ink/60">
          Aucun CV importé pour le moment.
        </p>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label htmlFor="cv" className="text-sm font-semibold">
          {cvFilename ? "Remplacer le CV" : "Importer un CV"}
        </label>
        <input
          ref={inputRef}
          id="cv"
          name="cv"
          type="file"
          accept="application/pdf"
          required
          className="text-sm file:mr-3 file:cursor-pointer file:border file:border-ink file:bg-paper file:px-3 file:py-2 file:font-semibold file:text-ink"
        />
        <button type="submit" className="btn-cobalt self-start" disabled={pending}>
          {pending ? "Import…" : "Importer"}
        </button>
      </form>

      {result && (
        <p
          className={`border border-ink p-2 text-sm ${result.ok ? "bg-signal text-[#141414]" : ""}`}
          role={result.ok ? "status" : "alert"}
        >
          {result.ok ? `✓ ${result.message}` : result.error}
        </p>
      )}
    </div>
  );
}
