/**
 * Vocabulaire métier partagé (client + serveur) : domaines, familles, libellés,
 * synonymes de recherche et heuristiques d'expérience. La classification d'une
 * offre elle-même vit côté serveur dans `server/ingest/job-classifier.ts`.
 */
export const NATIONAL_DOMAINS = {
  HEALTH: "Santé & social",
  CONSTRUCTION: "Bâtiment & travaux publics",
  INDUSTRY: "Industrie & maintenance",
  TRANSPORT: "Transport & logistique",
  EDUCATION: "Éducation & formation",
  AGRICULTURE: "Agriculture & environnement",
  PUBLIC_ADMIN: "Administration & droit",
  CULTURE: "Culture, sport & création",
  SERVICES: "Services & sécurité",
  OTHER: "Autres métiers",
} as const;
export const UNIVERSES = ["TECH", "COMMERCE", "FINANCE", "HOSPITALITY", "ASV",
  "HEALTH", "CONSTRUCTION", "INDUSTRY", "TRANSPORT", "EDUCATION", "AGRICULTURE",
  "PUBLIC_ADMIN", "CULTURE", "SERVICES", "OTHER",
] as const;
export type JobUniverse = (typeof UNIVERSES)[number];

export const UNIVERSE_LABELS: Record<JobUniverse, string> = {
  TECH: "Tech & informatique",
  COMMERCE: "Commerce, marketing & communication",
  FINANCE: "Assurance, banque & finance",
  HOSPITALITY: "Hôtellerie & restauration",
  ...NATIONAL_DOMAINS,
  ASV: "Vétérinaire & animalier",
};

export const UNIVERSE_SHORT_LABELS: Record<JobUniverse, string> = {
  TECH: "Tech",
  COMMERCE: "Commerce & marketing",
  FINANCE: "Assurance & finance",
  HOSPITALITY: "Hôtellerie & restauration",
  ...NATIONAL_DOMAINS,
  ASV: "ASV & animalier",
};

export const FAMILY_LABELS: Record<string, string> = {
  TECH: "Tech & informatique",
  SALES: "Vente & commercial",
  BUSINESS_DEVELOPMENT: "Développement commercial",
  CUSTOMER_SERVICE: "Relation client",
  RETAIL: "Commerce en magasin",
  MARKETING: "Marketing & digital",
  CATEGORY_MANAGER: "Category Manager",
  COMMUNICATION: "Communication",
  ASV: "Auxiliaire vétérinaire (ASV)",
  VET_SUPPORT: "Accueil & gestion de clinique vétérinaire",
  ANIMAL_CARE: "Soins animaliers, refuges & animalerie",
  INSURANCE: "Assurance · BTS Assurance",
  BANKING: "Banque & conseil bancaire",
  CORPORATE_FINANCE: "Finance & contrôle de gestion",
  ACCOUNTING: "Comptabilité",
  AUDIT_RISK: "Audit, risques & conformité",
  FINANCIAL_MARKETS: "Marchés financiers & investissement",
  BARISTA: "Barista & coffee shop",
  HOSPITALITY: "Hôtellerie & restauration",
  ...NATIONAL_DOMAINS,
  OTHER: "Autre métier",
};

/** Familles proposées au filtre « Métier » pour chaque domaine non tech. */
export const UNIVERSE_FAMILIES: Record<Exclude<JobUniverse, "TECH">, string[]> = {
  COMMERCE: [
    "SALES",
    "BUSINESS_DEVELOPMENT",
    "RETAIL",
    "CUSTOMER_SERVICE",
    "MARKETING",
    "CATEGORY_MANAGER",
    "COMMUNICATION",
  ],
  FINANCE: ["INSURANCE", "BANKING", "CORPORATE_FINANCE", "ACCOUNTING", "AUDIT_RISK", "FINANCIAL_MARKETS"],
  HOSPITALITY: ["BARISTA", "HOSPITALITY"],
  HEALTH: ["HEALTH"], CONSTRUCTION: ["CONSTRUCTION"], INDUSTRY: ["INDUSTRY"],
  TRANSPORT: ["TRANSPORT"], EDUCATION: ["EDUCATION"], AGRICULTURE: ["AGRICULTURE"],
  PUBLIC_ADMIN: ["PUBLIC_ADMIN"], CULTURE: ["CULTURE"], SERVICES: ["SERVICES"], OTHER: ["OTHER"],
  ASV: ["ASV", "VET_SUPPORT", "ANIMAL_CARE"],
};

export const EXPERIENCE_LABELS: Record<string, string> = {
  JUNIOR: "Débutant / junior",
  CONFIRMED: "Confirmé",
  SENIOR: "Senior / responsable",
  UNKNOWN: "Expérience non précisée",
};

