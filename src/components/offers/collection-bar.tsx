"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import type {} from "@/app/bureau/panel";

type CollectionStatus = {
  collecting: boolean;
  offers: number;
  error: string | null;
  runs: {
    id: string;
    label: string;
    ok: boolean;
    error: string | null;
    fetched: number;
    startedAt: string;
  }[];
};

const DAY = 86_400_000;

/**
 * État de la collecte locale, en tête des résultats : actualisation en cours,
 * dernier passage, mode hors connexion et sources incomplètes. Sans l'application
 * de bureau (version web), le bouton relance simplement la recherche.
 */
export function CollectionBar({
  city,
  onRefresh,
}: {
  /** Commune choisie : les collecteurs locaux (France Travail, HelloWork, cliniques) s'y adaptent. */
  city?: string;
  /** Rejoue la recherche, par exemple à la fin d'une collecte. */
  onRefresh: () => void;
}) {
  const [status, setStatus] = useState<CollectionStatus>();
  const [online, setOnline] = useState(true);
  const [notice, setNotice] = useState("");
  const wasCollecting = useRef(false);
  const refresh = useRef(onRefresh);
  refresh.current = onRefresh;

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (!window.joblyDesktop) return;
    let active = true;
    const poll = async () => {
      try {
        const next = await window.joblyDesktop!.status();
        if (!active) return;
        setStatus(next);
        setNotice("");
        // Les premiers lots sont déjà visibles : on rafraîchit à la fin du cycle.
        if (wasCollecting.current && !next.collecting) refresh.current();
        wasCollecting.current = next.collecting;
      } catch {
        if (active) setNotice("Le service d’actualisation ne répond plus. Relancez Jobly.");
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const failures =
    status?.runs.filter((run) => !run.ok && Date.now() - new Date(run.startedAt).getTime() < DAY) ??
    [];
  const desktop = typeof window !== "undefined" && !!window.joblyDesktop;

  async function collect() {
    try {
      if (window.joblyDesktop) {
        await window.joblyDesktop.collect(city ? { city } : undefined);
        setStatus((previous) => (previous ? { ...previous, collecting: true } : previous));
        setNotice("Collecte lancée. Vous pouvez continuer à consulter les offres.");
      } else onRefresh();
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "L’actualisation a échoué. Réessayez avec une connexion Internet.",
      );
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper px-4 py-3 text-sm">
        <div role="status" className="text-ink/70">
          {status?.collecting ? (
            <span className="flex items-center gap-2">
              <RefreshCw size={15} className="animate-spin" aria-hidden="true" />
              Actualisation en cours · résultats enrichis progressivement
            </span>
          ) : status?.runs[0] ? (
            `Dernier passage : ${new Date(status.runs[0].startedAt).toLocaleString("fr-FR")}`
          ) : (
            "Les offres déjà collectées sont disponibles immédiatement."
          )}
        </div>
        <button
          type="button"
          className="btn-outline btn-sm"
          disabled={(desktop && status?.collecting) || !online}
          onClick={() => void collect()}
        >
          <RefreshCw size={15} aria-hidden="true" />
          Actualiser
        </button>
      </div>
      {!online && (
        <p role="status" className="mt-3 flex items-center gap-2 text-sm text-ink/75">
          <WifiOff size={16} aria-hidden="true" />
          Hors connexion : consultez le catalogue conservé. L’actualisation et les candidatures
          nécessitent Internet.
        </p>
      )}
      {notice && (
        <p role="status" className="mt-3 text-sm text-ink/75">
          {notice}
        </p>
      )}
      {(failures.length > 0 || status?.error) && (
        <details className="mt-3 rounded-xl border border-line bg-paper p-3 text-sm">
          <summary className="cursor-pointer">
            {failures.length} passage(s) de source incomplet(s) ou indisponible(s)
          </summary>
          <ul className="mt-2 space-y-2">
            {failures.map((run) => (
              <li key={run.id}>
                <strong>{run.label}</strong> : {run.fetched} offres reçues ·{" "}
                {run.error ?? "Collecte partielle"}
              </li>
            ))}
          </ul>
          {status?.error && <p className="mt-2">{status.error}</p>}
          <Link className="link mt-2 inline-block" href="/bureau">
            Détail de l’actualisation
          </Link>
        </details>
      )}
    </div>
  );
}
