"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import { CompanyLogo } from "./company-logo";
import { SaveOfferButton } from "./save-offer-button";
import { formatSalary } from "./format";
import { ContractBadge } from "@/components/ui/contract-badge";
import { UNIVERSE_SHORT_LABELS, type JobUniverse } from "@/lib/job-taxonomy";
import type { OfferDocument } from "@/server/search/sync";

export function OfferWorkspace({ offers }: { offers: OfferDocument[] }) {
  const [selectedId, setSelectedId] = useState<string>();
  const current = offers.find(({ id }) => id === selectedId) ?? offers[0];
  if (!current) return null;

  const salary = formatSalary(current.salaryMin, current.salaryMax, current.salaryPeriod);
  return (
    <div className="offres-workspace">
      <ul className="grid min-w-0 content-start gap-2" aria-label="Résultats">
        {offers.map((offer) => <li key={offer.id} className="min-w-0">
          <button type="button" className="workspace-row" aria-pressed={current.id === offer.id} onClick={() => setSelectedId(offer.id)}>
            <span className="flex min-w-0 flex-col gap-1.5">
              <strong className="break-words text-[16px] leading-snug">{offer.title}</strong>
              <span className="break-words text-sm text-ink/70">{offer.companyName} · {offer.city}</span>
              <span className="mt-1 self-start"><ContractBadge type={offer.contractType} /></span>
            </span>
            <ArrowRight size={16} aria-hidden="true" className="shrink-0 text-accent" />
          </button>
        </li>)}
      </ul>
      <section className="workspace-preview" aria-label="Aperçu de l’offre">
        <div className="workspace-preview-head">
          <div className="flex items-center gap-3">
            <CompanyLogo name={current.companyName} logoUrl={current.companyLogo} slug={current.companySlug} size={42} />
            <span className="min-w-0 break-words font-semibold">{current.companyName}</span>
          </div>
          <h2 className="mt-4 break-words text-2xl font-semibold leading-tight" aria-live="polite">{current.title}</h2>
          <p className="mt-3 flex items-center gap-2 text-sm text-ink/75"><MapPin size={16} aria-hidden="true" />{current.city}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <ContractBadge type={current.contractType} />
            {salary && <span className="rounded-md bg-surface px-2 py-1">{salary}</span>}
            {current.universe && <span className="rounded-md bg-surface px-2 py-1">{UNIVERSE_SHORT_LABELS[current.universe as JobUniverse]}</span>}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href={`/go/${current.id}`} target="_blank" rel="nofollow noopener" className="btn-cobalt">Postuler <ArrowUpRight size={17} aria-hidden="true" /></a>
            <SaveOfferButton key={current.id} offerId={current.id} initialSaved={Boolean(current.saved)} isLoggedIn />
          </div>
        </div>
        <div className="p-5">
          <h3 className="font-semibold">À propos du poste</h3>
          <p className="mt-2 break-words text-sm leading-relaxed text-ink/80">{current.descriptionText.slice(0, 600)}{current.descriptionText.length > 600 ? "…" : ""}</p>
          <Link href={`/offres/${current.slug}`} className="link mt-4 inline-flex gap-2">Voir la fiche complète <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </section>
    </div>
  );
}
