import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { logout } from "@/server/account/actions";
import { MonEspaceNav } from "@/components/account/mon-espace-nav";

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

      <MonEspaceNav />

      <div className="mt-6">{children}</div>
    </div>
  );
}
