import Link from "next/link";
import { Bell, KanbanSquare, MousePointerClick } from "lucide-react";
import { JoblyMark } from "@/components/brand/jobly-logo";

const PERKS = [
  { icon: Bell, text: "Des alertes email sur vos recherches" },
  { icon: KanbanSquare, text: "Un tableau de suivi de vos candidatures" },
  { icon: MousePointerClick, text: "Toujours postuler sur l'annonce d'origine" },
];

/**
 * Gabarit des écrans d'authentification : panneau de marque (desktop) +
 * formulaire centré. Le titre reste le `<h1>` de la page.
 */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container-page py-10 sm:py-16">
      <div className="mx-auto grid max-w-5xl grid-cols-1 overflow-hidden rounded-3xl border border-line bg-paper shadow-lift lg:grid-cols-[1fr_1.05fr]">
        <aside className="surface-night relative hidden overflow-hidden p-10 lg:flex lg:flex-col">
          <div
            aria-hidden="true"
            className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-accent/40 blur-[100px]"
          />
          <div
            aria-hidden="true"
            className="absolute -right-16 top-10 h-48 w-48 rounded-full bg-volt/20 blur-[80px]"
          />
          <Link href="/" className="relative w-fit rounded-lg" aria-label="Jobly — accueil">
            <JoblyMark size="md" />
          </Link>
          <p className="relative mt-auto text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.045em]">
            Votre première expérience tech{" "}
            <span className="serif-accent text-volt">commence ici.</span>
          </p>
          <ul className="relative mt-8 space-y-3.5">
            {PERKS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/70">
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-white/5">
                  <Icon aria-hidden="true" size={15} className="text-volt" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </aside>

        <div className="p-6 sm:p-10 lg:p-12">
          <h1 className="text-3xl font-semibold tracking-[-0.035em]">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-ink/60">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
