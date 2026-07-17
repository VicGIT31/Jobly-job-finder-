import Link from "next/link";
import { auth } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="border-b border-ink">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-signal focus:px-3 focus:py-2 focus:text-[#141414]"
      >
        Aller au contenu
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-display text-2xl font-black tracking-tight">
          NextStep<span className="text-cobalt">.</span>
        </Link>
        <nav aria-label="Navigation principale" className="flex items-center gap-1 sm:gap-4">
          <ThemeToggle />
          <Link
            href="/offres"
            className="px-2 py-2 text-sm font-semibold underline-offset-4 hover:underline"
          >
            Offres
          </Link>
          <Link
            href="/entreprises"
            className="px-2 py-2 text-sm font-semibold underline-offset-4 hover:underline"
          >
            Entreprises
          </Link>
          {user ? (
            <>
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="px-2 py-2 text-sm font-semibold underline-offset-4 hover:underline"
                >
                  Admin
                </Link>
              )}
              <Link href="/mon-espace" className="btn-outline !min-h-[40px] !px-3 !py-1.5 text-sm">
                Mon espace
              </Link>
            </>
          ) : (
            <Link href="/connexion" className="btn-cobalt !min-h-[40px] !px-3 !py-1.5 text-sm">
              Connexion
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
