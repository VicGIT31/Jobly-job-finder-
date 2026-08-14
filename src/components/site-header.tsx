import Link from "next/link";
import { auth } from "@/lib/auth";
import { JoblyLogo } from "@/components/brand/jobly-logo";
import { SiteNav } from "@/components/site-nav";

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
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" aria-label="Jobly — accueil" className="rounded-lg">
          <JoblyLogo size="md" />
        </Link>
        <SiteNav isAdmin={user?.role === "ADMIN"} isLoggedIn={Boolean(user)} />
      </div>
    </header>
  );
}