/** Attributs déduits du texte de l'offre : jamais une certitude, un indice lisible. */
import { AI_TOPIC_LABELS } from "./ai-topics";
export const TAG_LABELS: Record<string, string> = {
  ...AI_TOPIC_LABELS,
  DEBUTANT_ACCEPTE: "Débutant accepté",
  ALTERNANCE_POSSIBLE: "Alternance possible",
  WEEKEND_GARDE: "Week-end, garde ou astreinte",
  URGENCES: "Urgences / permanence de soins",
  CANIN_FELIN: "Canine & féline",
  EQUIN: "Équine",
  RURAL: "Rurale & élevage",
  NAC: "NAC & exotiques",
  FAUNE_SAUVAGE: "Faune sauvage & zoo",
  REFUGE: "Refuge & protection animale",
  UNIVERS_ANIMALIER: "Univers animalier",
  FORMATION_ASSUREE: "Formation assurée",
};

export const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Intitulés reconnus par famille, après `fold`. Servent à classer un intitulé
 * (rôle décisif) et à rapprocher les synonymes d'une recherche (« ASV »,
 * « auxiliaire vétérinaire », « veterinary nurse »).
 */
export const VOCABULARY: Record<string, string[]> = {
  BARISTA: ["barista", "baristas", "coffee specialist", "employe coffee shop", "employee coffee shop", "preparateur cafe", "preparatrice cafe", "cafe de specialite"],
  INSURANCE: ["assurance", "assurances", "bts assurance", "bts assurances", "assureur", "insurance", "actuariel", "actuarielle", "etudes actuarielles", "souscription", "indemnisation", "gestionnaire prestations", "gestionnaire sinistres", "gestionnaire de sinistres", "souscripteur", "souscriptrice", "actuaire", "actuariat", "courtier en assurance", "courtage assurance", "gestionnaire indemnisation", "gestionnaire de contrats assurance"],
  BANKING: ["banque", "bancaire", "banking", "conseiller bancaire", "conseillere bancaire", "conseiller patrimonial", "conseillere patrimoniale", "gestion de patrimoine", "charge d accueil bancaire", "conseiller financier", "conseillere financiere"],
  CORPORATE_FINANCE: ["finance", "financier", "financiere", "financial analyst", "analyste financier", "analyste financiere", "financial controller", "controle de gestion", "controleur de gestion", "controleuse de gestion", "tresorerie", "tresorier", "treasury", "fp a", "corporate finance", "fusion acquisition", "m a"],
  ACCOUNTING: ["comptable", "comptabilite", "accountant", "accounting", "expertise comptable", "consolidation financiere"],
  AUDIT_RISK: ["audit financier", "auditeur financier", "audit interne", "auditeur interne", "risque de credit", "risques financiers", "conformite bancaire", "compliance officer", "lutte anti blanchiment", "kyc", "aml", "risk analyst", "analyste credit", "credit analyst", "risque bancaire", "risk management"],
  FINANCIAL_MARKETS: ["marches financiers", "asset management", "gestion d actifs", "private equity", "capital investissement", "analyste investissement", "investment analyst", "investment banking", "trading", "middle office", "back office titres", "sales trader", "portfolio manager", "gestionnaire de portefeuille"],
  ASV: [
    "asv",
    "avq",
    "auxiliaire veterinaire",
    "auxiliaire specialise veterinaire",
    "auxiliaire specialisee veterinaire",
    "auxiliaire de sante animale",
    "assistant veterinaire",
    "assistante veterinaire",
    "assistant de clinique veterinaire",
    "assistante de clinique veterinaire",
    "aide veterinaire",
    "infirmier veterinaire",
    "infirmiere veterinaire",
    "veterinary nurse",
    "veterinary assistant",
    "veterinary technician",
    "animal health technician",
  ],
  VET_SUPPORT: [
    "receptionniste veterinaire",
    "secretaire veterinaire",
    "secretaire medicale veterinaire",
    "accueil clinique veterinaire",
    "responsable de clinique veterinaire",
    "assistant administratif veterinaire",
    "office manager veterinaire",
  ],
  ANIMAL_CARE: [
    "soigneur animalier",
    "soigneuse animalier",
    "agent animalier",
    "agente animaliere",
    "animalier",
    "soigneur",
    "technicien animalier",
    "responsable de refuge",
    "agent de refuge",
    "auxiliaire de refuge",
    "refuge",
    "spa",
    "toiletteur",
    "toiletteuse",
    "educateur canin",
    "comportementaliste",
    "pension animaux",
  ],
  BUSINESS_DEVELOPMENT: [
    "business developer",
    "business development",
    "developpement commercial",
    "charge d affaires",
    "ingenieur d affaires",
    "account executive",
    "sales development",
    "sdr",
    "bdr",
  ],
  CUSTOMER_SERVICE: [
    "relation client",
    "service client",
    "customer success",
    "customer care",
    "customer support",
    "conseiller clientele",
    "charge de clientele",
    "gestionnaire clientele",
    "teleconseiller",
  ],
  RETAIL: [
    "vendeur",
    "vendeuse",
    "conseiller de vente",
    "conseillere de vente",
    "responsable magasin",
    "responsable de magasin",
    "directeur de magasin",
    "directrice de magasin",
    "store manager",
    "retail",
    "chef de rayon",
    "manager de rayon",
    "manager univers",
    "manager d univers",
    "responsable de caisse",
    "hote de caisse",
    "hotesse de caisse",
    "employe commercial",
    "equipier de commerce",
    "conseiller commercial magasin",
  ],
  MARKETING: [
    "marketing",
    "webmarketing",
    "growth",
    "acquisition",
    "seo",
    "sea",
    "traffic manager",
    "trafic manager",
    "brand manager",
    "chef de produit",
    "product marketing",
    "crm manager",
    "e commerce",
    "ecommerce",

  ],
  CATEGORY_MANAGER: [
    "category manager", "categorie manager", "category management", "category lead",
    "chef de categorie", "cheffe de categorie", "responsable de categorie",
    "gestionnaire de categorie", "gestionnaire de categories", "manager de categorie",
  ],
  COMMUNICATION: [
    "charge de communication",
    "chargee de communication",
    "responsable communication",
    "communication digitale",
    "communication interne",
    "chef de projet communication",
    "community manager",
    "social media",
    "content manager",
    "content marketing",
    "communication marketing",
    "attache de presse",
    "relations presse",
    "relations publiques",
    "communication",
  ],
  SALES: [
    "commercial",
    "commerciale",
    "commerciaux",
    "sales",
    "vente",
    "technico commercial",
    "account manager",
    "key account",
    "responsable de secteur",
    "responsable commercial",
    "business manager",
    "sales representative",
  ],
};

