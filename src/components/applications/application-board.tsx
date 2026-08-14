"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { ApplicationStatus } from "@prisma/client";
import {
  ALL_STATUSES,
  APPLICATION_STATUS_LABELS,
  ARCHIVED_STATUSES,
  BOARD_COLUMNS,
} from "@/lib/application-status";
import { CompanyLogo } from "@/components/offers/company-logo";
import { timeAgo } from "@/components/offers/offer-card";
import {
  createManualApplication,
  deleteApplication,
  updateApplicationNotes,
  updateApplicationStatus,
} from "@/server/applications/actions";

export type ApplicationItem = {
  id: string;
  offerId: string | null;
  offerSlug: string | null;
  offerExpired: boolean;
  companyName: string;
  jobTitle: string;
  companyLogoUrl: string | null;
  sourceUrl: string | null;
  status: ApplicationStatus;
  notes: string | null;
  appliedAtTs: number | null;
  createdAtTs: number;
  followUp: { days: number; message: string } | null;
};

export function ApplicationBoard({ items }: { items: ApplicationItem[] }) {
  const [boardItems, setBoardItems] = useState(items);
  const [showAddForm, setShowAddForm] = useState(false);
  const [dragOverStatus, setDragOverStatus] = useState<ApplicationStatus | null>(null);
  const [view, setView] = useState<"board" | "list">("board");
  const [, startTransition] = useTransition();

  // Les server actions revalident la page : ce composant reçoit alors un
  // nouveau tableau `items`, qu'on resynchronise dans l'état local (optimiste
  // entre-temps pour le drag-and-drop et les changements de statut).
  useEffect(() => setBoardItems(items), [items]);

  function moveTo(id: string, status: ApplicationStatus) {
    setBoardItems((prev) => prev.map((it) => (it.id === id ? { ...it, status } : it)));
    startTransition(async () => {
      const res = await updateApplicationStatus(id, status);
      if (!res.ok) {
        alert(res.error);
        setBoardItems(items);
      }
    });
  }

  function remove(id: string) {
    if (!window.confirm("Retirer définitivement cette candidature du suivi ?")) return;
    setBoardItems((prev) => prev.filter((it) => it.id !== id));
    startTransition(() => deleteApplication(id));
  }

  const active = BOARD_COLUMNS.map((status) => ({
    status,
    items: boardItems.filter((it) => it.status === status),
  }));
  const archived = boardItems.filter((it) => ARCHIVED_STATUSES.includes(it.status));

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          className="inline-flex rounded-lg border border-ink/15 p-0.5"
          role="group"
          aria-label="Vue"
        >
          <button
            type="button"
            onClick={() => setView("board")}
            aria-pressed={view === "board"}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${view === "board" ? "bg-ink/10" : "text-ink/60 hover:text-ink"}`}
          >
            Tableau
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${view === "list" ? "bg-ink/10" : "text-ink/60 hover:text-ink"}`}
          >
            Liste
          </button>
        </div>
        <button
          type="button"
          className="btn-outline"
          onClick={() => setShowAddForm((v) => !v)}
          aria-expanded={showAddForm}
        >
          {showAddForm ? "Annuler" : "+ Ajouter une candidature"}
        </button>
      </div>

      {showAddForm && <AddApplicationForm onDone={() => setShowAddForm(false)} />}

      {boardItems.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-ink/20 p-10 text-center">
          <p className="text-ink/70">
            Aucune candidature suivie pour l'instant. Cliquez « Postuler » sur une offre, ou ajoutez
            une candidature faite ailleurs.
          </p>
          <Link href="/offres" className="btn-cobalt mt-4">
            Explorer les offres
          </Link>
        </div>
      ) : view === "list" ? (
        <ApplicationListView items={boardItems} onMove={moveTo} onRemove={remove} />
      ) : (
        <div className="mt-4 grid auto-cols-[260px] grid-flow-col gap-3 overflow-x-auto pb-2 sm:auto-cols-[280px]">
          {active.map((col) => (
            <div
              key={col.status}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStatus(col.status);
              }}
              onDragLeave={() => setDragOverStatus((s) => (s === col.status ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                if (id) moveTo(id, col.status);
                setDragOverStatus(null);
              }}
              className={`flex min-h-[160px] flex-col gap-2 rounded-xl border p-2 transition-colors ${
                dragOverStatus === col.status
                  ? "border-cobalt bg-cobalt-soft/40"
                  : "border-ink/10 bg-surface"
              }`}
            >
              <div className="flex items-baseline justify-between px-1">
                <h3 className="text-sm font-semibold">{APPLICATION_STATUS_LABELS[col.status]}</h3>
                <span className="text-xs tabular-nums text-ink/50">{col.items.length}</span>
              </div>
              {col.items.map((item) => (
                <ApplicationCard key={item.id} item={item} onMove={moveTo} onRemove={remove} />
              ))}
            </div>
          ))}
        </div>
      )}

      {view === "board" && archived.length > 0 && (
        <details className="mt-6 rounded-xl border border-ink/10">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-ink/70">
            Refusées / retirées ({archived.length})
          </summary>
          <div className="grid gap-2 border-t border-ink/10 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((item) => (
              <ApplicationCard
                key={item.id}
                item={item}
                onMove={moveTo}
                onRemove={remove}
                compact
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function ApplicationCard({
  item,
  onMove,
  onRemove,
  compact = false,
}: {
  item: ApplicationItem;
  onMove: (id: string, status: ApplicationStatus) => void;
  onRemove: (id: string) => void;
  compact?: boolean;
}) {
  const selectId = `status-${item.id}`;
  const link = item.offerSlug ? `/offres/${item.offerSlug}` : item.sourceUrl;

  return (
    <article
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
      className={`card cursor-grab p-3 active:cursor-grabbing ${compact ? "text-sm" : ""}`}
    >
      <div className="flex items-start gap-2">
        <CompanyLogo
          name={item.companyName}
          logoUrl={item.companyLogoUrl}
          size={compact ? 28 : 36}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-ink/60">{item.companyName}</p>
          {link ? (
            <a
              href={link}
              target={item.offerSlug ? undefined : "_blank"}
              rel={item.offerSlug ? undefined : "noopener nofollow"}
              className="line-clamp-2 text-sm font-semibold leading-snug hover:text-cobalt"
            >
              {item.jobTitle}
            </a>
          ) : (
            <p className="line-clamp-2 text-sm font-semibold leading-snug">{item.jobTitle}</p>
          )}
        </div>
      </div>

      {item.offerExpired && <p className="stamp mt-1 bg-ink/10 text-ink/60">Offre expirée</p>}

      {item.followUp && (
        <p className="mt-2 flex items-start gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <span aria-hidden="true">⚠</span>
          <span>{item.followUp.message}</span>
        </p>
      )}

      <p className="mt-2 text-xs text-ink/50">
        {item.appliedAtTs
          ? `Postulé ${timeAgo(item.appliedAtTs)}`
          : `Sauvegardé ${timeAgo(item.createdAtTs)}`}
      </p>

      <div className="mt-2 flex items-center gap-2">
        <label htmlFor={selectId} className="sr-only">
          Statut de la candidature — {item.jobTitle} chez {item.companyName}
        </label>
        <select
          id={selectId}
          value={item.status}
          onChange={(e) => onMove(item.id, e.target.value as ApplicationStatus)}
          className="min-h-[32px] flex-1 rounded-md border border-ink/15 bg-paper px-1.5 text-xs"
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {APPLICATION_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="text-xs text-ink/40 hover:text-red-600"
          aria-label={`Retirer la candidature ${item.jobTitle} chez ${item.companyName}`}
        >
          ✕
        </button>
      </div>

      {!compact && <NotesField applicationId={item.id} initialNotes={item.notes} />}
    </article>
  );
}

function ApplicationListView({
  items,
  onMove,
  onRemove,
}: {
  items: ApplicationItem[];
  onMove: (id: string, status: ApplicationStatus) => void;
  onRemove: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "ALL">("ALL");

  const filtered = items.filter((item) => {
    if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return item.companyName.toLowerCase().includes(q) || item.jobTitle.toLowerCase().includes(q);
  });

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrer par entreprise ou poste…"
          aria-label="Filtrer les candidatures"
          className="input-ink max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | "ALL")}
          aria-label="Filtrer par statut"
          className="input-ink max-w-[200px]"
        >
          <option value="ALL">Tous les statuts</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {APPLICATION_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-ink/10">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10 bg-surface text-xs uppercase tracking-wide text-ink/50">
              <th scope="col" className="px-3 py-2">
                Entreprise
              </th>
              <th scope="col" className="px-3 py-2">
                Poste
              </th>
              <th scope="col" className="px-3 py-2">
                Statut
              </th>
              <th scope="col" className="px-3 py-2">
                Postulé
              </th>
              <th scope="col" className="px-3 py-2" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const link = item.offerSlug ? `/offres/${item.offerSlug}` : item.sourceUrl;
              return (
                <tr key={item.id} className="border-b border-ink/5 last:border-0">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <CompanyLogo
                        name={item.companyName}
                        logoUrl={item.companyLogoUrl}
                        size={24}
                      />
                      <span className="truncate">{item.companyName}</span>
                    </div>
                  </td>
                  <td className="max-w-[220px] truncate px-3 py-2">
                    {link ? (
                      <a
                        href={link}
                        target={item.offerSlug ? undefined : "_blank"}
                        rel={item.offerSlug ? undefined : "noopener nofollow"}
                        className="font-medium hover:text-cobalt"
                      >
                        {item.jobTitle}
                      </a>
                    ) : (
                      item.jobTitle
                    )}
                    {item.followUp && (
                      <span
                        title={item.followUp.message}
                        aria-label={item.followUp.message}
                        className="ml-1 text-amber-600"
                      >
                        ⚠
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <label htmlFor={`list-status-${item.id}`} className="sr-only">
                      Statut — {item.jobTitle} chez {item.companyName}
                    </label>
                    <select
                      id={`list-status-${item.id}`}
                      value={item.status}
                      onChange={(e) => onMove(item.id, e.target.value as ApplicationStatus)}
                      className="min-h-[32px] rounded-md border border-ink/15 bg-paper px-1.5 text-xs"
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {APPLICATION_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-ink/60">
                    {item.appliedAtTs ? timeAgo(item.appliedAtTs) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      className="text-xs text-ink/40 hover:text-red-600"
                      aria-label={`Retirer la candidature ${item.jobTitle} chez ${item.companyName}`}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-4 text-center text-sm text-ink/50">Aucune candidature ne correspond.</p>
        )}
      </div>
    </div>
  );
}

function NotesField({
  applicationId,
  initialNotes,
}: {
  applicationId: string;
  initialNotes: string | null;
}) {
  const [open, setOpen] = useState(Boolean(initialNotes));
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saved, setSaved] = useState(true);
  const [, startTransition] = useTransition();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onChange(value: string) {
    setNotes(value);
    setSaved(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      startTransition(async () => {
        await updateApplicationNotes(applicationId, value);
        setSaved(true);
      });
    }, 800);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 text-xs text-ink/50 underline-offset-4 hover:text-cobalt hover:underline"
      >
        + Note
      </button>
    );
  }

  return (
    <div className="mt-2">
      <textarea
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder="Contact, relance, retour d'entretien…"
        className="w-full rounded-md border border-ink/15 bg-paper px-2 py-1 text-xs placeholder:text-ink/35"
      />
      <p className="mt-0.5 text-right text-[10px] text-ink/35">{saved ? "Enregistré" : "…"}</p>
    </div>
  );
}

function AddApplicationForm({ onDone }: { onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createManualApplication(form);
      if (res.ok) {
        onDone();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="card mt-3 grid gap-3 p-4 sm:grid-cols-2">
      <div>
        <label htmlFor="companyName" className="mb-1 block text-sm font-semibold">
          Entreprise
        </label>
        <input id="companyName" name="companyName" required maxLength={160} className="input-ink" />
      </div>
      <div>
        <label htmlFor="jobTitle" className="mb-1 block text-sm font-semibold">
          Intitulé du poste
        </label>
        <input id="jobTitle" name="jobTitle" required maxLength={200} className="input-ink" />
      </div>
      <div>
        <label htmlFor="sourceUrl" className="mb-1 block text-sm font-semibold">
          Lien de l'annonce (optionnel)
        </label>
        <input
          id="sourceUrl"
          name="sourceUrl"
          type="url"
          placeholder="https://…"
          className="input-ink"
        />
      </div>
      <div>
        <label htmlFor="status" className="mb-1 block text-sm font-semibold">
          Statut
        </label>
        <select id="status" name="status" defaultValue="APPLIED" className="input-ink">
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {APPLICATION_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className="btn-cobalt">
          {pending ? "Ajout…" : "Ajouter"}
        </button>
      </div>
    </form>
  );
}
