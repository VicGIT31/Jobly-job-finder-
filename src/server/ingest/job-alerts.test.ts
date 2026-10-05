import { describe, expect, it } from "vitest";
import { alertJobUrl, parseJobAlert } from "./job-alerts";

const eml = (html: string) => Buffer.from([
  "From: alerts@indeed.com", "To: candidate@example.test",
  "Date: Mon, 05 Oct 2026 10:00:00 +0200", "MIME-Version: 1.0",
  "Content-Type: text/html; charset=utf-8", "Content-Transfer-Encoding: base64", "",
  Buffer.from(html).toString("base64"),
].join("\r\n"));
const card = (title: string, id: string, company = "Entreprise exemple", city = "Paris") =>
  `<table><tr><td><a href="https://fr.indeed.com/rc/clk?jk=${id}&amp;tracking=x">${title}</a>
  <p class="companyName">${company}</p><p class="jobLocation">${city}</p>
  <p>Développement logiciel TypeScript dans l'équipe informatique.</p>
  <a href="https://fr.indeed.com/viewjob?jk=${id}">Postuler</a></td></tr></table>`;

describe("annonces d'alertes email gratuites", () => {
  it("conserve l'identifiant exact Indeed et ignore les liens de recherche", () => {
    expect(alertJobUrl("https://fr.indeed.com/rc/clk?jk=abcdef1234567890&tracking=x"))
      .toBe("https://fr.indeed.com/viewjob?jk=abcdef1234567890");
    expect(alertJobUrl("https://fr.indeed.com/jobs?q=stage")).toBeNull();
    expect(alertJobUrl("https://indeed.com.attacker.test/viewjob?jk=abcdef1234567890")).toBeNull();
    expect(alertJobUrl("javascript:alert(1)")).toBeNull();
  });
  it("décode une destination de suivi sans appeler de serveur et garde le lien de l'annonce", () => {
    const target = "https://www.hellowork.com/fr-fr/emplois/12345678.html";
    expect(alertJobUrl(`https://mail.example.test/click?url=${encodeURIComponent(target)}`)).toBe(target);
  });
  it("décode le MIME et sépare les fiches d'un email multi-annonces sans mélanger leurs entreprises", async () => {
    const result = await parseJobAlert(eml(card("Stage développeur", "abcdef1234567890", "Entreprise A") +
      card("Alternance data engineer", "1234567890abcdef", "Entreprise B", "Lyon")));
    expect(result.offers).toHaveLength(2);
    expect(result.offers.map((offer) => [offer.companyName, offer.city])).toEqual([
      ["Entreprise A", "Paris"], ["Entreprise B", "Lyon"],
    ]);
    expect(result.offers[0].descriptionIsExcerpt).toBe(true);
    expect(result.offers[0].description).toContain("Extrait de l’alerte email");
    expect(result.offers[0].publishedAt).toBeUndefined();
    expect(result.receivedAt?.toISOString()).toBe("2026-10-05T08:00:00.000Z");
  });
  it("n'invente ni entreprise ni lieu et exclut les offres étrangères/CDI/commerciales", async () => {
    const result = await parseJobAlert(eml(
      card("Stage développeur", "aaaaaa1234567890", "", "Paris") +
      card("Stage développeur", "bbbbbb1234567890", "Test", "London") +
      card("CDI Software Engineer", "cccccc1234567890") +
      card("Sales Intern", "dddddd1234567890"),
    ));
    expect(result.offers).toHaveLength(0);
    expect(result.warnings.join(" ")).toContain("entreprise ou lieu illisible");
  });
});
