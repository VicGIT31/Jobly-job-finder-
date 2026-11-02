/**
 * Vocabulaire métier partagé (client + serveur) : domaines, familles, libellés,
 * synonymes de recherche et heuristiques d'expérience. La classification d'une
 * offre elle-même vit côté serveur dans `server/ingest/job-classifier.ts`.
 */
export const UNIVERSES = ["TECH", "COMMERCE", "ASV"] as const;
export type JobUniverse = (typeof UNIVERSES)[number];

export const UNIVERSE_LABELS: Record<JobUniverse, string> = {
  TECH: "Tech & informatique",
  COMMERCE: "Commerce, marketing & communication",
  ASV: "Vétérinaire & animalier",
};

export const UNIVERSE_SHORT_LABELS: Record<JobUniverse, string> = {
  TECH: "Tech",
  COMMERCE: "Commerce & marketing",
  ASV: "ASV & animalier",
};

export const FAMILY_LABELS: Record<string, string> = {
  TECH: "Tech & informatique",
  SALES: "Vente & commercial",
  BUSINESS_DEVELOPMENT: "Développement commercial",
  CUSTOMER_SERVICE: "Relation client",
  RETAIL: "Commerce en magasin",
  MARKETING: "Marketing & digital",
  COMMUNICATION: "Communication",
  ASV: "Auxiliaire vétérinaire (ASV)",
  VET_SUPPORT: "Accueil & gestion de clinique vétérinaire",
  ANIMAL_CARE: "Soins animaliers, refuges & animalerie",
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
    "COMMUNICATION",
  ],
  ASV: ["ASV", "VET_SUPPORT", "ANIMAL_CARE"],
};

export const EXPERIENCE_LABELS: Record<string, string> = {
  JUNIOR: "Débutant / junior",
  CONFIRMED: "Confirmé",
  SENIOR: "Senior / responsable",
  UNKNOWN: "Expérience non précisée",
};

/** Attributs déduits du texte de l'offre : jamais une certitude, un indice lisible. */
export const TAG_LABELS: Record<string, string> = {
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
    "category manager",
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
  if (/^(commerce|commercial|vente|sales)$/.test(text))
    return ["SALES", "BUSINESS_DEVELOPMENT", "RETAIL", "CUSTOMER_SERVICE"];
  if (/^(veterinaire|veterinary|clinique veterinaire|cabinet veterinaire)$/.test(text))
    return ["ASV", "VET_SUPPORT", "ANIMAL_CARE"];
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
