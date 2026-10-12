import { BrainCircuit, Cloud, CodeXml, Globe, Network, ShieldCheck, Sparkles } from "lucide-react";
import type { LucideProps } from "lucide-react";

/** Pictogrammes vectoriels des spécialités (remplacent les émojis côté interface). */
const ICONS = {
  IA: BrainCircuit,
  CYBERSECURITE: ShieldCheck,
  WEB: Globe,
  DEVOPS: Cloud,
  SOFTWARE: CodeXml,
  RESEAUX: Network,
} as const;

export function SpecialtyIcon({ specialty, ...props }: { specialty: string } & LucideProps) {
  const Icon = ICONS[specialty as keyof typeof ICONS] ?? Sparkles;
  return <Icon aria-hidden="true" {...props} />;
}
