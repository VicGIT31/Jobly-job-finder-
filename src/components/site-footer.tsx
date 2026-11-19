import Link from "next/link";
import pkg from "../../package.json";
import { JoblyLogo } from "@/components/brand/jobly-logo";

const COLUMNS = [
  {
    title: "Explorer",
    links: [
      { href: "/offres", label: "Toutes les offres" },
      { href: "/offres?univers=TECH", label: "Tech & informatique" },
      { href: "/offres?univers=COMMERCE", label: "Commerce, marketing & com" },
      { href: "/offres?univers=FINANCE&national=1", label: "Assurance, banque & finance" },
      { href: "/offres?metier=BARISTA", label: "Café & barista" },
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
    title: `Jobly ${pkg.version}`,
    links: [
      { href: "/assistant", label: "Assistant de collecte" },
      { href: "/mon-espace", label: "Profil & CV" },
      { href: "/mon-espace/confidentialite", label: "Confidentialité" },
    ],
  },
] as const;

export async function SiteFooter() {
  // Accroche modifiable depuis `/admin/parametres`.
  const tagline =
    "Votre recherche d’emploi, partout en France.";

  return (
    <footer className="relative mt-16 overflow-hidden border-t border-line bg-paper">
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

    </footer>
  );
}
