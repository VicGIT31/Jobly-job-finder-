import Link from "next/link";
import { auth } from "@/lib/auth";
import { JoblyLogo } from "@/components/brand/jobly-logo";
import { SiteNav } from "@/components/site-nav";
import { HeaderShell } from "@/components/header-shell";

export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;

  return (
    <HeaderShell>
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-canvas"
      >
        Aller au contenu
      </a>
      <div className="container-page relative flex h-[var(--header-h)] items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="Jobly — accueil"
          className="rounded-lg transition-opacity hover:opacity-80"
        >
          <JoblyLogo size="md" />
        </Link>
        <SiteNav
          isAdmin={process.env.JOBLY_DESKTOP === "1"}
          isLoggedIn={Boolean(user)}
          userName={user?.name ?? user?.email ?? null}
        />
      </div>
    </HeaderShell>
  );
}
