import type { SourceConnector } from "./sources/types";

/** A first slot for AI, one for existing trades, one for discovery, one for employers.
 * Round robin afterwards: no domain is removed or placed behind all 76 new queries.
 */
export function scheduleSources(sources: SourceConnector[]): SourceConnector[] {
  const discovery = sources.filter((s) => s.sourceSite === "discovery.jobly");
  const national = sources.filter((s) => s.national);
  const ai = sources.filter((s) => s.priority === "AI" && !discovery.includes(s));
  const personal = sources.filter((s) => s.personal && !s.national && !discovery.includes(s) && !ai.includes(s));
  const employers = sources.filter((s) => !s.personal && !ai.includes(s));
  const result: SourceConnector[] = [];
  const lanes = national.length ? [national, ai, personal, discovery, employers] : [ai, personal, discovery, employers];
  while (lanes.some((lane) => lane.length)) for (const lane of lanes) { const source = lane.shift(); if (source) result.push(source); }
  return result;
}
