import type { TechSpecialty } from "@prisma/client";

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
 * titre pèse le double du corps, car c'est là que le métier est nommé.
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
 * Ordre = priorité en cas d'égalité de score : du plus spécifique au plus
 * générique. `SOFTWARE` ferme la marche, c'est le métier « développeur » par
 * défaut une fois les spécialités écartées.
 */
const RULES: Array<{ specialty: TechSpecialty; rules: Rules }> = [
  {
    specialty: "CYBERSECURITE",
    rules: {
      strong: [
        /cyber\s?securite/,
        /securite\s+(informatique|des\s+systemes|offensive|defensive|applicative|reseau)/,
        /\bpentest/,
        /penetration\s+test/,
        /\bsoc\b/,
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
        /machine\s+learning/,
        /deep\s+learning/,
        /data\s+scien/,
        /\bnlp\b/,
        /\bllm\b/,
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
        /\bdevops\b/,
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
        /(administrateur|ingenieur|technicien)\s+(systemes?\s+et\s+)?reseaux?/,
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
        /\bc#\b/,
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

const STRONG_WEIGHT = 3;
const WEAK_WEIGHT = 1;
/** Le titre nomme le métier : ce qu'il contient compte double. */
const TITLE_MULTIPLIER = 2;
/** En dessous, le signal est trop faible pour étiqueter sans risque. */
const MIN_SCORE = 3;
/**
 * Score minimum, dans le **titre seul**, à partir duquel le titre tranche.
 *
 * Vaut un signal fort : « Développeur solution Web » nomme le métier. Sans
 * cette règle, une annonce web dont le corps détaille le contexte sécurité de
 * l'entreprise finissait classée en cybersécurité — le candidat ne la trouvait
 * plus dans le filtre « Web » où il l'attendait.
 */
const TITLE_DECISIVE = STRONG_WEIGHT;

function scoreText(text: string, rules: Rules): number {
  let score = 0;
  for (const pattern of rules.strong) if (pattern.test(text)) score += STRONG_WEIGHT;
  for (const pattern of rules.weak) if (pattern.test(text)) score += WEAK_WEIGHT;
  return score;
}

/**
 * Détermine la spécialité d'une offre. Renvoie `AUTRE` quand aucun signal
 * suffisant n'est trouvé.
 */
export function classifySpecialty(title: string, description = ""): TechSpecialty {
  const foldedTitle = fold(title);
  // La description est tronquée : les missions sont en tête, le boilerplate
  // RH (« rejoignez-nous », avantages) en fin, et il fausserait le score.
  const foldedBody = fold(description.slice(0, 2500));

  const scored = RULES.map(({ specialty, rules }) => ({
    specialty,
    title: scoreText(foldedTitle, rules),
    body: scoreText(foldedBody, rules),
  }));

  const bestTitle = Math.max(...scored.map((s) => s.title));

  // Le titre nomme explicitement un métier : il décide, le corps ne sert plus
  // qu'à départager deux spécialités également nommées dans le titre.
  if (bestTitle >= TITLE_DECISIVE) {
    // `>` strict à chaque comparaison : à égalité, la spécialité déclarée en
    // premier dans RULES (la plus spécifique) l'emporte.
    const winner = scored.reduce((best, current) =>
      current.title > best.title || (current.title === best.title && current.body > best.body)
        ? current
        : best,
    );
    return winner.specialty;
  }

  // Titre muet (« Alternance F/H », « Stage 6 mois ») : on s'appuie sur le corps.
  const winner = scored.reduce((best, current) => {
    const score = current.title * TITLE_MULTIPLIER + current.body;
    const bestScore = best.title * TITLE_MULTIPLIER + best.body;
    return score > bestScore ? current : best;
  });
  const winnerScore = winner.title * TITLE_MULTIPLIER + winner.body;

  return winnerScore >= MIN_SCORE ? winner.specialty : "AUTRE";
}