const phrase = (text: string, term: string) => ` ${text} `.includes(` ${term} `);

/** Familles associées à une recherche textuelle, pour rapprocher les synonymes. */
export function queryFamilies(query: string, _universe?: string): string[] {
  const text = fold(query);
  if (!text) return [];
  if (/^(finance|assurance banque finance)$/.test(text)) return UNIVERSE_FAMILIES.FINANCE;
  if (/^(commerce|commercial|vente|sales)$/.test(text))
    return ["SALES", "BUSINESS_DEVELOPMENT", "RETAIL", "CUSTOMER_SERVICE"];
  if (/^(veterinaire|veterinary|clinique veterinaire|cabinet veterinaire)$/.test(text))
    return ["ASV", "VET_SUPPORT", "ANIMAL_CARE"];
  if (VOCABULARY.CATEGORY_MANAGER.some((term) => phrase(text, term))) return ["CATEGORY_MANAGER"];
  if (VOCABULARY.ASV.some((term) => phrase(text, term))) return ["ASV"];
  return Object.entries(VOCABULARY)
    .filter(([family, words]) => family !== "ASV" && words.some((term) => phrase(text, term)))
    .map(([family]) => family);
}

/** Vrai quand la requête est exactement un intitulé du vocabulaire (synonymes inclus). */
export function isKnownJobQuery(query: string): boolean {
  const text = fold(query);
  if (!text) return false;
  return (
    /^(commerce|commercial|vente|sales|veterinaire|veterinary)$/.test(text) ||
    Object.values(VOCABULARY)
      .flat()
      .some((term) => term === text)
  );
}

const JUNIOR_TITLE =
  /\b(junior|debutant|debutante|stage|stagiaire|alternance|alternant|alternante|apprenti|apprentie|apprentissage|graduate|jeune diplome)\b/;
const SENIOR_TITLE =
  /\b(senior|head of|directeur|directrice|lead|responsable|chef de (?:service|departement|equipe|magasin|rayon|clinique)|(?:country|general|sales|marketing|store|retail|regional|area|team) manager|manager d equipe)\b/;

/**
 * Le niveau demandé se lit dans l'intitulé. Un intitulé « junior » ou
 * « alternance » prime sur un mot de management, et « manager » seul ne dit
 * rien (Community, Account, Traffic, Brand manager sont des postes de tous niveaux).
 */
export function experienceFrom(
  title: string,
  description: string,
): "JUNIOR" | "CONFIRMED" | "SENIOR" | "UNKNOWN" {
  const heading = fold(title);
  const body = fold(description);
  if (JUNIOR_TITLE.test(heading)) return "JUNIOR";
  if (SENIOR_TITLE.test(heading)) return "SENIOR";
  if (/\b(confirme|confirmee|experimente|experimentee)\b/.test(heading)) return "CONFIRMED";
  if (/debutant\w* accepte|sans experience|jeune diplome|premiere experience/.test(body))
    return "JUNIOR";
  if (/\b(?:[3-9]|1\d) ans d experience/.test(body)) return "CONFIRMED";
  return "UNKNOWN";
}

export function qualificationFrom(description: string): string | null {
  const sentences = description
    .replace(/<[^>]+>/g, " ")
    .split(/[\n.!?]/)
    .map((line) => line.trim());
  const matches = sentences.filter(
    (line) =>
      /\b(gipsa|apform|avq|asv|cqp|echelon|échelon|dipl[oô]m|bac\s?\+|bts|licence|master|certificat|titre professionnel)/i.test(
        line,
      ) &&
      /\b(exig|requis|souhait|titulaire|formation|dipl[oô]m|echelon|échelon|bac|bts|licence|master)/i.test(
        line,
      ),
  );
  return matches.length ? matches.slice(0, 3).join(". ").slice(0, 800) : null;
}
