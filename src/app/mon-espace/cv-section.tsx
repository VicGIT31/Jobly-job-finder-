"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowUpRight, FileText, LoaderCircle, Trash2, Upload } from "lucide-react";
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
  const [chosen, setChosen] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      setResult(await uploadCv(form));
      if (inputRef.current) inputRef.current.value = "";
      setChosen(null);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {cvFilename ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface/50 p-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-paper text-danger">
              <FileText aria-hidden="true" size={18} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{cvFilename}</p>
              <p className="font-mono text-2xs text-ink/60">Importé le {cvUploadedAt}</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <a href="/api/cv" target="_blank" rel="noopener" className="btn-outline btn-sm">
              Voir
              <ArrowUpRight aria-hidden="true" size={14} />
            </a>
            <button
              type="button"
              className="btn-ghost btn-sm hover:!bg-danger-soft hover:!text-danger"
              onClick={() => startTransition(async () => setResult(await deleteCv()))}
              disabled={pending}
            >
              <Trash2 aria-hidden="true" size={14} />
              Supprimer
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink/60">Aucun CV importé pour le moment.</p>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <span className="field-label !mb-0">
          {cvFilename ? "Remplacer le CV" : "Importer un CV"}
        </span>
        {/* Zone de dépôt : le vrai <input type="file"> couvre toute la zone. */}
        <label
          htmlFor="cv"
          className="group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink/20 bg-paper px-4 py-7 text-center transition-colors duration-base focus-within:border-accent focus-within:shadow-ring hover:border-accent hover:bg-accent-soft/40"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-ink/[0.05] text-ink/60 transition-colors duration-base group-hover:bg-accent group-hover:text-accent-fg">
            <Upload aria-hidden="true" size={17} />
          </span>
          <span className="text-sm font-medium">{chosen ?? "Choisir un fichier PDF"}</span>
          <span className="text-xs text-ink/60">ou glissez-le ici · 5 Mo max.</span>
          <input
            ref={inputRef}
            id="cv"
            name="cv"
            type="file"
            accept="application/pdf"
            required
            onChange={(e) => setChosen(e.target.files?.[0]?.name ?? null)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <button type="submit" className="btn-cobalt self-start" disabled={pending}>
          {pending && <LoaderCircle aria-hidden="true" size={16} className="animate-spin" />}
          {pending ? "Import…" : "Importer"}
        </button>
      </form>

      {result && (
        <p
          className={result.ok ? "alert-success" : "alert-error"}
          role={result.ok ? "status" : "alert"}
        >
          {result.ok ? `✓ ${result.message}` : result.error}
        </p>
      )}
    </div>
  );
}
