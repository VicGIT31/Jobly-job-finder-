import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-ink">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row">
          <div>
            <p className="font-display text-xl font-black">
              NextStep<span className="text-cobalt">.</span>
            </p>
            <p className="mt-2 max-w-sm text-sm text-ink/70">
              Le job board qui vous ramène toujours à la source. Stages, alternances, CDI et VIE
              pour étudiants et jeunes diplômés.
            </p>
          </div>
          <nav aria-label="Liens de pied de page" className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            <Link href="/offres" className="py-1 underline-offset-4 hover:underline">
              Toutes les offres
            </Link>
            <Link href="/entreprises" className="py-1 underline-offset-4 hover:underline">
              Entreprises
            </Link>
            <Link href="/mon-espace" className="py-1 underline-offset-4 hover:underline">
              Mon espace
            </Link>
            <Link href="/mentions-legales" className="py-1 underline-offset-4 hover:underline">
              Mentions légales
            </Link>
          </nav>
        </div>
        <div className="rule mt-6 pt-4 text-xs text-ink/50">
          © {new Date().getFullYear()} NextStep — Les offres proviennent de sites partenaires ;
          les candidatures se font toujours à la source.
        </div>
      </div>
    </footer>
  );
}
