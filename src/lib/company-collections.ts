/**
 * Vitrines et filtres d'entreprises : GAFAM/Big Tech, fleurons tech français,
 * licornes françaises, fintech, deep tech, grande distribution.
 *
 * Les fiches entreprises sont créées automatiquement à l'ingestion, à partir du
 * nom que porte l'annonce : on trouve donc « Capgemini », « Capgemini Engineering »
 * et « Capgemini Invent », ou encore « OVHcloud » et « Amazon Web Services (AWS) ».
 * Une liste de slugs exacts raterait la moitié des offres — chaque membre déclare
 * donc des **motifs** cherchés sur les segments du slug (`-`), ce qui évite aussi
 * les faux positifs (« meta » ne doit pas attraper « metallurgie »).
 *
 * Fichier volontairement sans dépendance serveur (pas de `prisma`) : consommé
 * à la fois par des composants client (`facet-panel.tsx`, filtre de recherche)
 * et par le résolveur serveur (`@/server/companies/collections`).
 */

export type CollectionKey =
  | "gafam"
  | "tech-francaises"
  | "licornes"
  | "fintech"
  | "deep-tech"
  | "grande-distribution"
  | "sante-animale"
  | "protection-animale";

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
    label: "Big Tech",
    tagline: "Les géants américains qui recrutent en France",
    icon: "🌍",
    members: [
      { name: "Google", patterns: ["google", "alphabet", "youtube", "deepmind"] },
      { name: "Amazon", patterns: ["amazon", "aws", "audible", "twitch"] },
      { name: "Apple", patterns: ["apple"] },
      { name: "Meta", patterns: ["facebook", "instagram", "whatsapp"], exact: ["meta"] },
      { name: "Microsoft", patterns: ["microsoft", "linkedin", "github", "azure"] },
      { name: "Netflix", patterns: ["netflix"] },
      { name: "Nvidia", patterns: ["nvidia"] },
      { name: "Salesforce", patterns: ["salesforce"] },
      { name: "Oracle", patterns: ["oracle"] },
      { name: "IBM", patterns: [], exact: ["ibm"] },
      { name: "Adobe", patterns: ["adobe"] },
      { name: "Cisco", patterns: ["cisco"] },
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
  {
    key: "fintech",
    label: "Fintech",
    tagline: "Banques nouvelle génération, paiement, gestion financière",
    icon: "💳",
    members: [
      { name: "N26", patterns: [], exact: ["n26"] },
      { name: "Wise", patterns: [], exact: ["wise"] },
      { name: "Plaid", patterns: ["plaid"] },
      { name: "Ramp", patterns: [], exact: ["ramp"] },
      { name: "Qonto", patterns: ["qonto"] },
      { name: "Alan", patterns: [], exact: ["alan"] },
      { name: "Lydia", patterns: ["lydia"] },
      { name: "PayFit", patterns: ["payfit"] },
      { name: "Spendesk", patterns: ["spendesk"] },
      { name: "Pennylane", patterns: ["pennylane"] },
      { name: "Younited", patterns: ["younited"] },
      { name: "Ledger", patterns: [], exact: ["ledger"] },
      { name: "Boursorama", patterns: ["boursorama"] },
      { name: "BNP Paribas", patterns: ["bnp", "bnp-paribas"] },
      { name: "Natixis", patterns: ["natixis"] },
      { name: "Crédit Agricole", patterns: ["credit-agricole"] },
      { name: "Worldline", patterns: ["worldline", "ingenico"] },
    ],
  },
  {
    key: "deep-tech",
    label: "Deep Tech",
    tagline: "IA, robotique, aérospatial : la recherche appliquée à grande échelle",
    icon: "🔬",
    members: [
      { name: "OpenAI", patterns: ["openai"] },
      { name: "Exotec", patterns: ["exotec"] },
      { name: "Dataiku", patterns: ["dataiku"] },
      { name: "Dassault Systèmes", patterns: ["dassault"] },
      { name: "Thales", patterns: ["thales"] },
      { name: "Safran", patterns: ["safran"] },
      { name: "CEA", patterns: [], exact: ["cea"] },
      { name: "Scaleway", patterns: ["scaleway"] },
    ],
  },
  {
    key: "grande-distribution",
    label: "Grande distribution",
    tagline: "Retail et e-commerce à grande échelle",
    icon: "🛒",
    members: [
      { name: "Decathlon", patterns: ["decathlon"] },
      { name: "Carrefour", patterns: ["carrefour"] },
      { name: "Auchan", patterns: ["auchan"] },
      { name: "Back Market", patterns: ["backmarket", "back-market"] },
      { name: "ManoMano", patterns: ["manomano"] },
      { name: "Veepee", patterns: ["veepee", "vente-privee"] },
      { name: "Vestiaire Collective", patterns: ["vestiaire"] },
      { name: "JYSK", patterns: ["jysk"] },
      { name: "METRO", patterns: ["metro"], exact: ["metro-france"] },
      { name: "Maxi Zoo", patterns: ["maxi-zoo"] },
      { name: "Animalis", patterns: ["animalis"] },
    ],
  },
  {
    key: "sante-animale",
    label: "Cliniques & groupes vétérinaires",
    tagline: "Les structures qui recrutent des ASV partout en France",
    icon: "🩺",
    members: [
      { name: "AniCura", patterns: ["anicura"] },
      { name: "Sevetys", patterns: ["sevetys"] },
      { name: "Mon Véto", patterns: ["monveto", "mon-veto"] },
      { name: "Argos Vétérinaire", patterns: ["argos-veterinaire"] },
      { name: "IVC Evidensia", patterns: ["evidensia", "ivc-evidensia"] },
      { name: "Vetopartners", patterns: ["vetopartners"] },
      { name: "Cliniques vétérinaires", patterns: ["clinique-veterinaire", "cabinet-veterinaire", "hopital-veterinaire"] },
    ],
  },
  {
    key: "protection-animale",
    label: "Refuges & protection animale",
    tagline: "SPA, associations et refuges qui recrutent des soigneurs et agents",
    icon: "🐾",
    members: [
      { name: "SPA", patterns: ["spa"], exact: ["societe-protectrice-des-animaux"] },
      { name: "30 Millions d'Amis", patterns: ["30-millions-d-amis"] },
      { name: "Fondation Brigitte Bardot", patterns: ["brigitte-bardot"] },
      { name: "Refuges", patterns: ["refuge"] },
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
export function matchesMember(slug: string, member: Member): boolean {
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

/** L'entreprise identifiée par ce slug appartient-elle à cette collection ? */
export function slugMatchesCollection(slug: string, collection: Collection): boolean {
  return collection.members.some((member) => matchesMember(slug, member));
}
