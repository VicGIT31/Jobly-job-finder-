/** Formats d'affichage des offres (dates, salaires) — purs, sans dépendance serveur. */

export function formatSalary(min: number | null, max: number | null, period?: string): string | null {
  if (min == null && max == null) return null;
  const fmt = (n: number) =>
    n >= 10000 ? `${Math.round(n / 1000)} k€` : `${n.toLocaleString("fr-FR")} €`;
  const unit = period ? ({ YEAR: "/an", MONTH: "/mois", HOUR: "/heure" }[period] ?? "(période non précisée)") : (min ?? max ?? 0) >= 10000 ? "/an" : "/mois";
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)} ${unit}`;
  return `${fmt(min ?? max ?? 0)} ${unit}`;
}

/** Date de publication (site d'origine) au format court français : "17 juil. 2026". */
export function formatDateFr(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function timeAgo(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${days} jours`;
  const months = Math.floor(days / 30);
  return `il y a ${months} mois`;
}
