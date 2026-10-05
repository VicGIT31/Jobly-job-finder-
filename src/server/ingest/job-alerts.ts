import { simpleParser } from "mailparser";
import { load } from "cheerio";
import { makeStudentOffer } from "./scope";
import type { RawOffer } from "./normalize";

/** Liens d'annonces uniquement ; ne charge ni pixels ni liens de suivi du mail. */
export function alertJobUrl(value: string, depth = 0): string | null {
  if (depth > 3) return null;
  try {
    const url = new URL(value.replace(/&amp;/g, "&"));
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    if (host === "indeed.com" || host.endsWith(".indeed.com")) {
      const key = url.searchParams.get("jk") ?? url.searchParams.get("vjk");
      if (key && /^[a-z0-9_-]{6,64}$/i.test(key))
        return `https://fr.indeed.com/viewjob?jk=${encodeURIComponent(key)}`;
    }
    if (
      (host === "linkedin.com" || host.endsWith(".linkedin.com")) &&
      /\/jobs\/view\//.test(url.pathname)
    ) {
      const id = /\/jobs\/view\/(?:[^/]*-)?(\d{6,})\/?$/.exec(url.pathname)?.[1];
      if (id) return `https://www.linkedin.com/jobs/view/${id}/`;
    }
    const allowed = [
      { host: "www.hellowork.com", path: /^\/fr-fr\/emplois\/\d+\.html$/ },
      { host: "www.welcometothejungle.com", path: /^\/fr\/companies\/[^/]+\/jobs\/[^/]+\/?$/ },
      { host: "www.apec.fr", path: /^\/candidat\/.*detail-offre\/[^/]+$/ },
      { host: "candidat.francetravail.fr", path: /^\/offres\/recherche\/detail\/[^/]+$/ },
      { host: "www.jobteaser.com", path: /^\/(?:fr|en)\/job-offers\/[^/]+$/ },
    ];
    if (allowed.some((rule) => host === rule.host && rule.path.test(url.pathname))) {
      url.search = "";
      url.hash = "";
      return url.href;
    }
    for (const key of ["url", "redirect", "redirectUrl", "redirect_url", "dest", "u", "job_url"]) {
      const target = url.searchParams.get(key);
      if (target) {
        const resolved = alertJobUrl(target, depth + 1);
        if (resolved) return resolved;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export type AlertParseResult = { offers: RawOffer[]; warnings: string[]; receivedAt?: Date };

/** Exige titre, entreprise, lieu et contrat étudiant explicite, sans données inventées. */
export async function parseJobAlert(input: Buffer): Promise<AlertParseResult> {
  const mail = await simpleParser(input, { skipImageLinks: true, skipTextToHtml: true });
  const offers = new Map<string, RawOffer>();
  const warnings: string[] = [];
  const receivedAt = mail.date;
  if (!mail.html)
    return { offers: [], receivedAt, warnings: ["Mail sans HTML : format non pris en charge"] };
  const $ = load(mail.html);
  $("script,style,img,iframe").remove();
  $("a[href]").each((_, element) => {
    const anchor = $(element);
    const url = alertJobUrl(anchor.attr("href") ?? "");
    if (!url || offers.has(url)) return;
    const title = (anchor.attr("data-job-title") ?? anchor.text()).replace(/\s+/g, " ").trim();
    if (title.length < 3 || /^(postuler|apply|voir l.offre|view job|en savoir plus)$/i.test(title))
      return;
    let card = anchor.parent();
    for (let level = 0; level < 8; level++) {
      const parent = card.parent();
      if (!parent.length || ["body", "html"].includes(parent.prop("tagName")?.toLowerCase() ?? ""))
        break;
      const jobs = new Set(
        parent
          .find("a[href]")
          .toArray()
          .map((link) => alertJobUrl($(link).attr("href") ?? ""))
          .filter(Boolean),
      );
      if (jobs.size > 1) break;
      card = parent;
    }
    const company = card
      .find(
        '[data-company], [data-company-name], [itemprop="hiringOrganization"], [class*="company" i], [class*="employer" i]',
      )
      .first();
    const location = card
      .find(
        '[data-location], [itemprop="addressLocality"], [class*="location" i], [class*="jobcity" i]',
      )
      .first();
    const contract = card
      .find(
        '[data-contract], [itemprop="employmentType"], [class*="contract" i], [class*="jobtype" i]',
      )
      .first();
    const companyName =
      company.attr("data-company") ?? company.attr("data-company-name") ?? company.text();
    const city = location.attr("data-location") ?? location.text();
    if (!companyName.trim() || !city.trim()) {
      warnings.push(`Annonce ignorée (entreprise ou lieu illisible) : ${url}`);
      return;
    }
    const excerpt = card.text().replace(/\s+/g, " ").trim();
    const offer = makeStudentOffer({
      title,
      company: companyName,
      city,
      description: `Extrait de l’alerte email :\n\n${excerpt}\n\nConsultez l’annonce d’origine pour la description complète.`,
      contract: contract.attr("data-contract") ?? contract.text(),
      url,
    });
    if (offer) offers.set(url, { ...offer, descriptionIsExcerpt: true });
  });
  if (!offers.size && !warnings.length)
    warnings.push("Aucune annonce complète France/tech/stage-alternance reconnue dans ce mail");
  return { offers: [...offers.values()], warnings, receivedAt };
}
