import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings, publicBaseUrl } from "@/lib/settings";
import { Field, SectionTitle, StatCard, Switch } from "@/components/admin/ui";
import { saveSeoSettings } from "@/server/admin/actions";

export const metadata: Metadata = { title: "Admin — SEO" };

/**
 * Réglages de référencement. Ce qui est saisi ici alimente réellement le rendu :
 * les métadonnées globales (`app/layout.tsx`), `robots.txt` et `sitemap.xml`.
 */
export default async function AdminSeoPage() {
  const [seo, activeOffers, companies] = await Promise.all([
    getSettings("seo"),
    prisma.jobOffer.count({ where: { status: "ACTIVE" } }),
    prisma.company.count(),
  ]);

  const base = publicBaseUrl(seo);
  // 3 pages fixes (accueil, offres, entreprises) + une par offre et par entreprise.
  const sitemapUrls = 3 + activeOffers + companies;

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="URLs dans le sitemap" value={sitemapUrls} tone="accent" />
        <StatCard label="Offres indexables" value={activeOffers} />
        <StatCard
          label="Indexation"
          value={seo.indexable ? "Ouverte" : "Bloquée"}
          tone={seo.indexable ? "neutral" : "warn"}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <Link
          href="/robots.txt"
          className="font-semibold text-cobalt underline-offset-4 hover:underline"
        >
          Voir robots.txt →
        </Link>
        <Link
          href="/sitemap.xml"
          className="font-semibold text-cobalt underline-offset-4 hover:underline"
        >
          Voir sitemap.xml →
        </Link>
      </div>

      <form action={saveSeoSettings} className="mt-8 flex flex-col gap-8">
        <section aria-labelledby="identite">
          <SectionTitle
            id="identite"
            title="Identité et titres"
            description="Ce que voient les moteurs de recherche et les réseaux sociaux."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field required name="siteName" label="Nom du site" defaultValue={seo.siteName} />
            <Field
              name="titleTemplate"
              required
              label="Gabarit de titre"
              defaultValue={seo.titleTemplate}
              hint="« %s » est remplacé par le titre de la page."
            />
            <div className="sm:col-span-2">
              <Field
                name="defaultTitle"
                required
                label="Titre par défaut (accueil)"
                defaultValue={seo.defaultTitle}
                hint="Idéalement 50 à 60 caractères."
              />
            </div>
            <div className="sm:col-span-2">
              <Field
                name="description"
                required
                label="Méta-description"
                defaultValue={seo.description}
                rows={3}
                hint="Idéalement 120 à 160 caractères."
              />
            </div>
            <div className="sm:col-span-2">
              <Field
                name="keywords"
                label="Mots-clés"
                defaultValue={seo.keywords}
                hint="Séparés par des virgules. Impact faible, mais sans risque."
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="indexation">
          <SectionTitle
            id="indexation"
            title="Indexation et robots"
            description="Contrôle de ce que les robots ont le droit d'explorer."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Switch
                name="indexable"
                label="Autoriser l'indexation du site"
                defaultChecked={seo.indexable}
                hint="Décoché : « noindex, nofollow » global et robots.txt fermé. À utiliser en pré-production."
              />
            </div>
            <Field
              name="canonicalUrl"
              label="URL canonique"
              defaultValue={seo.canonicalUrl}
              placeholder={base}
              hint={`Vide = ${base} (variable NEXT_PUBLIC_APP_URL).`}
            />
            <Field
              name="twitterHandle"
              label="Compte X / Twitter"
              defaultValue={seo.twitterHandle}
              placeholder="@jobly"
            />
            <div className="sm:col-span-2">
              <Field
                name="robotsDisallow"
                label="Chemins interdits aux robots"
                defaultValue={seo.robotsDisallow}
                rows={5}
                hint="Un chemin par ligne, tel qu'écrit dans robots.txt."
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="verification">
          <SectionTitle
            id="verification"
            title="Vérification de propriété"
            description="Balises meta demandées par les consoles de recherche."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="googleSiteVerification"
              label="Google Search Console"
              defaultValue={seo.googleSiteVerification}
              placeholder="jeton google-site-verification"
            />
            <Field
              name="bingSiteVerification"
              label="Bing Webmaster Tools"
              defaultValue={seo.bingSiteVerification}
              placeholder="jeton msvalidate.01"
            />
          </div>
        </section>

        <div>
          <button type="submit" className="btn-cobalt">
            Enregistrer les réglages SEO
          </button>
        </div>
      </form>
    </div>
  );
}
