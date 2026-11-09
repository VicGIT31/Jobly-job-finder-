/** Only explicitly recognised public recruiter platforms outrank aggregators. */
export function recruiterRank(url?: string): number {
  if (!url) return 0;
  try {
    const host = new URL(url).hostname;
    return /(^|\.)(?:myworkdayjobs\.com|ashbyhq\.com|lever\.co|greenhouse\.io|smartrecruiters\.com|workable\.com|recruitee\.com|teamtailor\.com|inria\.fr)$/.test(host) || /^(?:careers?|recrutement|emploi)\./.test(host) ? 2 : 1;
  } catch { return 0; }
}
