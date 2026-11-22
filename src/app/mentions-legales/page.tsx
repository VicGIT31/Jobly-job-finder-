import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Mentions légales",
};

export const dynamic = "force-dynamic";

export default async function MentionsLegalesPage() {
  // Adresse de contact modifiable depuis `/admin/parametres`.
  const { contactEmail } = await getSettings("general");

  return (
    <div className="container-page max-w-3xl pb-8 pt-12 sm:pt-16">
      <p className="eyebrow">Informations</p>
      <h1 className="mt-3 text-display-sm font-semibold">
        Mentions <span className="serif-accent">légales</span>
      </h1>

      <div className="mt-12 space-y-10 text-[15px] leading-[1.75] text-ink/75">
        <section>
          <h2 className="border-t border-line pt-6 text-lg font-semibold tracking-tight text-ink">
            Éditeur
          </h2>
          <p className="mt-2">
            Jobly est une application de recherche d’emploi. Adresse de contact configurée pour cette installation : {contactEmail}.
          </p>
        </section>

        <section>
          <h2 className="border-t border-line pt-6 text-lg font-semibold tracking-tight text-ink">
            Hébergement
          </h2>
          <p className="mt-2">
            Dans l’application de bureau, la base, l’index de recherche et les fichiers sont stockés sur votre ordinateur.
            L’édition de développement peut être hébergée localement dans Docker.
          </p>
        </section>

        <section>
          <h2 className="border-t border-line pt-6 text-lg font-semibold tracking-tight text-ink">
            Nature du service
          </h2>
          <p className="mt-2">
            Jobly est un agrégateur : les offres d'emploi affichées proviennent de sites tiers (la «
            source » est mentionnée sur chaque offre). Jobly n'héberge aucune candidature : le
            bouton « Postuler » redirige systématiquement vers le site source. Jobly n'est pas
            responsable du contenu des offres ni de leur disponibilité sur les sites sources.
          </p>
        </section>

        <section>
          <h2 className="border-t border-line pt-6 text-lg font-semibold tracking-tight text-ink">
            Données personnelles
          </h2>
          <p className="mt-2">
            Le profil, les CV, les offres sauvegardées, les recherches et le suivi des candidatures sont conservés localement dans l’édition de bureau.
            Les sauvegardes exportées peuvent contenir ces informations. Si vous activez les alertes par e-mail, l’envoi utilise la messagerie que vous avez configurée.
          </p>
        </section>

        <section>
          <h2 className="border-t border-line pt-6 text-lg font-semibold tracking-tight text-ink">
            Assistant de classement
          </h2>
          <p className="mt-2">
            Si vous sélectionnez GitHub Copilot, Jobly transmet de courts extraits d’annonces au fournisseur choisi via GitHub. Ollama traite ces extraits sur votre ordinateur.
            Votre CV, votre profil, vos favoris et vos notes sont exclus des requêtes de classement. Vous pouvez changer de modèle ou désactiver l’assistant à tout moment.
          </p>
        </section>
      </div>
    </div>
  );
}
