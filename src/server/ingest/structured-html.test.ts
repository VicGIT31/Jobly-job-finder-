import { describe, expect, it } from "vitest";
import { elementByAttribute, extractMicrodataJobPosting } from "./structured-html";
import { jsonLdOffer } from "./scope";

describe("microdonnées des sites carrières", () => {
  it("lit toute la description malgré les spans imbriqués", () => {
    expect(
      elementByAttribute(
        '<span itemprop="description"><p>Coder <span>en Java</span></p><p>Tester</p></span>',
        "itemprop",
        "description",
      ),
    ).toContain("Tester");
  });
  it("lit les champs SuccessFactors et en tire une vraie offre française", () => {
    const html = `<div itemscope itemtype="http://schema.org/JobPosting">
      <meta itemprop="streetAddress" content="Niort, FR"><meta itemprop="hiringOrganization" content="Capgemini">
      <meta itemprop="datePosted" content="Thu Sep 17 02:00:00 UTC 2026">
      <span itemprop="title">Ingénieur tests - Alternance</span>
      <span itemprop="description"><p>Développer les tests de logiciels.</p><span>Automatiser les tests.</span></span></div>`;
    const posting = extractMicrodataJobPosting(html);
    expect(posting?.hiringOrganization?.name).toBe("Capgemini");
    const offer = jsonLdOffer(posting!, "https://careers.capgemini.com/job/example/123/");
    expect(offer).toMatchObject({ city: "Niort", countryCode: "FR", contractType: "alternance" });
    expect(offer?.description).toContain("Automatiser");
  });
  it("signale l'absence de données structurées", () => {
    expect(
      extractMicrodataJobPosting(
        '<div itemtype="http://schema.org/JobPosting"><descriptif-offre></descriptif-offre></div>',
      ),
    ).toBeNull();
  });
});
