import type { TechSpecialty } from "@prisma/client";
import { fold, VOCABULARY, TAG_LABELS } from "@/lib/job-taxonomy";
import { classifySpecialty } from "./classify";
import { htmlToText } from "./html-to-text";
import { offerMissionText } from "./offer-text";
import { isTechOffer } from "./scope";

/**
 * Classement d'une offre par domaine et par métier, avec la même méthode que
 * les spécialités tech (`classify.ts`) :
 *
 * 1. un rôle nommé dans l'intitulé tranche presque seul ;
 * 2. des signaux forts (×3) et faibles (×1), dans le titre puis dans les
 *    missions (`offerMissionText` écarte la présentation de l'employeur) ;
 * 3. sous le seuil, on renvoie `OTHER` plutôt que de deviner : une mauvaise
 *    étiquette fait disparaître l'offre du filtre où le candidat l'attend.
 *
 * Pour les métiers de la santé animale, le contexte de l'employeur (clinique,
 * groupe vétérinaire, refuge) peut en plus qualifier un intitulé générique
 * (« Assistant(e) », « Agent d'accueil »), jamais l'inventer seul.
 */

export type ClassifiedUniverse = "TECH" | "COMMERCE" | "ASV" | "OTHER";

export type ClassifyContext = {
  company?: string;
  sector?: string;
  /** Contrat déjà normalisé : un poste tech n'est retenu qu'en stage/alternance. */
  contract?: string;
};

export type JobClassification = {
  universe: ClassifiedUniverse;
  family: string;
  specialty: TechSpecialty;
  /** 0 à 1 : 1 = rôle nommé dans l'intitulé, 0,6 à 0,7 = déduit des missions. */
  confidence: number;
  reason: string;
  /** Indices lisibles qui ont décidé du classement (affichés dans « Pourquoi cette offre ? »). */
  evidence: string[];
  tags: string[];
};

type Signal = readonly [label: string, pattern: RegExp];

const OUT = (reason: string): JobClassification => ({
  universe: "OTHER",
  family: "OTHER",
  specialty: "AUTRE",
  confidence: 0,
  reason,
  evidence: [],
  tags: [],
});

/** Supprime les marques de genre et de parité (« (e) », « H/F ») avant la comparaison. */
const cleanTitle = (title: string) =>
  title
    .replace(/\((?:e|es|s|ère|ere|trice|se|ne|le|euse|rice)\)/gi, "")
    .replace(/\(?\b[hfm]\s*\/\s*[hfm]\b\)?/gi, " ");

const phrase = (text: string, term: string) => ` ${text} `.includes(` ${term} `);

function scoreSignals(text: string, strong: readonly Signal[], weak: readonly Signal[] = []) {
  const hitStrong = strong.filter(([, pattern]) => pattern.test(text));
  const hitWeak = weak.filter(([, pattern]) => pattern.test(text));
  return {
    score: hitStrong.length * 3 + hitWeak.length,
    strong: hitStrong.map(([label]) => label),
    weak: hitWeak.map(([label]) => label),
  };
}

/* ------------------------------------------------------------------ */
/* Santé animale                                                        */
/* ------------------------------------------------------------------ */

const VET_EMPLOYER =
  /\b(?:anicura|sevetys|mon veto|monveto|argos|evidensia|ivc|vetopartners|vetoxia|vetopole|vetocare|hopital veterinaire|clinique veterinaire|centre hospitalier veterinaire|chv)\b/;
/** Associations de protection animale : le contexte qualifie un intitulé de gestion ou d'accueil générique. */
const WELFARE_CONTEXT =
  /societe protectrice des animaux|protection (?:et la defense )?des animaux|protection animale|brigitte bardot|30 millions d amis/;
const WELFARE_ROLE =
  /\b(?:responsables?|directeurs?|directrices?|charge[es]?|agents?|assistants?|auxiliaires?|employes?|soigneurs?|animaliers?)\b/;
const VET_STRUCTURE_INTRO =
  /\b(?:clinique|cabinet|hopital|centre hospitalier|centre de soins|groupe) (?:veterinaire|animalier)|\bchv\b/;

