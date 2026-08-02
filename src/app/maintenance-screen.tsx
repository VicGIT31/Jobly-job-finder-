import Link from "next/link";
import { JoblyMark } from "@/components/brand/jobly-logo";

/**
 * Écran affiché aux visiteurs quand le mode maintenance est activé depuis
 * `/admin/parametres`. Les administrateurs, eux, continuent de voir le site.
 */
export function MaintenanceScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <JoblyMark size="lg" />
      <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">
        Jobly<span className="text-cobalt">.</span>
      </h1>
      <p className="mt-4 max-w-md text-ink/70">{message}</p>
      <Link href="/connexion" className="btn-outline mt-8 !min-h-[40px] !px-4 !py-1.5 text-sm">
        Espace administrateur
      </Link>
    </div>
  );
}
