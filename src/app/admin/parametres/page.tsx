import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { Field, SectionTitle, Switch } from "@/components/admin/ui";
import { saveGeneralSettings, saveIngestionSettings } from "@/server/admin/actions";

export const metadata: Metadata = { title: "Admin — Paramètres" };

/** Réglages généraux du site et pilotage de l'ingestion. */
export default async function AdminSettingsPage() {
  const [general, ingestion] = await Promise.all([
    getSettings("general"),
    getSettings("ingestion"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <form action={saveGeneralSettings} className="panel">
        <SectionTitle
          id="general"
          title="Site"
          description="Contenu de marque et disponibilité du service."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field
              name="tagline"
              label="Accroche"
              defaultValue={general.tagline}
              hint="Affichée dans le pied de page."
            />
          </div>
          <Field
            name="contactEmail"
            label="Email de contact"
            defaultValue={general.contactEmail}
            type="email"
          />
          <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2">
            <Switch
              name="registrationOpen"
              label="Inscriptions ouvertes"
              defaultChecked={general.registrationOpen}
              hint="Décoché : le formulaire d'inscription est masqué et l'action refusée côté serveur."
            />
            <Switch
              name="maintenanceMode"
              label="Mode maintenance"
              defaultChecked={general.maintenanceMode}
              hint="Décoché : site normal. Coché : seuls les administrateurs accèdent au site."
            />
          </div>
          <div className="sm:col-span-2">
            <Field
              name="maintenanceMessage"
              label="Message de maintenance"
              defaultValue={general.maintenanceMessage}
              rows={2}
            />
          </div>
        </div>
        <button type="submit" className="btn-cobalt mt-5">
          Enregistrer les paramètres du site
        </button>
      </form>

      <form action={saveIngestionSettings} className="panel">
        <SectionTitle
          id="ingestion"
          title="Ingestion des offres"
          description="Durée de vie des offres et activation des cycles automatiques."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            name="freshnessDays"
            label="Expiration (jours sans être revue)"
            defaultValue={ingestion.freshnessDays}
            type="number"
            hint="Une offre que le scraping ne retrouve plus passe en « expirée » après ce délai."
          />
          <Field
            name="maxAgeDays"
            label="Purge définitive (jours depuis publication)"
            defaultValue={ingestion.maxAgeDays}
            type="number"
            hint="Au-delà, l'offre est supprimée de la base et de l'index."
          />
          <div className="sm:col-span-2">
            <Switch
              name="ingestionEnabled"
              label="Ingestion automatique activée"
              defaultChecked={ingestion.ingestionEnabled}
              hint="Décoché : les cycles programmés sont ignorés. Le lancement manuel reste possible depuis le tableau de bord."
            />
          </div>
        </div>
        <button type="submit" className="btn-cobalt mt-5">
          Enregistrer les paramètres d&apos;ingestion
        </button>
      </form>
    </div>
  );
}
