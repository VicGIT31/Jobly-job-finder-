import { fold } from "@/lib/job-taxonomy";
type Identity = { title: string; description: string; city: string; companyName: string; contractType: string; sourceUrl: string; publishedAt: Date | null };
function shingles(text: string) { const words = fold(text).split(" "); const result = new Set<string>(); for (let i = 0; i <= words.length - 5; i++) result.add(words.slice(i, i + 5).join(" ")); return result; }
function reference(text: string) { return /(?:r[eé]f[eé]rence (?:de l['’]offre|du poste)|job requisition|job reference)\s*[:#-]\s*([a-z0-9_-]{4,})/i.exec(text)?.[1].toLowerCase(); }
/** High confidence replicas only. Distinct postings on one host are preserved. */
export function samePersonalOffer(a: Identity, b: Identity): boolean {
  if (new URL(a.sourceUrl).hostname === new URL(b.sourceUrl).hostname) return false;
  if (fold(a.title) !== fold(b.title) || fold(a.city) !== fold(b.city) || fold(a.companyName) !== fold(b.companyName) || a.contractType !== b.contractType) return false;
  if (/confidentiel|non precis|non disponible/.test(fold(a.companyName))) return false;
  const ar = reference(a.description), br = reference(b.description);
  if (ar && br && ar !== br) return false;
  if (a.publishedAt && b.publishedAt && Math.abs(a.publishedAt.getTime() - b.publishedAt.getTime()) > 7 * 86400000) return false;
  const first = shingles(a.description), second = shingles(b.description);
  if (Math.min(first.size, second.size) < 120) return false;
  let shared = 0; for (const value of first) if (second.has(value)) shared++;
  // Allows a board's introductory text while requiring almost all distinctive
  // sequences of the shorter description. This is a heuristic, not a source ID.
  return shared / Math.min(first.size, second.size) >= 0.97;
}
