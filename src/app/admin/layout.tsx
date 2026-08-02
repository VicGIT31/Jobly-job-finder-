import Link from "next/link";
import { JoblyMark } from "@/components/brand/jobly-logo";
import { requireAdminPage } from "@/server/admin/guard";
import { AdminNav } from "./admin-nav";

export const dynamic = "force-dynamic";

/**
 * Coque du panneau d'administration. L'accès est refermé ici pour **toutes** les
 * pages `/admin/*` : rôle revalidé en base à chaque rendu (voir `guard.ts`),
 * jamais uniquement sur la foi du JWT.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <JoblyMark size="md" />
          <div>
            <h1 className="font-display text-2xl font-bold leading-none tracking-tight">
              Console d&apos;administration
            </h1>
            <p className="mt-1 text-xs text-ink/55">
              Connecté en tant que {admin.name ?? admin.email}
            </p>
          </div>
        </div>
        <Link href="/" className="btn-outline !min-h-[38px] !px-4 !py-1.5 text-sm">
          ← Retour au site
        </Link>
      </div>

      <AdminNav />

      <div className="mt-6">{children}</div>
    </div>
  );
}
