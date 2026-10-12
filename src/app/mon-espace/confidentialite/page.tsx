import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DeleteAccountButton } from "@/components/account/delete-account-button";
import { Download, ShieldAlert } from "lucide-react";
import { SectionHeader } from "@/components/account/section-header";

export const metadata: Metadata = { title: "Confidentialité" };
export const dynamic = "force-dynamic";

export default async function ConfidentialitePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?callbackUrl=/mon-espace/confidentialite");

  return (
    <section aria-labelledby="confidentialite-titre">
      <SectionHeader
        id="confidentialite-titre"
        title="Confidentialité"
        description="Vos données vous appartiennent : téléchargez-les ou supprimez votre compte à tout moment."
      />

      <div className="panel mt-6 flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          <Download aria-hidden="true" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold tracking-tight">Télécharger mes données</h3>
          <p className="mt-1 text-sm text-ink/60">
            Un fichier JSON avec votre profil, vos candidatures, vos offres sauvegardées/masquées et
            vos recherches sauvegardées. Ne contient pas les offres elles-mêmes (données publiques),
            seulement votre lien à ces offres.
          </p>
          <a href="/api/mon-espace/export" className="btn-outline btn-sm mt-4">
            <Download aria-hidden="true" size={14} />
            Télécharger mes données (JSON)
          </a>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-danger/30 bg-danger-soft/40 p-5 sm:flex-row sm:items-start sm:p-6">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger">
          <ShieldAlert aria-hidden="true" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold tracking-tight text-danger">Zone dangereuse</h3>
          <p className="mt-1 text-sm text-ink/65">
            Supprime définitivement votre compte, votre CV, vos candidatures, vos offres
            sauvegardées/masquées et vos recherches sauvegardées. Aucune période de grâce : la
            suppression est immédiate et irréversible.
          </p>
          <div className="mt-4">
            <DeleteAccountButton />
          </div>
        </div>
      </div>
    </section>
  );
}