const ASV_STRONG: readonly Signal[] = [
  ["contention des animaux", /\bcontention\b|contenir les animaux|maintien des animaux/],
  [
    "aide opératoire",
    /aide operatoire|bloc operatoire|assist\w+ (?:a la |en )?chirurgie|preparation (?:des |du )?(?:blocs?|chirurgies|interventions|salle d operation)/,
  ],
  [
    "anesthésie et surveillance",
    /anesthesi\w+|reveil des animaux|surveillance (?:post operatoire|des animaux)/,
  ],
  [
    "imagerie et prélèvements",
    /radiograph\w+|echograph\w+|prise de sang|prelevements?|pose de catheter|analyses? (?:sanguines?|de laboratoire)/,
  ],
  [
    "soins et hospitalisation",
    /soins (?:aux|des|d) ?animaux|soins infirmiers|hospitalisation|pansements?|nursing|animaux hospitalises/,
  ],
  [
    "stérilisation et hygiène du plateau technique",
    /sterilisation (?:du )?materiel|desinfection (?:du|des) (?:bloc|locaux|cages)|plateau technique/,
  ],
  [
    "assistance en consultation",
    /assist\w+ (?:le |les |un )?(?:veterinaires?|praticiens?)|aide (?:au|aux) (?:veterinaires?|praticiens?)|delivrance (?:des )?(?:medicaments|ordonnances)/,
  ],
];
const ASV_WEAK: readonly Signal[] = [
  [
    "structure vétérinaire",
    /clinique veterinaire|cabinet veterinaire|hopital veterinaire|centre hospitalier veterinaire|\bchv\b/,
  ],
  ["animaux de compagnie", /\b(?:chiens?|chats?|nac|animaux de compagnie)\b/],
  [
    "accueil et gestion",
    /ordonnances?|rendez vous|planning|standard|accueil|encaissement|facturation/,
  ],
  ["animaux", /\banimaux\b|\banimal\b|\bveterinaires?\b/],
];

const ASV_HARD = /\b(?:asv|avq)\b/;
const ASV_ROLE =
  /\bauxiliaires?\b(?: \w+){0,3} (?:veterinaires?|sante animale)\b|\bassistants?\b(?: \w+){0,3} veterinaires?\b|\b(?:infirmiers?|infirmieres?|aides?|techniciens?|techniciennes?) (?:\w+ )?veterinaires?\b|\bveterinary (?:nurse|assistant|technician)\b|\banimal health (?:technician|assistant)\b|\bauxiliaires? de soins? (?:animaux|animaliers?)\b/;
const GENERIC_ASSISTANT =
  /^(?:assistants?|auxiliaires?|aides?|employes?|agents? polyvalents?|stagiaires?|alternan\w+|apprenti\w*)\b/;

const NON_VET_FUNCTION =
  /\b(?:ressources humaines|rh|paie|comptab\w*|financ\w*|juridique|informatique|marketing|communication|commercial\w*|achats|logistique|digital|recrutement|talents?)\b/;
const VET_NOUN = /\b(?:veterinaires?|cliniques?|cabinets?|dispensaires?|hopitaux|hopital|chv)\b/;
const VET_SUPPORT_ADMIN =
  /\b(?:assistants? (?:administratif\w*|de direction|comptable|de gestion)|gestionnaires?|office managers?|responsables?|directeurs?|directrices?|coordinat\w+|chefs? de)\b/;
const RECEPTION =
  /\b(?:receptionnistes?|secretaires?|standardistes?|agents? d accueil|hotes?(?:ses)? d accueil|charges? d accueil)\b/;

const ANIMAL_CARE_ROLE =
  /\b(?:soigneurs?|soigneuses?)\b|\bagents? animaliers?\b|\banimaliers?\b|\banimalieres?\b|\btechniciens? animaliers?\b|\b(?:charge[es]?|responsables?|directeurs?|directrices?|gestionnaires?|agents?|auxiliaires?|assistants?|employes?|gardiens?|chefs?)(?: \w+){0,6} (?:de |du )?(?:refuge|chenil|fourriere|pension)\b|\btoiletteu\w+\b|\beducateurs? canins?\b|\bcomportementalistes?\b|\bcapacitaires?\b|\bpension (?:canine|feline|pour animaux)\b/;
