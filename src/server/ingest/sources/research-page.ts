import { load } from "cheerio";
import { htmlToText } from "../html-to-text";
import { makeStudentOffer } from "../scope";

/** Inria's public detail is semantic HTML, not a JSON-LD JobPosting. */
export function inriaOffer(html: string, url: string) {
  const $ = load(html), main = $("main").first();
  main.find("script,style,nav,footer").remove();
  const title = main.find("h1").first().text().trim() || $("h1").first().text().trim();
  const flat = main.text().replace(/\s+/g, " ");
  const city = /Ville\s*:\s*(.+?)(?=\s+(?:Centre Inria|Date |Dur[eé]e|Pays|R[eé]gion)\s*:|$)/i.exec(flat)?.[1]?.trim();
  const contract = /Type de contrat\s*:\s*(.+?)(?=\s+(?:Niveau|Fonction|A propos)\b|$)/i.exec(flat)?.[1] ?? "";
  if (!/stage|apprenti|alternance/i.test(contract) || !city) return null;
  const deadline = /Date limite pour postuler\s*:\s*(\d{4}-\d{2}-\d{2})/i.exec(flat)?.[1];
  const heading = main.find("h2,h3").filter((_, el) => /mission confi[eé]e/i.test($(el).text())).first();
  const description = heading.length ? htmlToText(`${$.html(heading)}${heading.nextUntil("h2").map((_, el) => $.html(el)).get().join("\n")}`) : htmlToText(main.html() ?? "");
  return makeStudentOffer({ title, company: "Inria", city, country: "FR", contract, description,
    url, ...(deadline ? { validThrough: `${deadline}T23:59:59Z` } : {}) });
}
