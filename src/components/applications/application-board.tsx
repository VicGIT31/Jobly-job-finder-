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
import { Segmented } from "@/components/ui/segmented";
import {
  ArrowUpRight,
  Clock,
  LoaderCircle,
  Plus,
  Search,
  StickyNote,
  TriangleAlert,
  X,
} from "lucide-react";
import { timeAgo } from "@/components/offers/format";
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

/** Pastille de couleur par statut (colonnes, sélecteurs, liste). */
const STATUS_DOT: Record<ApplicationStatus, string> = {
  SAVED: "bg-ink/30",
  APPLIED: "bg-accent",
  ASSESSMENT: "bg-warning",
  INTERVIEW: "bg-alternance",
  OFFER: "bg-success",
  REJECTED: "bg-danger/70",
  WITHDRAWN: "bg-ink/20",
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
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Vue"
          value={view}
          onChange={setView}
          options={[
            { value: "board", label: "Tableau" },
            { value: "list", label: "Liste" },
          ]}
        />
        <button
          type="button"
          className={showAddForm ? "btn-outline btn-sm" : "btn-cobalt btn-sm"}
          onClick={() => setShowAddForm((v) => !v)}
          aria-expanded={showAddForm}
        >
          {showAddForm ? (
            <>
              <X aria-hidden="true" size={15} />
              Annuler
            </>
          ) : (
            <>
              <Plus aria-hidden="true" size={15} />
              Ajouter une candidature
            </>
          )}
        </button>
      </div>

      {showAddForm && <AddApplicationForm onDone={() => setShowAddForm(false)} />}

      {boardItems.length === 0 ? (
        <div className="empty-state mt-6">
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-line bg-paper text-ink/60 shadow-card">
            <Clock aria-hidden="true" size={22} />
          </span>
          <p className="mt-5 text-lg font-semibold tracking-tight">Aucune candidature suivie</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
            Cliquez « Postuler » sur une offre, ou ajoutez une candidature faite ailleurs.
          </p>
          <Link href="/offres" className="btn-cobalt mt-6">
            Explorer les offres
          </Link>
        </div>
      ) : view === "list" ? (
        <ApplicationListView items={boardItems} onMove={moveTo} onRemove={remove} />
      ) : (
        <div className="-mx-4 mt-5 grid auto-cols-[268px] grid-flow-col gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:auto-cols-[284px] sm:px-0">
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
              className={`flex min-h-[200px] flex-col gap-2 rounded-2xl border p-2 transition-[background-color,border-color,box-shadow] duration-base ${
                dragOverStatus === col.status
                  ? "border-accent bg-accent-soft/50 shadow-ring"
                  : "border-line bg-surface/60"
              }`}
            >
              <div className="flex items-center justify-between px-2 pb-1 pt-1.5">
                <h3 className="flex items-center gap-2 text-[13px] font-semibold">
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 rounded-full ${STATUS_DOT[col.status]}`}
                  />
                  {APPLICATION_STATUS_LABELS[col.status]}
                </h3>
                <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-paper px-1.5 font-mono text-2xs tabular-nums text-ink/60">
                  {col.items.length}
                </span>
              </div>
              {col.items.length === 0 && (
                <p className="mx-1 grid flex-1 place-items-center rounded-xl border border-dashed border-ink/10 p-4 text-center text-xs text-ink/60">
                  Glissez une carte ici
                </p>
              )}
              {col.items.map((item) => (
                <ApplicationCard key={item.id} item={item} onMove={moveTo} onRemove={remove} />
              ))}
            </div>
          ))}
        </div>
      )}

      {view === "board" && archived.length > 0 && (
        <details className="group/arch mt-6 rounded-2xl border border-line bg-paper">
          <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-medium text-ink/70 [&::-webkit-details-marker]:hidden">
            <span>
              Refusées / retirées{" "}
              <span className="font-mono text-2xs text-ink/60">({archived.length})</span>
            </span>
            <Plus
              aria-hidden="true"
              size={16}
              className="text-ink/60 transition-transform duration-base group-open/arch:rotate-45"
            />
          </summary>
          <div className="grid grid-cols-1 gap-2 border-t border-line p-3 sm:grid-cols-2 lg:grid-cols-3">
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
      className={`group cursor-grab rounded-xl border border-line bg-paper p-3 shadow-card transition-[border-color,box-shadow,transform] duration-base ease-out hover:border-ink/20 hover:shadow-lift active:scale-[0.98] active:cursor-grabbing ${compact ? "text-sm" : ""}`}
    >
      <div className="flex items-start gap-2.5">
        <CompanyLogo
          name={item.companyName}
          logoUrl={item.companyLogoUrl}
          size={compact ? 28 : 36}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-ink/60">{item.companyName}</p>
          {link ? (
            <a
              href={link}
              target={item.offerSlug ? undefined : "_blank"}
              rel={item.offerSlug ? undefined : "noopener nofollow"}
              className="line-clamp-2 text-[13.5px] font-semibold leading-snug transition-colors hover:text-accent"
            >
              {item.jobTitle}
              {!item.offerSlug && (
                <ArrowUpRight aria-hidden="true" size={12} className="ml-0.5 inline text-ink/40" />
              )}
            </a>
          ) : (
            <p className="line-clamp-2 text-[13.5px] font-semibold leading-snug">{item.jobTitle}</p>
          )}
        </div>
      </div>

      {item.offerExpired && (
        <p className="mt-2 inline-block rounded-full bg-ink/[0.07] px-2 py-0.5 text-2xs font-medium text-ink/60">
          Offre expirée
        </p>
      )}

      {item.followUp && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-warning-soft px-2 py-1.5 text-[11px] font-medium leading-snug text-warning">
          <TriangleAlert aria-hidden="true" size={12} className="mt-px shrink-0" />
          <span>{item.followUp.message}</span>
        </p>
      )}

      <p className="mt-2.5 flex items-center gap-1 font-mono text-2xs text-ink/60">
        <Clock aria-hidden="true" size={11} />
        {item.appliedAtTs
          ? `Postulé ${timeAgo(item.appliedAtTs)}`
          : `Sauvegardé ${timeAgo(item.createdAtTs)}`}
      </p>

      <div className="mt-2.5 flex items-center gap-1.5 border-t border-line pt-2.5">
        <label htmlFor={selectId} className="sr-only">
          Statut de la candidature — {item.jobTitle} chez {item.companyName}
        </label>
        <select
          id={selectId}
          value={item.status}
          onChange={(e) => onMove(item.id, e.target.value as ApplicationStatus)}
          className="input-ink !min-h-[32px] flex-1 !rounded-lg !px-2 !py-0 !pr-7 !text-xs !shadow-none"
          style={{ backgroundPosition: "right 0.45rem center" }}
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
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink/60 transition-colors hover:bg-danger-soft hover:text-danger"
          aria-label={`Retirer la candidature ${item.jobTitle} chez ${item.companyName}`}
        >
          <X aria-hidden="true" size={15} />
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
    <div className="mt-5">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search
            aria-hidden="true"
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/60"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrer par entreprise ou poste…"
            aria-label="Filtrer les candidatures"
            className="input-ink !pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | "ALL")}
          aria-label="Filtrer par statut"
          className="input-ink sm:max-w-[220px]"
        >
          <option value="ALL">Tous les statuts</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {APPLICATION_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="table-shell mt-4">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface/60 font-mono text-2xs uppercase tracking-[0.14em] text-ink/60">
              <th scope="col" className="px-4 py-3 font-medium">
                Entreprise
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Poste
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Statut
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Postulé
              </th>
              <th scope="col" className="px-4 py-3" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const link = item.offerSlug ? `/offres/${item.offerSlug}` : item.sourceUrl;
              return (
                <tr
                  key={item.id}
                  className="border-b border-line transition-colors last:border-0 hover:bg-ink/[0.02]"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <CompanyLogo
                        name={item.companyName}
                        logoUrl={item.companyLogoUrl}
                        size={24}
                      />
                      <span className="truncate">{item.companyName}</span>
                    </div>
                  </td>
                  <td className="max-w-[240px] truncate px-4 py-2.5">
                    {link ? (
                      <a
                        href={link}
                        target={item.offerSlug ? undefined : "_blank"}
                        rel={item.offerSlug ? undefined : "noopener nofollow"}
                        className="font-medium transition-colors hover:text-accent"
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
                        role="img"
                        className="ml-1.5 inline-flex align-[-2px] text-warning"
                      >
                        <TriangleAlert aria-hidden="true" size={14} />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <label htmlFor={`list-status-${item.id}`} className="sr-only">
                      Statut — {item.jobTitle} chez {item.companyName}
                    </label>
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[item.status]}`}
                      />
                      <select
                        id={`list-status-${item.id}`}
                        value={item.status}
                        onChange={(e) => onMove(item.id, e.target.value as ApplicationStatus)}
                        className="input-ink !min-h-[32px] !w-auto !rounded-lg !py-0 !pl-2 !pr-7 !text-xs !shadow-none"
                        style={{ backgroundPosition: "right 0.45rem center" }}
                      >
                        {ALL_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {APPLICATION_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-ink/60">
                    {item.appliedAtTs ? timeAgo(item.appliedAtTs) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      className="inline-grid h-8 w-8 place-items-center rounded-lg text-ink/60 transition-colors hover:bg-danger-soft hover:text-danger"
                      aria-label={`Retirer la candidature ${item.jobTitle} chez ${item.companyName}`}
                    >
                      <X aria-hidden="true" size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-6 text-center text-sm text-ink/60">Aucune candidature ne correspond.</p>
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
        className="mt-1.5 inline-flex min-h-[28px] items-center gap-1 rounded-md text-xs text-ink/60 transition-colors hover:text-accent"
      >
        <StickyNote aria-hidden="true" size={12} />
        Ajouter une note
      </button>
    );
  }

  return (
    <div className="mt-2.5">
      <textarea
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder="Contact, relance, retour d'entretien…"
        aria-label="Note sur la candidature"
        className="w-full resize-y rounded-lg border border-line bg-surface/50 px-2.5 py-1.5 text-xs leading-relaxed placeholder:text-ink/50 focus:border-accent focus:bg-paper focus:outline-none"
      />
      <p
        className={`mt-0.5 text-right font-mono text-[10px] ${saved ? "text-success" : "text-ink/60"}`}
        aria-live="polite"
      >
        {saved ? "Enregistré" : "…"}
      </p>
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
    <form
      onSubmit={onSubmit}
      className="panel mt-4 grid animate-[page-in_260ms_cubic-bezier(0.16,1,0.3,1)] grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <p className="eyebrow sm:col-span-2">Nouvelle candidature</p>
      <div>
        <label htmlFor="companyName" className="field-label">
          Entreprise
        </label>
        <input id="companyName" name="companyName" required maxLength={160} className="input-ink" />
      </div>
      <div>
        <label htmlFor="jobTitle" className="field-label">
          Intitulé du poste
        </label>
        <input id="jobTitle" name="jobTitle" required maxLength={200} className="input-ink" />
      </div>
      <div>
        <label htmlFor="sourceUrl" className="field-label">
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
        <label htmlFor="status" className="field-label">
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
      {error && (
        <p className="alert-error sm:col-span-2" role="alert">
          {error}
        </p>
      )}
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className="btn-cobalt">
          {pending && <LoaderCircle aria-hidden="true" size={16} className="animate-spin" />}
          {pending ? "Ajout…" : "Ajouter"}
        </button>
      </div>
    </form>
  );
}
