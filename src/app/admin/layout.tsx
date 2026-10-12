import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
    <div className="container-page py-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <JoblyMark size="md" />
          <div className="min-w-0">
            <p className="eyebrow">Administration</p>
            <h1 className="mt-1 text-2xl font-semibold leading-none tracking-tight">Console</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden items-center gap-2 text-xs text-ink/60 sm:flex">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />
            Connecté en tant que{" "}
            <span className="max-w-[220px] truncate font-medium text-ink/80">
              {admin.name ?? admin.email}
            </span>
          </p>
          <Link href="/" className="btn-outline btn-sm">
            <ArrowLeft aria-hidden="true" size={15} />
            Retour au site
          </Link>
        </div>
      </div>
      <p className="mt-2 truncate text-xs text-ink/60 sm:hidden">
        Connecté en tant que {admin.name ?? admin.email}
      </p>

      <AdminNav />

      <div className="mt-8">{children}</div>
    </div>
  );
}
