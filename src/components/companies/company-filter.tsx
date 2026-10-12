"use client";

import { useEffect, useRef, useState } from "react";
import { Search, SearchX } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Filtre instantané de l'annuaire, en amélioration progressive : les cartes
 * sont rendues côté serveur (attributs `data-name`, `data-active`) et ce
 * composant se contente de masquer celles qui ne correspondent pas.
 */
export function CompanyFilter({
  total,
  hiring,
  children,
}: {
  total: number;
  hiring: number;
  children: React.ReactNode;
}) {
  const gridRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"all" | "hiring">("all");
  const [visible, setVisible] = useState(total);

  useEffect(() => {
    const q = normalize(query.trim());
    let count = 0;
    gridRef.current?.querySelectorAll<HTMLElement>("[data-name]").forEach((el) => {
      const match =
        (!q || normalize(el.dataset.name ?? "").includes(q)) &&
        (scope === "all" || el.dataset.active === "1");
      el.hidden = !match;
      if (match) count++;
    });
    setVisible(count);
  }, [query, scope]);

  return (
    <div>
      <div className="sticky top-[var(--header-h)] z-20 -mx-4 flex flex-col gap-3 bg-canvas/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:flex-row sm:items-center sm:px-6 lg:-mx-8 lg:px-8">
        <div className="relative flex-1 sm:max-w-md">
          <Search
            aria-hidden="true"
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/60"
          />
          <label htmlFor="filtre-entreprises" className="sr-only">
            Filtrer les entreprises
          </label>
          <input
            id="filtre-entreprises"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrer par nom ou secteur…"
            className="input-ink !pl-10"
          />
        </div>
        <Segmented
          label="Entreprises affichées"
          value={scope}
          onChange={setScope}
          options={[
            {
              value: "all",
              label: (
                <>
                  Toutes <span className="font-mono text-2xs text-ink/60">{total}</span>
                </>
              ),
            },
            {
              value: "hiring",
              label: (
                <>
                  Qui recrutent <span className="font-mono text-2xs text-ink/60">{hiring}</span>
                </>
              ),
            },
          ]}
        />
        <p className="text-sm text-ink/60 sm:ml-auto" aria-live="polite">
          <span className="font-mono tabular-nums text-ink">{visible}</span> résultat
          {visible > 1 ? "s" : ""}
        </p>
      </div>

      <ul ref={gridRef} className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </ul>

      {visible === 0 && (
        <div className="empty-state mt-6">
          <SearchX aria-hidden="true" size={24} className="text-ink/40" />
          <p className="mt-3 font-semibold">Aucune entreprise ne correspond</p>
          <p className="mt-1 text-sm text-ink/60">Essayez un autre nom ou un secteur.</p>
        </div>
      )}
    </div>
  );
}
