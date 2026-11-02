/** Shared, deterministic job vocabulary. Classification uses the title first. */
export const UNIVERSES = ["COMMERCE", "ASV"] as const;
export type JobUniverse = (typeof UNIVERSES)[number];
export const FAMILY_LABELS: Record<string, string> = {
  SALES: "Vente & commercial", BUSINESS_DEVELOPMENT: "Développement commercial", CUSTOMER_SERVICE: "Relation client",
  RETAIL: "Commerce en magasin", MARKETING: "Marketing & digital", COMMUNICATION: "Communication marketing",
  ASV: "Auxiliaire vétérinaire", ANIMAL_CARE: "Poste voisin à examiner", OTHER: "Autre métier",
};
export const EXPERIENCE_LABELS: Record<string, string> = { JUNIOR: "Débutant / junior", CONFIRMED: "Confirmé", SENIOR: "Senior / responsable", UNKNOWN: "Expérience non précisée" };
export const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’']/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
export const VOCABULARY: Record<string, string[]> = {
  ASV: ["asv", "avq", "auxiliaire veterinaire", "auxiliaire specialise veterinaire", "auxiliaire specialisee veterinaire", "assistant veterinaire", "assistante veterinaire", "veterinary nurse", "veterinary assistant", "animal health technician"],
  BUSINESS_DEVELOPMENT: ["business developer", "business development", "developpement commercial", "charge d affaires", "ingenieur d affaires", "account executive", "sales development", "sdr", "bdr"],
  CUSTOMER_SERVICE: ["relation client", "service client", "customer success", "customer care", "customer support", "conseiller clientele", "charge de clientele", "gestionnaire clientele", "teleconseiller"],
  RETAIL: ["vendeur", "vendeuse", "conseiller de vente", "conseillere de vente", "responsable magasin", "responsable de magasin", "directeur de magasin", "directrice de magasin", "store manager", "retail", "chef de rayon", "manager de rayon", "manager univers", "manager d univers", "responsable de caisse", "hote de caisse", "hotesse de caisse", "employe commercial", "equipier de commerce", "conseiller commercial magasin"],
  MARKETING: ["marketing", "growth", "acquisition", "seo", "sea", "traffic manager", "trafic manager", "brand manager", "chef de produit", "product marketing", "crm manager", "e commerce", "ecommerce", "category manager"],
  COMMUNICATION: ["charge de communication", "chargee de communication", "responsable communication", "communication digitale", "community manager", "social media", "content manager", "content marketing", "communication marketing"],
  SALES: ["commercial", "commerciale", "commerciaux", "sales", "vente", "technico commercial", "account manager", "key account", "responsable de secteur", "responsable commercial", "business manager", "sales representative"],
};
const phrase = (text: string, term: string) => (` ${text} `).includes(` ${term} `);
export function classifyJob(title: string, description = ""): { universe: JobUniverse | "TECH" | "OTHER"; family: string; confidence: number; reason: string } {
  const text = fold(title);
  if (/\b(professeur|enseignant|enseignante|formateur|formatrice)\b/.test(text)) return { universe: "OTHER", family: "OTHER", confidence: 1, reason: "Poste de formation, distinct du métier recherché" };
  // A veterinarian vacancy mentioning ASVs in its team is never an ASV vacancy.
  if (/^(veterinaire|docteur veterinaire|chirurgien veterinaire|praticien|veterinarian)\b/.test(text)) return { universe: "OTHER", family: "OTHER", confidence: 1, reason: "Poste vétérinaire, distinct d’un ASV" };
  const asv = VOCABULARY.ASV.some((term) => phrase(text, term)) || /auxiliair\w*.*veterinair|assistant(?:e| e)? veterinaire/.test(text);
  if (asv) return { universe: "ASV", family: "ASV", confidence: 1, reason: "Intitulé d’auxiliaire vétérinaire" };
  if (/\b(veterinaire|veterinary|veterinarian|chirurgien|praticien)\b/.test(text)) return { universe: "OTHER", family: "OTHER", confidence: 1, reason: "Poste vétérinaire, distinct d’un ASV" };
  if (/\b(toiletteur|soigneur animalier|animalier|agent de sterilisation)\b/.test(text)) return { universe: "OTHER", family: "ANIMAL_CARE", confidence: 0.7, reason: "Métier voisin, pas une offre ASV certaine" };
  for (const family of ["MARKETING", "COMMUNICATION", "BUSINESS_DEVELOPMENT", "CUSTOMER_SERVICE", "RETAIL", "SALES"]) {
    if (VOCABULARY[family].some((term) => phrase(text, term))) return { universe: "COMMERCE", family, confidence: 0.95, reason: FAMILY_LABELS[family] };
  }
  // No employer-boilerplate inference from descriptions.
  return { universe: "OTHER", family: "OTHER", confidence: 0, reason: description ? "Intitulé insuffisant pour le métier demandé" : "Métier non identifié" };
}
export function queryFamilies(query: string, universe: string): string[] {
  const text = fold(query); if (!text) return [];
  if (universe === "ASV" && VOCABULARY.ASV.some((term) => phrase(text, term))) return ["ASV"];
  const exact = Object.entries(VOCABULARY).filter(([family, words]) => family !== "ASV" && words.some((term) => phrase(text, term))).map(([family]) => family);
  if (/^(commerce|commercial|vente|sales)$/.test(text)) return ["SALES", "BUSINESS_DEVELOPMENT", "RETAIL", "CUSTOMER_SERVICE"];
  return exact;
}
export function experienceFrom(title: string, description: string): "JUNIOR" | "CONFIRMED" | "SENIOR" | "UNKNOWN" {
  const heading = fold(title), body = fold(description);
  if (/\b(senior|head of|directeur|directrice|lead|manager|responsable)\b/.test(heading)) return "SENIOR";
  if (/\b(junior|debutant|stage|alternance|apprenti|graduate)\b/.test(heading) || /debutant\w* accepte|sans experience/.test(body)) return "JUNIOR";
  if (/\b(confirme|experimente)\b/.test(heading) || /[3-9] ans d experience/.test(body)) return "CONFIRMED";
  return "UNKNOWN";
}
export function qualificationFrom(description: string): string | null {
  const sentences = description.replace(/<[^>]+>/g, " ").split(/[\n.!?]/).map((line) => line.trim());
  const matches = sentences.filter((line) => /\b(gipsa|apform|avq|asv|echelon|échelon|dipl[oô]m|bac\s?\+|bts|licence|master|certificat)/i.test(line) && /\b(exig|requis|souhait|titulaire|formation|dipl[oô]m|echelon|échelon|bac|bts|licence|master)/i.test(line));
  return matches.length ? matches.slice(0, 3).join(". ").slice(0, 800) : null;
}
