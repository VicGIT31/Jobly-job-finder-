import Link from "next/link";
import { JoblyLogo } from "@/components/brand/jobly-logo";
import { getSettings } from "@/lib/settings";
import { SPECIALTIES, SPECIALTY_LABELS } from "@/lib/search-params";

const COLUMNS = [
  {
    title: "Explorer",
    links: [
      { href: "/offres", label: "Toutes les offres" },
      { href: "/offres?contrat=STAGE", label: "Stages" },
      { href: "/offres?contrat=ALTERNANCE", label: "Alternances" },
      { href: "/entreprises", label: "Entreprises" },
    ],
  },
  {
    title: "Spécialités",
    links: SPECIALTIES.map((s) => ({
      href: `/offres?specialite=${s}`,
      label: SPECIALTY_LABELS[s],
    })),
  },
  {
    title: "Jobly",
    links: [
      { href: "/mon-espace", label: "Mon espace" },
      { href: "/mon-espace/alertes", label: "Alertes email" },
      { href: "/mentions-legales", label: "Mentions légales" },
    ],
  },
] as const;

export async function SiteFooter() {
  // Accroche modifiable depuis `/admin/parametres`.
  const { tagline } = await getSettings("general");

  return (
    <footer className="relative mt-24 overflow-hidden border-t border-line bg-paper">
      <div className="container-page grid grid-cols-1 gap-12 py-14 lg:grid-cols-[1.2fr_2fr]">
        <div>
          <JoblyLogo size="md" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink/60">{tagline}</p>
        </div>
        <nav aria-label="Liens de pied de page" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="eyebrow">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink/70 transition-colors hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="container-page flex flex-col gap-2 border-t border-line py-6 text-xs text-ink/60 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Jobly</p>
        <p>
          Les offres proviennent de sites de recrutement — les candidatures se font toujours à la
          source.
        </p>
      </div>

      {/* Pseudo-élément : texte décoratif hors de l'arbre d'accessibilité. */}
      <div
        aria-hidden="true"
        data-word="jobly"
        className="pointer-events-none -mb-[0.3em] select-none text-center font-sans text-[26vw] font-semibold leading-[0.8] tracking-[-0.08em] text-ink/[0.04] before:content-[attr(data-word)]"
      />
    </footer>
  );
}
