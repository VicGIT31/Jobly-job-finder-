import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StatusScreen } from "@/components/ui/status-screen";

export default function NotFound() {
  return (
    <StatusScreen
      code="404"
      eyebrow="Page introuvable"
      title={
        <>
          Cette page a pris <span className="serif-accent text-accent">un autre chemin</span>.
        </>
      }
      actions={
        <>
          <Link href="/" className="btn-outline">
            Accueil
          </Link>
          <Link href="/offres" className="btn-cobalt">
            Voir les offres <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </>
      }
    >
      Elle n&apos;existe pas ou n&apos;existe plus. Les offres, elles, sont bien là.
    </StatusScreen>
  );
}
