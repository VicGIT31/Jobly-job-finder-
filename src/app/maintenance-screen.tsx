import Link from "next/link";
import { JoblyMark } from "@/components/brand/jobly-logo";

/**
 * Écran affiché aux visiteurs quand le mode maintenance est activé depuis
 * `/admin/parametres`. Les administrateurs, eux, continuent de voir le site.
 */
export function MaintenanceScreen({ message }: { message: string }) {
  return (
    <div className="container-page relative isolate flex min-h-[80vh] flex-col items-center justify-center py-20 text-center">
      <div
        aria-hidden="true"
        className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black,transparent)]"
      />
      <JoblyMark size="lg" />
      <p className="eyebrow mt-8">Maintenance en cours</p>
      <h1 className="mt-4 text-display-sm font-semibold">
        On revient <span className="serif-accent text-accent">très vite</span>.
      </h1>
      <p className="mt-4 max-w-md text-ink/60">{message}</p>
      <Link href="/connexion" className="btn-outline btn-sm mt-9">
        Espace administrateur
      </Link>
    </div>
  );
}
