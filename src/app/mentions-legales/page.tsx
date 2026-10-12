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
            Jobly — projet de démonstration. 42 rue de l'Exemple, 75000 Paris. Directeur de la
            publication : Jobly. Contact : {contactEmail}.
          </p>
        </section>

        <section>
          <h2 className="border-t border-line pt-6 text-lg font-semibold tracking-tight text-ink">
            Hébergement
          </h2>
          <p className="mt-2">
            Application auto-hébergée (Docker). Base de données PostgreSQL, moteur de recherche
            Meilisearch, stockage S3-compatible.
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
            Les comptes candidats stockent : email, nom, école, année de diplôme, CV (fichier PDF),
            offres sauvegardées, alertes et historique de clics « Postuler ». Ces données servent
            uniquement au fonctionnement du service (espace personnel, alertes email). Vous pouvez
            demander la suppression de votre compte et de vos données à tout moment : {contactEmail}
            . Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et
            d'effacement.
          </p>
        </section>

        <section>
          <h2 className="border-t border-line pt-6 text-lg font-semibold tracking-tight text-ink">
            Cookies
          </h2>
          <p className="mt-2">
            Jobly utilise uniquement des cookies techniques de session (authentification). Aucun
            cookie publicitaire ou de mesure d'audience tierce n'est déposé.
          </p>
        </section>
      </div>
    </div>
  );
}