const ANIMAL_CARE_STRONG: readonly Signal[] = [
  [
    "soins quotidiens aux animaux",
    /nourrissage|soins quotidiens|alimentation des animaux|nettoyage des (?:box|cages|enclos|boxes)/,
  ],
  ["adoption et accueil du public", /adoptions?|accueil du public|visites? d adoptants?/],
  ["comportement animal", /comportement animal|socialisation|promenades?|enrichissement/],
];

/* ------------------------------------------------------------------ */
/* Commerce, marketing, communication                                  */
/* ------------------------------------------------------------------ */

const COMMERCE_ORDER = [
  "MARKETING",
  "COMMUNICATION",
  "BUSINESS_DEVELOPMENT",
  "CUSTOMER_SERVICE",
  "RETAIL",
  "SALES",
] as const;

const COMMERCE_STRONG: Record<(typeof COMMERCE_ORDER)[number], readonly Signal[]> = {
  MARKETING: [
    [
      "référencement et acquisition",
      /\bseo\b|\bsea\b|referencement|google ads|acquisition (?:de )?trafic|campagnes? (?:media|d acquisition|emailing|marketing)/,
    ],
    [
      "stratégie marketing",
      /plan marketing|strategie marketing|etudes? de marche|marketing automation|taux de conversion/,
    ],
    ["newsletters et CRM", /newsletters?|emailing|\bcrm\b|lancement de produits?/],
  ],
  COMMUNICATION: [
    ["relations presse", /relations? presse|communiques? de presse|attache de presse/],
    [
      "plan de communication",
      /plan de communication|ligne editoriale|charte graphique|supports? de communication/,
    ],
    [
      "réseaux sociaux et contenus",
      /reseaux sociaux|community management|redaction (?:de )?contenus?|evenementiel/,
    ],
  ],
  BUSINESS_DEVELOPMENT: [
    [
      "prospection et portefeuille",
      /prospection|developpement (?:du )?portefeuille|generation de leads?/,
    ],
    ["négociation et closing", /negociation|closing|appels? d offres?|rendez vous commerciaux/],
    ["pipeline et chiffre d'affaires", /pipeline|chiffre d affaires/],
  ],
  CUSTOMER_SERVICE: [
    ["réclamations et SAV", /reclamations?|service apres vente|\bsav\b/],
    ["support et fidélisation", /support client|fidelisation|satisfaction client/],
    [
      "traitement des demandes",
      /traitement des (?:demandes|appels)|accueil (?:telephonique|des clients)/,
    ],
  ],
  RETAIL: [
    ["rayon et merchandising", /merchandising|mise en rayon|gestion (?:du )?rayon/],
    ["caisse et inventaire", /encaissement|\bcaisse\b|inventaires?/],
    [
      "conseil en magasin",
      /accueil et conseil (?:des )?clients|animation commerciale|point de vente|\bmagasin\b/,
    ],
  ],
  SALES: [
    ["objectifs de vente", /objectifs? (?:de vente|commerciaux)|portefeuille clients?/],
    [
      "visites et devis",
      /visites? clients?|offres? commerciales?|\bdevis\b|negociation commerciale/,
    ],
    ["vente", /vente (?:de|d)|ventes? additionnelles?/],
  ],
};

const SALES_WORD = "(?:commercial\\w*|business (?:develop\\w*|manager)|affaires|ventes?)";
/** « Développeur commercial » et « Commercial développeur » sont des postes de vente, pas de logiciel. */
const DEV_COMMERCIAL = new RegExp(
  `\\bdeveloppeu\\w*\\b.*\\b${SALES_WORD}\\b|\\b${SALES_WORD}\\b.*\\bdeveloppeu\\w*\\b`,
);

const ANIMAL_RETAIL =
  /\b(?:animalerie|maxi zoo|animalis|zooplus|alimentation animale|croquettes?|sante animale|nutrition animale)\b/;

/* ------------------------------------------------------------------ */
/* Attributs déduits du texte                                          */
/* ------------------------------------------------------------------ */

