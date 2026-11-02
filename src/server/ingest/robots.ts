/**
 * Respect de robots.txt pour les sites d'employeurs et de cliniques, qui ne
 * sont pas des API publiques : une page interdite n'est jamais demandée.
 * Un robots.txt absent (4xx) autorise ; une réponse illisible (réseau, 5xx)
 * interdit le site pour ce cycle, par prudence.
 */
export type RobotsRules = { allow: string[]; disallow: string[] };

const AGENT = "jobly";
const TTL_MS = 24 * 3_600_000;

/** Règles du groupe qui nous vise (« jobly »), sinon du groupe « * ». */
export function parseRobots(text: string): RobotsRules {
  const groups: Array<{ agents: string[]; allow: string[]; disallow: string[] }> = [];
  let current: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const match = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!match) continue;
    const field = match[1].toLowerCase();
    const value = match[2].trim();
    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], allow: [], disallow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (field === "allow" && value) current.allow.push(value);
    if (field === "disallow" && value) current.disallow.push(value);
  }
  const specific = groups.filter((group) =>
    group.agents.some((agent) => agent !== "*" && AGENT.startsWith(agent)),
  );
  const chosen = specific.length ? specific : groups.filter((group) => group.agents.includes("*"));
  return {
    allow: chosen.flatMap((group) => group.allow),
    disallow: chosen.flatMap((group) => group.disallow),
  };
}

function patternToRegExp(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
}

/** La règle la plus longue l'emporte ; à égalité, « Allow » gagne (RFC 9309). */
export function isPathAllowed(rules: RobotsRules, pathAndQuery: string): boolean {
  let best: { length: number; allowed: boolean } | null = null;
  const consider = (patterns: string[], allowed: boolean) => {
    for (const pattern of patterns) {
      if (!patternToRegExp(pattern).test(pathAndQuery)) continue;
      if (!best || pattern.length > best.length || (pattern.length === best.length && allowed))
        best = { length: pattern.length, allowed };
    }
  };
  consider(rules.disallow, false);
  consider(rules.allow, true);
  return best ? (best as { allowed: boolean }).allowed : true;
}

const cache = new Map<string, { rules: RobotsRules | "deny"; at: number }>();

export function resetRobotsCache(): void {
  cache.clear();
}

async function loadRules(origin: string): Promise<RobotsRules | "deny"> {
  const hit = cache.get(origin);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.rules;
  let rules: RobotsRules | "deny";
  try {
    const response = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": "Jobly/1.0 (public job listings; personal use)" },
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
      cache: "no-store",
    });
    if (response.ok) rules = parseRobots((await response.text()).slice(0, 500_000));
    else if (response.status >= 500) rules = "deny";
    else rules = { allow: [], disallow: [] };
  } catch {
    rules = "deny";
  }
  cache.set(origin, { rules, at: Date.now() });
  return rules;
}

/** Cette page publique peut-elle être demandée par un programme ? */
export async function robotsAllows(url: string | URL): Promise<boolean> {
  const target = typeof url === "string" ? new URL(url) : url;
  const rules = await loadRules(target.origin);
  if (rules === "deny") return false;
  return isPathAllowed(rules, target.pathname + target.search);
}
