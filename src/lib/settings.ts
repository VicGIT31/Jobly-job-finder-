import { z } from "zod";
import { prisma } from "@/lib/prisma";

/**
 * Réglages du site, pilotés depuis `/admin` et stockés dans `site_settings`
 * (une ligne par groupe, valeur JSON). Chaque groupe a un schéma Zod dont les
 * `default()` font office de valeurs d'usine : une base vierge se comporte
 * exactement comme avant l'introduction du panneau, et ajouter un réglage ne
 * demande pas de migration.
 *
 * Lecture volontairement tolérante : si la valeur stockée est corrompue ou
 * périmée (champ renommé), on retombe sur les défauts plutôt que de casser le
 * rendu public.
 */

export const seoSettingsSchema = z.object({
  siteName: z.string().trim().min(1).max(60).default("Jobly"),
  defaultTitle: z
    .string()
    .trim()
    .min(1)
    .max(140)
    .default("Jobly — Offres d’emploi en France"),
  titleTemplate: z.string().trim().min(1).max(80).default("%s · Jobly"),
  description: z
    .string()
    .trim()
    .min(1)
    .max(320)
    .default(
      "Jobly rassemble des offres d’emploi, de stage et d’alternance en France et vous redirige vers les annonces d’origine.",
    ),
  keywords: z.string().trim().max(400).default("emploi, stage, alternance, France"),
  /** Domaine canonique public (vide = `NEXT_PUBLIC_APP_URL`). */
  canonicalUrl: z.string().trim().max(200).default(""),
  /** `false` → `noindex, nofollow` global + robots.txt fermé (pré-production). */
  indexable: z.boolean().default(true),
  googleSiteVerification: z.string().trim().max(200).default(""),
  bingSiteVerification: z.string().trim().max(200).default(""),
  twitterHandle: z.string().trim().max(40).default(""),
  /** Chemins interdits aux robots, un par ligne. */
  robotsDisallow: z
    .string()
    .trim()
    .max(1000)
    .default("/go/\n/mon-espace\n/admin\n/api/\n/internal/"),
});

export const generalSettingsSchema = z.object({
  tagline: z.string().trim().max(200).default("Le job board qui vous ramène toujours à la source."),
  contactEmail: z.string().trim().max(120).default("contact@jobly.example"),
  /** Coupe le site pour les visiteurs ; les administrateurs gardent l'accès. */
  maintenanceMode: z.boolean().default(false),
  maintenanceMessage: z
    .string()
    .trim()
    .max(300)
    .default("Jobly est en maintenance, le service revient dans quelques minutes."),
  /** `false` → l'inscription est fermée (formulaire masqué et action refusée). */
  registrationOpen: z.boolean().default(true),
});

export const ingestionSettingsSchema = z.object({
  /** Offre non revue depuis X jours → EXPIRED. */
  freshnessDays: z.coerce.number().int().min(1).max(120).default(7),
  /** Offre publiée il y a plus de X jours → supprimée définitivement. */
  maxAgeDays: z.coerce.number().int().min(7).max(365).default(60),
  /** `false` → les cycles d'ingestion automatiques sont suspendus. */
  ingestionEnabled: z.boolean().default(true),
});

export type SeoSettings = z.infer<typeof seoSettingsSchema>;
export type GeneralSettings = z.infer<typeof generalSettingsSchema>;
export type IngestionSettings = z.infer<typeof ingestionSettingsSchema>;

const GROUPS = {
  seo: seoSettingsSchema,
  general: generalSettingsSchema,
  ingestion: ingestionSettingsSchema,
} as const;

export type SettingsGroup = keyof typeof GROUPS;

/** Valeurs d'usine d'un groupe (schéma appliqué à un objet vide). */
export function defaultSettings<G extends SettingsGroup>(group: G): z.infer<(typeof GROUPS)[G]> {
  return GROUPS[group].parse({}) as z.infer<(typeof GROUPS)[G]>;
}

/**
 * Lit un groupe de réglages. Les pages publiques appellent ceci à chaque rendu :
 * une seule ligne est lue par clé primaire, et l'échec (base indisponible,
 * migration pas encore appliquée) retombe silencieusement sur les défauts.
 */
export async function getSettings<G extends SettingsGroup>(
  group: G,
): Promise<z.infer<(typeof GROUPS)[G]>> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: group } });
    const parsed = GROUPS[group].safeParse(row?.value ?? {});
    return (parsed.success ? parsed.data : defaultSettings(group)) as z.infer<(typeof GROUPS)[G]>;
  } catch {
    return defaultSettings(group);
  }
}

/** Écrit un groupe de réglages (valeurs déjà validées par le schéma). */
export async function saveSettings<G extends SettingsGroup>(
  group: G,
  value: z.infer<(typeof GROUPS)[G]>,
  updatedBy: string | null,
): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key: group },
    update: { value, updatedBy },
    create: { key: group, value, updatedBy },
  });
}

/** URL publique de référence : réglage SEO s'il est renseigné, env sinon. */
export function publicBaseUrl(seo: Pick<SeoSettings, "canonicalUrl">): string {
  const configured = seo.canonicalUrl.replace(/\/+$/, "");
  if (configured) return configured;
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}
