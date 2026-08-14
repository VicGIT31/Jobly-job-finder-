import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DeleteAccountButton } from "@/components/account/delete-account-button";

export const metadata: Metadata = { title: "Confidentialité" };
export const dynamic = "force-dynamic";

export default async function ConfidentialitePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?callbackUrl=/mon-espace/confidentialite");

  return (
    <section aria-labelledby="confidentialite-titre">
      <h2 id="confidentialite-titre" className="font-display text-xl font-bold">
        Confidentialité
      </h2>
      <p className="mt-1 text-sm text-ink/60">
        Vos données vous appartiennent : téléchargez-les ou supprimez votre compte à tout moment.
      </p>

      <div className="card mt-4 p-5">
        <h3 className="font-display text-lg font-bold">Télécharger mes données</h3>
        <p className="mt-1 text-sm text-ink/60">
          Un fichier JSON avec votre profil, vos candidatures, vos offres sauvegardées/masquées et
          vos recherches sauvegardées. Ne contient pas les offres elles-mêmes (données publiques),
          seulement votre lien à ces offres.
        </p>
        <a href="/api/mon-espace/export" className="btn-outline mt-3">
          Télécharger mes données (JSON)
        </a>
      </div>

      <div className="card mt-4 border-red-200 p-5 dark:border-red-900">
        <h3 className="font-display text-lg font-bold text-red-600">Zone dangereuse</h3>
        <p className="mt-1 text-sm text-ink/60">
          Supprime définitivement votre compte, votre CV, vos candidatures, vos offres
          sauvegardées/masquées et vos recherches sauvegardées. Aucune période de grâce : la
          suppression est immédiate et irréversible.
        </p>
        <div className="mt-3">
          <DeleteAccountButton />
        </div>
      </div>
    </section>
  );
}
