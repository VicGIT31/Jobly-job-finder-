import { CONTRACT_LABELS } from "@/lib/search-params";

/**
 * Badge de contrat codé couleur : outremer pour le stage, corail pour
 * l'alternance — l'information la plus discriminante se lit d'un coup d'œil.
 */
export function ContractBadge({ type, className = "" }: { type: string; className?: string }) {
  const label = CONTRACT_LABELS[type as keyof typeof CONTRACT_LABELS] ?? type;
  const tone = type === "ALTERNANCE" ? "badge-alternance" : "badge-stage";
  return (
    <span className={`${tone} ${className}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
