import { offerMissionText } from "./offer-text";
const RULES: Array<[string, RegExp]> = [
  ["AI_LLM", /\b(?:llms?|rag|gen\s?ai|generative ai|ia generative|large language models?|retrieval augmented|agents? ia)\b/],
  ["AI_VISION", /computer vision|vision par ordinateur|reconnaissance d.images|object detection|motion estimation|multi[ -]view vision|image segmentation|segmentation (?:d.images|semantique)/],
  ["AI_NLP", /\bnlp\b|natural language processing|traitement (?:automatique )?(?:du langage|des langues)/],
  ["AI_MLOPS", /\bmlops\b|model (?:serving|monitoring)|deploiement (?:de |des )?modeles/],
  ["AI_EMBEDDED", /(?:ia|ai|intelligence artificielle) embarquee?|embedded ai|edge ai|tinyml/],
  ["DATA_BI", /data[ -](?:engineer|analyst|platform|analytics)|business intelligence|power[ -]?bi/],
];
const ML = /intelligence artificielle|artificial intelligence|\b(?:ia|ai)\b(?!\s+engines?\b)|machine learning|deep learning|apprentissage (?:automatique|profond|neuronal|par renforcement)|(?:reinforcement|representation|self[ -]supervised) learning|world models|diffusion models|reseaux? (?:de )?neurone|neural network|\b(?:pytorch|tensorflow|scikit)\b/;
/** Employer boilerplate is excluded when the source exposes a mission section. */
export function aiTopics(title: string, description = ""): string[] {
  const heading = title.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const text = `${heading}\n${offerMissionText(description)}`;
  const topics = RULES.filter(([, re]) => re.test(text)).map(([tag]) => tag);
  if (ML.test(text) || topics.some((tag) => tag.startsWith("AI_"))) topics.unshift("AI_ML");
  return [...new Set(topics)];
}
