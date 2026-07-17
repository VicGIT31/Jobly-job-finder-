import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/connexion?callbackUrl=/admin");
  if (session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-baseline gap-3">
        <h1 className="font-display text-3xl font-black tracking-tight">
          Admin<span className="text-cobalt">.</span>
        </h1>
        <span className="stamp !border-[#141414] bg-signal text-[#141414]">Accès restreint</span>
      </div>

      <nav aria-label="Navigation admin" className="rule mt-4 flex flex-wrap gap-1 pt-3">
        <Link href="/admin" className="px-3 py-2 text-sm font-semibold hover:bg-ink/5">
          Ingestion
        </Link>
        <Link href="/admin/offres" className="px-3 py-2 text-sm font-semibold hover:bg-ink/5">
          Modération des offres
        </Link>
        <Link href="/admin/sources" className="px-3 py-2 text-sm font-semibold hover:bg-ink/5">
          Sources & clics
        </Link>
      </nav>

      <div className="mt-6">{children}</div>
    </div>
  );
}
