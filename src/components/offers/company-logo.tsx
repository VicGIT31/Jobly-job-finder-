"use client";

import { useState } from "react";

/**
 * Logo d'entreprise récupéré à l'ingestion (LinkedIn, JSearch, France Travail…).
 * Les URLs viennent de sources externes non garanties : en cas d'absence ou de
 * 404, on retombe sur un monogramme neutre (initiale de l'entreprise).
 */
export function CompanyLogo({
  name,
  logoUrl,
  size = 44,
}: {
  name: string;
  logoUrl: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  if (!logoUrl || failed) {
    return (
      <span
        aria-hidden="true"
        className="flex shrink-0 select-none items-center justify-center rounded-lg border border-ink/10 bg-surface text-lg font-bold text-ink/50"
        style={{ width: size, height: size }}
      >
        {initial}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- domaines externes variés, next/image inadapté
    <img
      src={logoUrl}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-lg border border-ink/10 bg-white object-contain p-0.5"
      style={{ width: size, height: size }}
    />
  );
}
