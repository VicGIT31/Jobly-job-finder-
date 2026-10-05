import { afterEach, describe, expect, it, vi } from "vitest";
import { parseLinkedInDetails, LinkedInConnector } from "./linkedin";
import { makeStudentOffer } from "../scope";
import { fetchText } from "../http";
vi.mock("../http", async (original) => ({
  ...(await original<typeof import("../http")>()),
  fetchText: vi.fn(),
}));
afterEach(() => vi.clearAllMocks());

describe("contrat des fiches LinkedIn invité", () => {
  it("atteint une deuxième page qui contient une offre nouvelle après une première page de doublons", async () => {
    const card = (id: string) =>
      `<li><a href="https://www.linkedin.com/jobs/view/${id}"></a><h3 class="base-search-card__title">Stage développeur JavaScript</h3><h4 class="base-search-card__subtitle">Entreprise</h4><span class="job-search-card__location">Paris, France</span></li>`;
    vi.mocked(fetchText).mockImplementation(async (value) => {
      const url = new URL(String(value));
      if (/\/jobPosting\//.test(url.pathname))
        return '<div class="show-more-less-html__markup"><p>Stage de développement logiciel en JavaScript et Python à Paris.</p></div>';
      const query = url.searchParams.get("keywords");
      const offset = Number(url.searchParams.get("start"));
      if (offset === 0 && ["stage développeur", "alternance développeur"].includes(query ?? ""))
        return card("1000001") + card("1000002");
      if (offset === 25 && query === "alternance développeur") return card("1000003");
      return "";
    });
    const offers = await new LinkedInConnector().fetchOffers();
    expect(offers.map((offer) => offer.sourceUrl)).toEqual([
      "https://www.linkedin.com/jobs/view/1000001",
      "https://www.linkedin.com/jobs/view/1000002",
      "https://www.linkedin.com/jobs/view/1000003",
    ]);
  });
  it("utilise le contrat de la fiche et ne déduit pas l'alternance d'une capacité d'apprentissage", () => {
    const details = parseLinkedInDetails(
      `<div class="show-more-less-html__markup"><p>Développement logiciel Android.</p><p>Capacité d'apprentissage en autonomie.</p><p>Contract Type:Permanent</p></div><li class="description__job-criteria-item"><h3 class="description__job-criteria-subheader">Employment type</h3><span class="description__job-criteria-text">Full-time</span></li>`,
    )!;
    expect(details.contract).toBe("Full-time");
    expect(
      makeStudentOffer({
        title: "Développeur logiciel",
        company: "Airbus",
        city: "Paris",
        country: "FR",
        description: details.description,
        contract: details.contract,
        url: "https://www.linkedin.com/jobs/view/4472695234/",
      }),
    ).toBeNull();
  });
  it("préserve les paragraphes et les stages explicitement indiqués dans le titre", () => {
    const details = parseLinkedInDetails(
      `<div class="show-more-less-html__markup"><p>Développer des modèles IA Python.</p><p>Stage de six mois à Paris.</p></div><li class="description__job-criteria-item"><h3 class="description__job-criteria-subheader">Employment type</h3><span class="description__job-criteria-text">Full-time</span></li>`,
    )!;
    expect(details.description).toContain("\n\n");
    expect(
      makeStudentOffer({
        title: "Stage IA",
        company: "Entreprise",
        city: "Paris",
        country: "FR",
        description: details.description,
        contract: details.contract,
        url: "https://www.linkedin.com/jobs/view/4472695234/",
      })?.contractType,
    ).toBe("stage");
  });
});
