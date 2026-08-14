import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { logout } from "@/server/account/actions";

export const dynamic = "force-dynamic";

export default async function MonEspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/connexion?callbackUrl=/mon-espace");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Mon espace<span className="text-cobalt">.</span>
        </h1>
        <form action={logout}>
          <button type="submit" className="text-sm text-ink/60 underline-offset-4 hover:underline">
            Se déconnecter
          </button>
        </form>
      </div>

      <nav
        aria-label="Navigation de l'espace candidat"
        className="rule mt-4 flex flex-wrap gap-1 pt-3"
      >
        <Link href="/mon-espace" className="px-3 py-2 text-sm font-semibold hover:bg-ink/5">
          Profil & CV
        </Link>
        <Link
          href="/mon-espace/sauvegardees"
          className="px-3 py-2 text-sm font-semibold hover:bg-ink/5"
        >
          Offres sauvegardées
        </Link>
        <Link
          href="/mon-espace/candidatures"
          className="px-3 py-2 text-sm font-semibold hover:bg-ink/5"
        >
          Candidatures
        </Link>
        <Link
          href="/mon-espace/masquees"
          className="px-3 py-2 text-sm font-semibold hover:bg-ink/5"
        >
          Offres masquées
        </Link>
        <Link
          href="/mon-espace/insights"
          className="px-3 py-2 text-sm font-semibold hover:bg-ink/5"
        >
          Insights
        </Link>
        <Link
          href="/mon-espace/confidentialite"
          className="px-3 py-2 text-sm font-semibold hover:bg-ink/5"
        >
          Confidentialité
        </Link>
        <Link href="/mon-espace/alertes" className="px-3 py-2 text-sm font-semibold hover:bg-ink/5">
          Alertes
        </Link>
        <Link href="/mon-espace/clics" className="px-3 py-2 text-sm font-semibold hover:bg-ink/5">
          Historique Postuler
        </Link>
      </nav>

      <div className="mt-6">{children}</div>
    </div>
  );
}
