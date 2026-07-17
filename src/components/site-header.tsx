import Link from "next/link";
import { auth } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/90 backdrop-blur">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-cobalt focus:px-3 focus:py-2 focus:text-white"
      >
        Aller au contenu
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-xl font-bold tracking-tight">
          NextStep<span className="text-cobalt">.</span>
        </Link>
        <nav aria-label="Navigation principale" className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/offres"
            className="rounded-lg px-3 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-surface hover:text-ink"
          >
            Offres
          </Link>
          <Link
            href="/entreprises"
            className="rounded-lg px-3 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-surface hover:text-ink"
          >
            Entreprises
          </Link>
          {user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-surface hover:text-ink"
            >
              Admin
            </Link>
          )}
          <ThemeToggle />
          {user ? (
            <Link href="/mon-espace" className="btn-outline !min-h-[40px] !px-4 !py-1.5 text-sm">
              Mon espace
            </Link>
          ) : (
            <Link href="/connexion" className="btn-cobalt !min-h-[40px] !px-4 !py-1.5 text-sm">
              Connexion
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
