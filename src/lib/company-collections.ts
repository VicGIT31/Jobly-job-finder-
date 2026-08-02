import { prisma } from "@/lib/prisma";

/**
 * Vitrines d'entreprises de la page d'accueil : GAFAM, fleurons tech français,
 * licornes françaises.
 *
 * Les fiches entreprises sont créées automatiquement à l'ingestion, à partir du
 * nom que porte l'annonce : on trouve donc « Capgemini », « Capgemini Engineering »
 * et « Capgemini Invent », ou encore « OVHcloud » et « Amazon Web Services (AWS) ».
 * Une liste de slugs exacts raterait la moitié des offres — chaque membre déclare
 * donc des **motifs** cherchés sur les segments du slug (`-`), ce qui évite aussi
 * les faux positifs (« meta » ne doit pas attraper « metallurgie »).
 */

export type CollectionKey = "gafam" | "tech-francaises" | "licornes";

type Member = {
  /** Nom affiché, indépendant de l'orthographe des annonces. */
  name: string;
  /** Segments de slug reconnus (comparés en entier, jamais en sous-chaîne). */
  patterns: string[];
  /**
   * Slugs à faire correspondre **en entier**, pour les noms courts et ambigus.
   * « alan » en segment attraperait « Alan Allman Associates », une ESN qui
   * n'est pas la licorne Alan : ces cas-là exigent l'égalité stricte.
   */
  exact?: string[];
};

export type Collection = {
  key: CollectionKey;
  label: string;
  tagline: string;
  icon: string;
  members: Member[];
};

export const COLLECTIONS: Collection[] = [
  {
    key: "gafam",
    label: "GAFAM",
    tagline: "Les géants américains qui recrutent en France",
    icon: "🌍",
    members: [
      { name: "Google", patterns: ["google", "alphabet", "youtube", "deepmind"] },
      { name: "Amazon", patterns: ["amazon", "aws", "audible", "twitch"] },
      { name: "Apple", patterns: ["apple"] },
      { name: "Meta", patterns: ["facebook", "instagram", "whatsapp"], exact: ["meta"] },
      { name: "Microsoft", patterns: ["microsoft", "linkedin", "github", "azure"] },
    ],
  },
  {
    key: "tech-francaises",
    label: "Top 10 tech françaises",
    tagline: "Les poids lourds du numérique français",
    icon: "🇫🇷",
    members: [
      { name: "Capgemini", patterns: ["capgemini"] },
      { name: "Thales", patterns: ["thales"] },
      { name: "Dassault Systèmes", patterns: ["dassault"] },
      { name: "Atos", patterns: ["atos", "eviden"] },
      { name: "Sopra Steria", patterns: ["sopra", "steria"] },
      { name: "Orange", patterns: ["orange"] },
      { name: "OVHcloud", patterns: ["ovh", "ovhcloud"] },
      { name: "Ubisoft", patterns: ["ubisoft"] },
      { name: "Criteo", patterns: ["criteo"] },
      { name: "Worldline", patterns: ["worldline", "ingenico"] },
    ],
  },
  {
    key: "licornes",
    label: "Licornes françaises",
    tagline: "Les start-up françaises valorisées à plus d'un milliard",
    icon: "🦄",
    members: [
      { name: "Doctolib", patterns: ["doctolib"] },
      { name: "BlaBlaCar", patterns: ["blablacar"] },
      { name: "Back Market", patterns: ["backmarket", "back-market"] },
      { name: "Contentsquare", patterns: ["contentsquare"] },
      { name: "Dataiku", patterns: ["dataiku"] },
      { name: "Mirakl", patterns: ["mirakl"] },
      { name: "Qonto", patterns: ["qonto"] },
      { name: "Alan", patterns: [], exact: ["alan"] },
      { name: "Ledger", patterns: [], exact: ["ledger"] },
      { name: "Swile", patterns: ["swile"] },
      { name: "PayFit", patterns: ["payfit"] },
      { name: "Ankorstore", patterns: ["ankorstore"] },
      { name: "Exotec", patterns: ["exotec"] },
      { name: "Vestiaire Collective", patterns: ["vestiaire"] },
      { name: "Sorare", patterns: ["sorare"] },
      { name: "ManoMano", patterns: ["manomano"] },
      { name: "Veepee", patterns: ["veepee", "vente-privee"] },
      { name: "Voodoo", patterns: ["voodoo"] },
      { name: "Spendesk", patterns: ["spendesk"] },
      { name: "Aircall", patterns: ["aircall"] },
      { name: "Pennylane", patterns: ["pennylane"] },
      { name: "Younited", patterns: ["younited"] },
      { name: "Ivalua", patterns: ["ivalua"] },
      { name: "Shift Technology", patterns: ["shift-technology"] },
      { name: "Deezer", patterns: ["deezer"] },
      { name: "Lydia", patterns: ["lydia"] },
      { name: "Scaleway", patterns: ["scaleway"] },
    ],
  },
];

export type CollectionCompany = {
  slug: string;
  name: string;
  logoUrl: string | null;
  offerCount: number;
};

export type ResolvedCollection = Collection & {
  companies: CollectionCompany[];
  totalOffers: number;
};

/**
 * « Back Market » est ingéré tantôt en `back-market`, tantôt en `backmarket` :
 * on compare segment par segment, plus la concaténation complète du slug.
 */
function matchesMember(slug: string, member: Member): boolean {
  if (member.exact?.includes(slug)) return true;
  const segments = slug.split("-");
  const collapsed = segments.join("");
  return member.patterns.some(
    (pattern) =>
      segments.includes(pattern) ||
      collapsed === pattern ||
      // Motif en deux mots (« vente-privee ») : cherché tel quel dans le slug.
      (pattern.includes("-") && slug.includes(pattern)),
  );
}

/**
 * Résout les collections contre la base : une entreprise n'apparaît que si elle
 * a au moins une offre active. Une vitrine sans offre est masquée plutôt que
 * d'afficher des logos qui ne mènent nulle part.
 */
export async function resolveCollections(): Promise<ResolvedCollection[]> {
  const companies = await prisma.company.findMany({
    where: { offers: { some: { status: "ACTIVE" } } },
    select: {
      slug: true,
      name: true,
      logoUrl: true,
      _count: { select: { offers: { where: { status: "ACTIVE" } } } },
    },
  });

  return COLLECTIONS.map((collection) => {
    const matched: CollectionCompany[] = [];

    for (const company of companies) {
      if (!collection.members.some((member) => matchesMember(company.slug, member))) continue;
      matched.push({
        slug: company.slug,
        name: company.name,
        logoUrl: company.logoUrl,
        offerCount: company._count.offers,
      });
    }

    matched.sort((a, b) => b.offerCount - a.offerCount || a.name.localeCompare(b.name));

    return {
      ...collection,
      companies: matched,
      totalOffers: matched.reduce((sum, c) => sum + c.offerCount, 0),
    };
  }).filter((collection) => collection.companies.length > 0);
}
