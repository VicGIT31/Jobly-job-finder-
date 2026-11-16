import { fold, type JobUniverse } from "@/lib/job-taxonomy";

const titleGroups: [JobUniverse, RegExp][] = [
  ["HEALTH", /\b(infirmier\w*|medecin\w*|pharmacien\w*|aide soignant\w*|kinesitherapeute|psychologue|educateur specialise|sage femme|ambulancier\w*)\b/],
  ["CONSTRUCTION", /\b(macon\w*|plombier\w*|electricien\w*|charpentier\w*|couvreur\w*|peintre en batiment|conducteur de travaux|menuisier\w*|plaquiste)\b/],
  ["INDUSTRY", /\b(soudeur\w*|chaudronnier\w*|mecanicien\w*|technicien de maintenance|operateur de production|usineur\w*|automaticien\w*|carrossier\w*)\b/],
  ["TRANSPORT", /\b(chauffeur\w*|conducteur routier|livreur\w*|cariste|magasinier\w*|preparateur de commandes|logisticien\w*)\b/],
  ["EDUCATION", /\b(professeur\w*|enseignant\w*|formateur\w*|instituteur\w*)\b/],
  ["AGRICULTURE", /\b(agricole|horticulteur\w*|maraicher\w*|viticole|paysagiste|elagueur\w*)\b/],
  ["HOSPITALITY", /\b(cuisinier\w*|serveur\w*|serveuse\w*|chef de cuisine|receptionniste|boulanger\w*|patissier\w*|restauration|hotel)\b/],
  ["PUBLIC_ADMIN", /\b(juriste|avocat\w*|notaire|assistant administratif|secretaire administratif|gestionnaire administratif)\b/],
  ["CULTURE", /\b(photographe|graphiste|coach sportif|bibliothecaire|musicien\w*|journaliste|regisseur\w*)\b/],
  ["SERVICES", /\b(agent d entretien|agent de securite|aide a domicile|auxiliaire de vie|coiffeur\w*|estheticien\w*|agent de proprete)\b/],
];

export function nationalDomain(title: string, sector = ""): JobUniverse | undefined {
  const header = fold(title);
  const direct = titleGroups.find(([, pattern]) => pattern.test(header));
  if (direct) return direct[0];
  const hints: [JobUniverse, RegExp][] = [
    ["HEALTH", /sante|medico social|(?:^| )social(?: |$)/],
    ["CONSTRUCTION", /batiment|\bbtp\b|travaux publics/],
    ["INDUSTRY", /industrie|maintenance|metallurgie|automobile/],
    ["TRANSPORT", /transport|logistique/],
    ["EDUCATION", /enseignement|formation/],
    ["AGRICULTURE", /agriculture|elevage|environnement|espaces verts/],
    ["HOSPITALITY", /hotellerie|restauration|tourisme/],
    ["PUBLIC_ADMIN", /administration|fonction publique|juridique|droit/],
    ["CULTURE", /spectacle|culture|audiovisuel|sport|journalisme|artisanat d art/],
    ["SERVICES", /securite|nettoyage|services a la personne/],
    ["TECH", /informatique|telecom/],
    ["COMMERCE", /commerce|distribution|marketing|communication/],
    ["FINANCE", /finance|banque|assurances?/],
  ];
  return hints.find(([, pattern]) => pattern.test(fold(sector)))?.[0];
}