const TAG_PATTERNS: Array<[tag: keyof typeof TAG_LABELS, pattern: RegExp, scope: "all" | "asv"]> = [
  [
    "DEBUTANT_ACCEPTE",
    /debutant\w* accepte|sans experience|jeune diplome|premiere experience|ouvert aux debutants?|debutant\w* (?:bienvenu|encourage)/,
    "all",
  ],
  [
    "FORMATION_ASSUREE",
    /formation (?:assuree|en interne|prise en charge)|nous vous formons|tutorat|parcours d integration/,
    "all",
  ],
  [
    "ALTERNANCE_POSSIBLE",
    /alternance (?:possible|envisageable)|contrat d apprentissage|contrat de professionnalisation|en alternance/,
    "all",
  ],
  [
    "WEEKEND_GARDE",
    /week end|astreintes?|\bgardes?\b(?! d enfants)|permanences? de soins|jours feries|travail (?:le |un )?(?:samedi|dimanche)|samedis? (?:et|ou) dimanches?/,
    "all",
  ],
  ["URGENCES", /urgences?|permanence de soins|24 ?h? ?(?:sur|\/)? ?24|service de garde/, "asv"],
  ["CANIN_FELIN", /\bcanine\b|\bfeline\b|chiens? et chats?|animaux de compagnie|\bcanin\b/, "asv"],
  ["EQUIN", /\bequine?\b|chevaux|\bcheval\b|haras|centre equestre/, "asv"],
  [
    "RURAL",
    /\brurale?\b|bovins?|ruminants?|elevages?|productions? animales?|porcins?|volailles?/,
    "asv",
  ],
  [
    "NAC",
    /\bnac\b|nouveaux animaux de compagnie|reptiles?|rongeurs?|oiseaux|lapins?|furets?/,
    "asv",
  ],
  [
    "FAUNE_SAUVAGE",
    /faune sauvage|centre de sauvegarde|centre de soins|parc zoologique|\bzoo de\b|parc animalier|animaux sauvages/,
    "asv",
  ],
  ["REFUGE", /refuge|protection animale|adoptions?|fourriere|\bspa\b|abandon/, "asv"],
];

export function deriveTags(args: {
  universe: ClassifiedUniverse;
  family?: string;
  title: string;
  description: string;
  company?: string;
}): string[] {
  const body = fold(htmlToText(args.description)).slice(0, 9000);
  const title = fold(cleanTitle(args.title));
  const company = fold(args.company ?? "");
  const intro = body.slice(0, 900);
  const animal =
    args.universe === "ASV" ||
    ANIMAL_RETAIL.test(`${title} ${company} ${intro}`) ||
    (args.universe === "COMMERCE" && VET_EMPLOYER.test(company));
  const tags: string[] = [];
  for (const [tag, pattern, scope] of TAG_PATTERNS) {
    if (scope === "asv" && args.universe !== "ASV") continue;
    if (pattern.test(body) || pattern.test(title)) tags.push(tag);
  }
  if (animal) tags.push("UNIVERS_ANIMALIER");
  return tags;
}

/* ------------------------------------------------------------------ */
/* Classement                                                          */
/* ------------------------------------------------------------------ */

function build(
  universe: ClassifiedUniverse,
  family: string,
  confidence: number,
  reason: string,
  evidence: string[],
  input: { title: string; description: string; company?: string; specialty?: TechSpecialty },
): JobClassification {
  return {
    universe,
    family,
    specialty: input.specialty ?? "AUTRE",
    confidence,
    reason,
    evidence,
    tags: deriveTags({ universe, family, ...input }),
  };
}

