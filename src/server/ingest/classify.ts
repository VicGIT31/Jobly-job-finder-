import type { TechSpecialty } from "@prisma/client";
import { offerMissionText } from "./offer-text";

/**
 * Classement d'une offre dans une **spécialité tech**.
 *
 * Le secteur renvoyé par les sources est toujours le même (« Tech /
 * Informatique ») : il ne permet pas de distinguer un poste de pentester d'un
 * poste de développeur React. On déduit donc la spécialité du titre et de la
 * description.
 *
 * Méthode : un score par spécialité, alimenté par des signaux **forts** (un
 * terme qui suffit presque à trancher : « pentest », « kubernetes ») et
 * **faibles** (un indice qui ne vaut que combiné : « cloud », « python »). Le
 * titre prime sur les missions, car c'est là que le métier est nommé.
 *
 * Sous le seuil, on renvoie `AUTRE` plutôt que de deviner : une mauvaise
 * étiquette est plus coûteuse qu'une absence d'étiquette, car elle fait
 * disparaître l'offre du filtre où le candidat l'attend.
 */

type Rules = { strong: RegExp[]; weak: RegExp[] };

/** Normalise pour comparer sans accent ni casse. */
function fold(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Signaux techniques par spécialité. Leur ordre ne donne aucune priorité
 * implicite : les titres hybrides sont départagés par les missions.
 */
const RULES: Array<{ specialty: TechSpecialty; rules: Rules }> = [
  {
    specialty: "CYBERSECURITE",
    rules: {
      strong: [
        /cyber[ -]?(?:securite|security)/,
        /\b(?:pentester|ciso|dpo|iam|grc|soc analyst)\b/,
        /tests? d.intrusion/,
        /securite\s+(informatique|des\s+systemes|offensive|defensive|applicative|reseau)/,
        /\bpentest/,
        /penetration\s+test/,
        /\bsoc\b(?!\s+(?:amd|fpga|arm|system|design))/,
        /\bsiem\b/,
        /\brssi\b/,
        /ethical\s+hack/,
        /\bforensic/,
        /cryptographi/,
        /iso\s?27001/,
        /\bebios\b/,
        /\bowasp\b/,
        /red\s+team/,
        /blue\s+team/,
        /analyste\s+securite/,
        /vulnerabilit/,
      ],
      weak: [/\bsecurite\b/, /\brgpd\b/, /conformite/, /audit/, /\bsecu\b/],
    },
  },
  {
    specialty: "IA",
    rules: {
      strong: [
        /intelligence\s+artificielle/,
        /artificial\s+intelligence/,
        /\b(?:ia|ai)\b(?!\s+engines?\b)/,
        /data[ -]+(?:analyst|engineer|analytics|platform|management|gouvernance|governance)/,
        /business intelligence|\bpower[ -]?bi\b/,
        /machine\s+learning/,
        /deep\s+learning/,
        /data\s+scien/,
        /\bnlp\b/,
        /\bllms?\b/,
        /reinforcement learning|apprentissage par renforcement/,
        /ia\s+generative/,
        /computer\s+vision/,
        /\bmlops\b/,
        /reseaux?\s+de\s+neurones/,
        /\bpytorch\b/,
        /\btensorflow\b/,
        /scikit/,
        /apprentissage\s+automatique/,
        /\bgen\s?ai\b/,
      ],
      weak: [
        /\bdata\b/,
        /data\s+(analyst|engineer)/,
        /\bbig\s+data\b/,
        /modelisation/,
        /statistiqu/,
        /\bpython\b/,
        /algorithm/,
      ],
    },
  },
  {
    specialty: "DEVOPS",
    rules: {
      strong: [
        /\bdev(?:sec)?ops\b/,
        /ingenieur\s+cloud/,
        /\bsre\b/,
        /site\s+reliability/,
        /kubernetes/,
        /\bk8s\b/,
        /terraform/,
        /ansible/,
        /ci\s?\/\s?cd/,
        /jenkins/,
        /gitlab\s?ci/,
        /infrastructure\s+as\s+code/,
        /platform\s+engineer/,
        /cloud\s+engineer/,
        /\bdocker\b/,
        /observabilit/,
      ],
      weak: [/\bcloud\b/, /\baws\b/, /\bazure\b/, /\bgcp\b/, /deploiement/, /monitoring/, /\bcd\b/],
    },
  },
  {
    specialty: "RESEAUX",
    rules: {
      strong: [
        /(administrat(?:eur|rice)|ingenieur|technicien)\s+(?:systemes?|reseaux?)/,
        /\b(?:sysadmin|system administrator|network engineer|support informatique|technicien(?:ne)? informatique)\b/,
        /reseaux?\s+et\s+telecom/,
        /\bcisco\b/,
        /\bccna\b/,
        /\bvlan\b/,
        /\bbgp\b/,
        /\bospf\b/,
        /routage/,
        /fibre\s+optique/,
        /\bvoip\b/,
        /\bsdn\b/,
        /\bwan\b/,
        /infrastructure\s+reseau/,
      ],
      weak: [/\breseaux?\b/, /telecom/, /\bsysteme?s?\b/, /support\s+technique/, /\bhelpdesk\b/],
    },
  },
  {
    specialty: "WEB",
    rules: {
      strong: [
        /developpeu(r|se)(\s+[\w'-]+){0,2}\s+web/,
        /back[\s-]?end/,
        /front[\s-]?end/,
        /\bfrontend\b/,
        /full[\s-]?stack/,
        /\breact\b/,
        /\bangular\b/,
        /\bvue\.?js\b/,
        /\bnext\.?js\b/,
        /\bnode\.?js\b/,
        /\bsymfony\b/,
        /\blaravel\b/,
        /wordpress/,
        /\bdjango\b/,
        /integrateur\s+web/,
      ],
      weak: [
        /\bweb\b/,
        /\bphp\b/,
        /\bhtml\b/,
        /\bcss\b/,
        /javascript/,
        /typescript/,
        /\bapi\s+rest/,
      ],
    },
  },
  {
    specialty: "SOFTWARE",
    rules: {
      strong: [
        /ingenieur\s+logiciel/,
        /software\s+engineer/,
        /developpeu(r|se)(\s+[\w'-]+){0,2}\s+logiciel/,
        /architecte\s+logiciel/,
        /\bc\+\+/,
        /\b(?:fpga|asic|ai engines|soc amd)\b/,
        /developpement (?:de )?logiciel/,
        /\bc#(?=\W|$)/,
        /\.net\b/,
        /\bgolang\b/,
        /\brust\b/,
        /\bembarque/,
        /\bembedded\b/,
        /developpeu(r|se)(\s+[\w'-]+){0,2}\s+mobile/,
        /\bandroid\b/,
        /\bios\b/,
        /\bkotlin\b/,
        /\bswift\b/,
        /\bflutter\b/,
        /test\s+automatis/,
        /\bqa\b/,
      ],
      weak: [/\bjava\b/, /developpement/, /programmation/, /\bpoo\b/, /algorithmique/, /\bgit\b/],
    },
  },
];

/** Une seule voix par métier : accumuler ses synonymes ne doit pas gonfler le titre. */
const ROLES: Partial<Record<TechSpecialty, RegExp>> = {
  IA: /\b(?:ia|ai)(?!\s+engines?\b)\b|intelligence (?:artificielle|artificial)|artificial intelligence|machine learning|deep learning|data[ -]+(?:scien\w*|analyst\w*|engineer\w*|platform|analytics|management|manager|gouvernance|governance)|ingenieur(?:e)? data\b|business (?:intelligence|analytics)|reinforcement learning|computer vision/,
  CYBERSECURITE:
    /cyber[ -]?(?:securite|security)|\b(?:pentest\w*|rssi|ciso|siem|dpo|iam|grc)\b|(?:analyst\w*|ingenieur)\s+(?:soc|securite)|securite (?:informatique|offensive|applicative)|recherche de vulnerabilites|data protection officer|data privacy|cloud security|security engineer/,
  DEVOPS: /\bdev(?:sec)?ops\b|\bsre\b|site reliability|(?:cloud|platform) engineer|ingenieur cloud/,
  RESEAUX:
    /(?:administrat(?:eur|rice)|ingenieur|technicien)\s+(?:systemes?(?!\s+(?:embarque|autonome))|reseaux?)|system administrator|network engineer|sysadmin|support informatique|technicien(?:ne)? informatique/,
  WEB: /front[ -]?end|back[ -]?end|full[ -]?stack|developpeu(?:r|se)(?:\s+[\w'-]+){0,2}\s+web|integrateur web/,
  SOFTWARE:
    /ingenieur(?:\(e\))? logiciel|developpement (?:de )?logiciel|software (?:engineer|developer)|(?:test|qualite) logiciels?|developpeu(?:r|se)(?:\s+[\w'-]+){0,2}\s+(?:logiciel|mobile)|tests? logiciels?|tests? automatis|automatisation (?:de |des )?tests|\b(?:embedded|embarque|android|ios|flutter|fpga|asic|ai engines|soc amd)\b/,
};

function scoreText(text: string, rules: Rules): number {
  return (
    rules.strong.filter((pattern) => pattern.test(text)).length * 3 +
    rules.weak.filter((pattern) => pattern.test(text)).length
  );
}

export type SpecialtyClassification = {
  specialty: TechSpecialty;
  reason: "title-role" | "title-signal" | "missions" | "insufficient";
  scores: Array<{ specialty: TechSpecialty; role: boolean; title: number; missions: number }>;
};

/** Le métier du titre prime sur les outils et sur le secteur de l'employeur. */
export function explainSpecialty(title: string, description = ""): SpecialtyClassification {
  const foldedTitle = fold(title).replace(/[’‘]/g, "'");
  const missions = offerMissionText(description);
  const scores = RULES.map(({ specialty, rules }) => ({
    specialty,
    role: ROLES[specialty]?.test(foldedTitle) ?? false,
    title: scoreText(foldedTitle, rules),
    missions: scoreText(missions, rules),
  }));
  if (
    !scores.some((score) => score.role) &&
    !scores.some((score) => score.title >= 3) &&
    /\b(?:developpeu\w*|developer|developpement informatique|genie logiciel)\b/.test(foldedTitle)
  ) {
    scores.find((score) => score.specialty === "SOFTWARE")!.role = true;
  }
  const roles = scores.filter((score) => score.role);
  // Pour les sujets hybrides (IA + cyber), les missions départagent les métiers,
  // sans priorité implicite de la cyber par ordre de déclaration.
  const candidates = roles.length ? roles : scores;
  const titleMax = Math.max(...candidates.map((score) => score.title));
  const titleCandidates = roles.length ? roles : candidates.filter((s) => s.title === titleMax);
  const byMissions = (a: (typeof scores)[number], b: (typeof scores)[number]) =>
    b.missions - a.missions || b.title - a.title || a.specialty.localeCompare(b.specialty);
  if (roles.length || titleMax >= 3) {
    const winner = [...titleCandidates].sort(byMissions)[0];
    return {
      specialty: winner.specialty,
      reason: roles.length ? "title-role" : "title-signal",
      scores,
    };
  }
  const ranked = [...scores].sort(
    (a, b) =>
      b.missions + b.title * 2 - (a.missions + a.title * 2) ||
      a.specialty.localeCompare(b.specialty),
  );
  const winner = ranked[0];
  // Un simple « audit », « sécurité » ou « Python » ne suffit jamais à classer.
  const rules = RULES.find((rule) => rule.specialty === winner.specialty)!.rules;
  const sufficient =
    winner.missions + winner.title * 2 >= 3 &&
    rules.strong.some((pattern) => pattern.test(missions));
  return {
    specialty: sufficient ? winner.specialty : "AUTRE",
    reason: sufficient ? "missions" : "insufficient",
    scores,
  };
}

export function classifySpecialty(title: string, description = ""): TechSpecialty {
  return explainSpecialty(title, description).specialty;
}
