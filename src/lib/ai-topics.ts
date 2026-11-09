/** Topics complement the primary specialty; vocabulary shared with search. */
export const AI_TOPIC_LABELS: Record<string, string> = {
  AI_ML: "IA & machine learning", AI_LLM: "LLM & IA générative",
  AI_VISION: "Vision par ordinateur", AI_NLP: "Traitement du langage",
  AI_MLOPS: "MLOps", AI_EMBEDDED: "IA embarquée", DATA_BI: "Data & business intelligence",
};
export const AI_QUERIES = ["intelligence artificielle", "machine learning", "deep learning", "LLM", "computer vision", "NLP", "MLOps", "IA embarquée", "research scientist"] as const;
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
export function aiQueryTopic(query: string): string | null {
  const q = fold(query).trim();
  if (/^(?:ia|ai|ia ml|intelligence artificielle|artificial intelligence|machine learning|deep learning)$/.test(q)) return "AI_ML";
  if (/^(?:llms?|rag|genai|generative ai|ia generative|agents? ia)$/.test(q)) return "AI_LLM";
  if (/^(?:computer vision|vision par ordinateur)$/.test(q)) return "AI_VISION";
  if (/^(?:nlp|traitement du langage|natural language processing)$/.test(q)) return "AI_NLP";
  if (/^mlops$/.test(q)) return "AI_MLOPS";
  return null;
}
