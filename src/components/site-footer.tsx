import Link from "next/link";
import { JoblyLogo } from "@/components/brand/jobly-logo";

const COLUMNS = [
  {
    title: "Explorer",
    links: [
      { href: "/offres", label: "Toutes les offres" },
      { href: "/offres?univers=TECH", label: "Tech · stages & alternances" },
      { href: "/offres?univers=COMMERCE", label: "Commerce, marketing & com" },
      { href: "/offres?univers=ASV", label: "ASV & métiers animaliers" },
    ],
  },
  {
    title: "Personnel",
    links: [
      { href: "/mon-espace/sauvegardees", label: "Favoris" },
      { href: "/mon-espace/alertes", label: "Recherches sauvegardées" },
      { href: "/mon-espace/candidatures", label: "Candidatures" },
    ],
  },
  {
    title: "Jobly 0.3.0",
    links: [
      { href: "/bureau", label: "Actualisation & données" },
      { href: "/mon-espace", label: "Profil & CV" },
      { href: "/mon-espace/confidentialite", label: "Confidentialité" },
    ],
  },
] as const;

export async function SiteFooter() {
  // Accroche modifiable depuis `/admin/parametres`.
  const tagline =
    "Votre recherche personnelle d’emploi : tech, commerce, marketing, communication et auxiliaires vétérinaires.";

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
