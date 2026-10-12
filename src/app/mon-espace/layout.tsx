import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { auth } from "@/lib/auth";
import { logout } from "@/server/account/actions";
import { MonEspaceNav } from "@/components/account/mon-espace-nav";

export const dynamic = "force-dynamic";

export default async function MonEspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/connexion?callbackUrl=/mon-espace");
  }

  const displayName = session.user.name ?? session.user.email ?? null;

  return (
    <div className="container-page pb-8 pt-8 sm:pt-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Espace candidat</p>
          <h1 className="mt-3 text-display-sm font-semibold">
            Mon <span className="serif-accent text-accent">espace</span>
          </h1>
          {displayName && (
            <p className="mt-2 truncate text-sm text-ink/60">
              Connecté·e en tant que {displayName}
            </p>
          )}
        </div>
        <form action={logout}>
          <button type="submit" className="btn-ghost btn-sm">
            <LogOut aria-hidden="true" size={15} />
            Se déconnecter
          </button>
        </form>
      </header>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
        <MonEspaceNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