export function classifyJob(
  title: string,
  description = "",
  context: ClassifyContext = {},
): JobClassification {
  const heading = fold(cleanTitle(title));
  const input = { title, description, company: context.company };
  const missions = description ? fold(offerMissionText(description)) : "";
  const company = fold(`${context.company ?? ""} ${context.sector ?? ""}`);
  const intro = description ? fold(htmlToText(description)).slice(0, 700) : "";
  const vetContext =
    VET_EMPLOYER.test(company) ||
    /veterinaire|sante animale/.test(company) ||
    VET_STRUCTURE_INTRO.test(intro);

  // Formations et vétérinaires : métiers voisins, jamais un poste d'ASV.
  if (/\b(professeur|enseignant|enseignante|formateur|formatrice)\b/.test(heading))
    return OUT("Poste de formation, distinct du métier recherché");
  if (
    /^(?:veterinaire|docteur veterinaire|chirurgien veterinaire|praticien|veterinarian)\b/.test(
      heading,
    )
  )
    return OUT("Poste vétérinaire, distinct d’un ASV");

  /* --- Santé animale : rôle nommé dans l'intitulé ------------------ */
  if (ASV_HARD.test(heading))
    return build(
      "ASV",
      "ASV",
      1,
      "Intitulé d’auxiliaire vétérinaire",
      ["Intitulé d’ASV / AVQ"],
      input,
    );

  const adminVet =
    VET_SUPPORT_ADMIN.test(heading) && VET_NOUN.test(heading) && !NON_VET_FUNCTION.test(heading);
  const receptionVet = RECEPTION.test(heading) && (VET_NOUN.test(heading) || vetContext);
  if (
    (adminVet || receptionVet) &&
    !ANIMAL_CARE_ROLE.test(heading) &&
    !NON_VET_FUNCTION.test(heading)
  )
    return build(
      "ASV",
      "VET_SUPPORT",
      VET_NOUN.test(heading) ? 0.9 : 0.75,
      FAMILY_REASON.VET_SUPPORT,
      [
        VET_NOUN.test(heading)
          ? "Accueil ou gestion de structure vétérinaire dans l’intitulé"
          : "Poste d’accueil chez un employeur vétérinaire",
      ],
      input,
    );

  if (ASV_ROLE.test(heading) || VOCABULARY.ASV.some((term) => phrase(heading, term)))
    return build(
      "ASV",
      "ASV",
      1,
      "Intitulé d’auxiliaire vétérinaire",
      ["Intitulé d’auxiliaire vétérinaire"],
      input,
    );

  // « Vendeur conseil capacitaire », « Soigneur vendeur » : de la vente, retrouvée par le tag animalier.
  const retailTitle = /\b(?:vendeu\w*|vente|conseill\w*)\b/.test(heading);
  if (ANIMAL_CARE_ROLE.test(heading) && !retailTitle) {
    const care = scoreSignals(missions, ANIMAL_CARE_STRONG);
    return build(
      "ASV",
      "ANIMAL_CARE",
      care.score >= 3 ? 0.9 : 0.8,
      "Poste voisin de l’ASV : soins aux animaux, refuge ou animalerie",
      ["Intitulé de soins animaliers", ...care.strong.map((label) => `Missions : ${label}`)],
      input,
    );
  }

  if (GENERIC_ASSISTANT.test(heading) && vetContext && !NON_VET_FUNCTION.test(heading)) {
    const asv = scoreSignals(missions, ASV_STRONG, ASV_WEAK);
    return build(
      "ASV",
      "ASV",
      asv.strong.length ? 0.85 : 0.7,
      "Intitulé générique dans une structure vétérinaire",
      [
        "Employeur ou structure vétérinaire",
        ...asv.strong.slice(0, 2).map((label) => `Missions : ${label}`),
      ],
      input,
    );
  }

  if (
    WELFARE_ROLE.test(heading) &&
    !NON_VET_FUNCTION.test(heading) &&
    WELFARE_CONTEXT.test(`${company} ${intro}`)
  )
    return build(
      "ASV",
      "ANIMAL_CARE",
      0.75,
      "Poste voisin de l’ASV : association de protection animale",
      ["Employeur de protection animale"],
      input,
    );

  // Tout autre intitulé vétérinaire (remplaçant, salarié, stage vétérinaire) n'est pas un ASV.
  if (/\b(veterinaires?|veterinary|veterinarian|chirurgiens?|praticiens?)\b/.test(heading))
    return OUT("Poste vétérinaire, distinct d’un ASV");

  /* --- Tech et commerce : même arbitrage que le reste du catalogue -- */
  const commerceByTitle = COMMERCE_ORDER.filter((family) =>
    VOCABULARY[family].some((term) => phrase(heading, term)),
  );
  const retailCategory = /\b(acheteur|achats)\b.*\bcategory manager\b/.test(heading);
  const student = !context.contract || ["STAGE", "ALTERNANCE"].includes(context.contract);
  const salesDeveloper = DEV_COMMERCIAL.test(heading);
  const tech = !salesDeveloper && isTechOffer(title, description);

  if (tech && (student || !commerceByTitle.length)) {
    const specialty = classifySpecialty(title, description);
    return build(
      "TECH",
      "TECH",
      specialty === "AUTRE" ? 0.7 : 0.9,
      "Poste tech et informatique",
      specialty === "AUTRE"
        ? ["Vocabulaire tech dans l’intitulé ou les missions"]
        : [`Spécialité : ${specialty}`],
      { ...input, specialty },
    );
  }

  if (retailCategory)
    return build(
      "COMMERCE",
      "RETAIL",
      0.95,
      "Achats et gestion de catégorie en distribution",
      ["Achats et gestion de catégorie"],
      input,
    );

  if (salesDeveloper && !commerceByTitle.length)
    return build(
      "COMMERCE",
      "BUSINESS_DEVELOPMENT",
      0.85,
      FAMILY_REASON.BUSINESS_DEVELOPMENT,
      ["Intitulé de développement commercial"],
      input,
    );

  if (commerceByTitle.length) {
    // Plusieurs métiers nommés (« Marketing & communication ») : les missions départagent.
    const ranked = commerceByTitle
      .map((family) => ({
        family,
        missions: scoreSignals(missions, COMMERCE_STRONG[family]),
      }))
      .sort(
        (a, b) =>
          b.missions.score - a.missions.score ||
          COMMERCE_ORDER.indexOf(a.family) - COMMERCE_ORDER.indexOf(b.family),
      );
    const winner = ranked[0];
    return build(
      "COMMERCE",
      winner.family,
      0.95,
      FAMILY_REASON[winner.family],
      [
        `Intitulé : ${FAMILY_REASON[winner.family]}`,
        ...winner.missions.strong.slice(0, 2).map((label) => `Missions : ${label}`),
      ],
      input,
    );
  }

  /* --- Repli sur les missions, avec le même seuil strict que la tech - */
  if (missions) {
    const asv = scoreSignals(missions, ASV_STRONG, ASV_WEAK);
    if (vetContext && asv.strong.length >= 2)
      return build(
        "ASV",
        "ASV",
        0.65,
        "Missions d’auxiliaire vétérinaire",
        [
          ...asv.strong.slice(0, 3).map((label) => `Missions : ${label}`),
          "Employeur ou structure vétérinaire",
        ],
        input,
      );

    const candidates = COMMERCE_ORDER.map((family) => ({
      family,
      ...scoreSignals(missions, COMMERCE_STRONG[family]),
    })).sort((a, b) => b.score - a.score);
    const [best, next] = candidates;
    // Trois signaux distincts et une nette avance : un simple mot de l'annonce ne suffit jamais.
    if (best.strong.length >= 3 && best.score - (next?.score ?? 0) >= 3)
      return build(
        "COMMERCE",
        best.family,
        0.6,
        `Missions de ${FAMILY_REASON[best.family].toLowerCase()}`,
        best.strong.map((label) => `Missions : ${label}`),
        input,
      );
  }

  return OUT(description ? "Intitulé insuffisant pour un métier suivi" : "Métier non identifié");
}

const FAMILY_REASON: Record<string, string> = {
  MARKETING: "Marketing et digital",
  COMMUNICATION: "Communication",
  BUSINESS_DEVELOPMENT: "Développement commercial",
  CUSTOMER_SERVICE: "Relation client",
  RETAIL: "Commerce en magasin",
  SALES: "Vente et commercial",
  VET_SUPPORT: "Accueil et gestion de clinique vétérinaire",
};

/**
 * Périmètre accepté par le catalogue : toute la tech reste en stage/alternance,
 * les nouveaux métiers acceptent tous les contrats.
 */
export function isInScope(
  classification: Pick<JobClassification, "universe">,
  contractType: string,
): { ok: true } | { ok: false; reason: string } {
  if (classification.universe === "OTHER")
    return { ok: false, reason: "Offre hors périmètre : métier non suivi" };
  if (classification.universe === "TECH" && !["STAGE", "ALTERNANCE"].includes(contractType))
    return { ok: false, reason: "Offre hors périmètre : poste tech hors stage ou alternance" };
  return { ok: true };
}
