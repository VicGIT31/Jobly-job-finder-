import { afterEach, describe, expect, it, vi } from "vitest";
import { sourceDefinitionSchema } from "./catalog";
import { boardEndpoint, extractLinks, PublicBoardConnector, sitemapEntries } from "./public-boards";
import { RateLimitedError } from "../http";
import { fetchJson, fetchText } from "../http";

vi.mock("../robots", () => ({ robotsAllows: vi.fn().mockResolvedValue(true) }));
vi.mock("../http", async (original) => ({
  ...(await original<typeof import("../http")>()),
  fetchJson: vi.fn(),
  fetchText: vi.fn(),
}));
afterEach(() => vi.clearAllMocks());
const definition = (kind: "workday" | "html" | "ashby" = "workday") =>
  sourceDefinitionSchema.parse({
    id: "test",
    label: "Test",
    company: "Test",
    kind,
    queries: ["stage"],
    maxPages: 3,
    url:
      kind === "workday"
        ? "https://ag.wd3.myworkdayjobs.com/fr-FR/Airbus"
        : kind === "ashby"
          ? "https://jobs.ashbyhq.com/test"
          : "https://example.com/careers",
  });

describe("catalogue et endpoints gratuits", () => {
  it("construit un endpoint Workday depuis l'URL carrière, sans token", () => {
    expect(boardEndpoint(definition())).toBe(
      "https://ag.wd3.myworkdayjobs.com/wday/cxs/ag/Airbus/jobs",
    );
  });
  it("refuse les hôtes internes et les domaines incompatibles avec un ATS", () => {
    expect(
      sourceDefinitionSchema.safeParse({
        id: "test",
        label: "Test",
        kind: "html",
        url: "https://127.0.0.1/private",
      }).success,
    ).toBe(false);
    expect(
      sourceDefinitionSchema.safeParse({
        id: "test",
        label: "Test",
        kind: "workday",
        url: "https://example.com/jobs",
      }).success,
    ).toBe(false);
  });
  it("déduplique les liens, décode &amp; et exclut les URLs hors site", () => {
    const html =
      '<a href="/job/1?a=1&amp;b=2">A</a><a href="/job/1?a=1&amp;b=2">B</a><a href="https://evil.example/job/2">C</a>';
    expect(extractLinks(html, "https://example.com", /\/job\//)).toEqual([
      "https://example.com/job/1?a=1&b=2",
    ]);
  });
  it("lit les sitemaps XML, y compris CDATA", () => {
    expect(
      sitemapEntries(
        "<urlset><url><loc><![CDATA[https://example.com/job/1]]></loc><lastmod>2026-10-01</lastmod></url></urlset>",
      ),
    ).toEqual([{ url: "https://example.com/job/1", modified: "2026-10-01" }]);
  });
});

describe("collecteurs publics", () => {
  it("lit les annonces au slug générique d'un sitemap avant de filtrer le métier", async () => {
    vi.mocked(fetchText).mockImplementation(async (url) => {
      if (String(url).endsWith("sitemap.xml"))
        return "<urlset><url><loc>https://example.com/job/mission-1</loc></url><url><loc>https://example.com/job/mission-2</loc></url></urlset>";
      const title = String(url).endsWith("1") ? "Stage développeur" : "CDI développeur";
      return `<script type="application/ld+json">${JSON.stringify({ "@type": "JobPosting", title, description: "Développement logiciel TypeScript et Python", employmentType: title.startsWith("Stage") ? "INTERN" : "FULL_TIME", hiringOrganization: { name: "Test" }, jobLocation: { address: { addressLocality: "Paris", addressCountry: "FR" } } })}</script>`;
    });
    const connector = new PublicBoardConnector({
      ...definition("html"),
      sitemapUrls: ["https://example.com/sitemap.xml"],
    });
    expect(await connector.fetchOffers()).toHaveLength(1);
    expect(connector.coverage).toMatchObject({
      catalogTotal: 2,
      detailsRead: 2,
      accepted: 1,
      complete: true,
    });
  });
  it.each([undefined, 0])(
    "parcourt toutes les pages étudiant quand Workday renvoie total=%s après la première page",
    async (laterTotal) => {
      vi.mocked(fetchJson).mockImplementation(async (url, options) => {
        if (!String(url).endsWith("/jobs"))
          return {
            jobPostingInfo: {
              title: "Stage IA",
              jobDescription: "Développement de modèles Python et logiciels",
              location: "Toulouse",
              country: { descriptor: "France" },
            },
          };
        const body = JSON.parse(options!.body!);
        if (!body.appliedFacets.workerSubType)
          return {
            total: 2000,
            jobPostings: [],
            facets: [
              { facetParameter: "locationCountry", values: [{ descriptor: "France", id: "fr" }] },
              {
                facetParameter: "workerSubType",
                values: [
                  { descriptor: "Trainee / Student (Fixed Term)", id: "student" },
                  { descriptor: "Apprentice", id: "apprentice" },
                  { descriptor: "Permanent", id: "perm" },
                ],
              },
            ],
          };
        const count = body.offset === 40 ? 3 : 20;
        return {
          total: body.offset === 0 ? 43 : laterTotal,
          jobPostings: Array.from({ length: count }, (_, i) => ({
            title: "Stage IA",
            externalPath: `/job/Toulouse/stage-${body.offset + i}`,
          })),
        };
      });
      const connector = new PublicBoardConnector(definition());
      const offers = await connector.fetchOffers();
      expect(offers).toHaveLength(43);
      expect(connector.coverage).toMatchObject({
        catalogTotal: 43,
        listingsSeen: 43,
        detailsRead: 43,
        accepted: 43,
        complete: true,
      });
      const searches = vi
        .mocked(fetchJson)
        .mock.calls.filter(([url]) => String(url).endsWith("/jobs"))
        .map(([, options]) => JSON.parse(options!.body!));
      expect(searches.map((s) => s.offset)).toEqual([0, 0, 20, 40]);
      expect(searches.every((s) => s.searchText === "")).toBe(true);
      expect(searches[1].appliedFacets).toEqual({
        locationCountry: ["fr"],
        workerSubType: ["student", "apprentice"],
      });
    },
  );
  it("repart de la première page après découverte du filtre France et parcourt les pages suivantes", async () => {
    const mock = vi.mocked(fetchJson);
    const detail = {
      jobPostingInfo: {
        title: "Stage développeur",
        jobDescription: "Développement de logiciels TypeScript",
        location: "Toulouse",
        country: { descriptor: "France" },
        startDate: "2026-10-01",
      },
    };
    mock.mockImplementation(async (url, options) => {
      if (!String(url).endsWith("/jobs")) return detail;
      const body = JSON.parse(options!.body!);
      if (!body.appliedFacets.locationCountry)
        return {
          total: 40,
          jobPostings: [],
          facets: [
            {
              values: [
                {
                  facetParameter: "locationCountry",
                  values: [{ descriptor: "France", id: "fr-id" }],
                },
              ],
            },
          ],
        };
      return {
        total: 40,
        jobPostings: [
          {
            title: "Stage développeur",
            externalPath: `/job/Toulouse/stage-${body.offset}`,
            locationsText: "Toulouse",
          },
        ],
      };
    });
    const offers = await new PublicBoardConnector(definition()).fetchOffers();
    expect(offers).toHaveLength(2);
    const searches = mock.mock.calls
      .filter(([url]) => String(url).endsWith("/jobs"))
      .map(([, options]) => JSON.parse(options!.body!));
    expect(searches.map((body) => body.offset)).toEqual([0, 0, 20]);
    expect(searches[1].appliedFacets).toEqual({ locationCountry: ["fr-id"] });
    expect(offers.every((offer) => offer.countryCode === "FR")).toBe(true);
  });
  it("conserve les premières offres quand la pagination suivante est bloquée", async () => {
    vi.mocked(fetchJson).mockImplementation(async (url, options) => {
      if (!String(url).endsWith("/jobs"))
        return {
          jobPostingInfo: {
            title: "Stage développeur",
            jobDescription: "Développement de logiciels en Java",
            location: "Paris",
            country: { descriptor: "France" },
          },
        };
      if (JSON.parse(options!.body!).offset > 0)
        throw new RateLimitedError("ag.wd3.myworkdayjobs.com");
      return {
        total: 40,
        jobPostings: [{ title: "Stage développeur", externalPath: "/job/Paris/stage" }],
      };
    });
    const connector = new PublicBoardConnector(definition());
    expect(await connector.fetchOffers()).toHaveLength(1);
    expect(connector.warnings).not.toHaveLength(0);
  });
  it("ne présente pas une réponse inaccessible comme une collecte vide réussie", async () => {
    vi.mocked(fetchJson).mockResolvedValue(null);
    await expect(new PublicBoardConnector(definition("ashby")).fetchOffers()).rejects.toThrow(
      "absente",
    );
  });
  it("ne réimporte pas les CDI et stages étrangers d'un board mondial", async () => {
    vi.mocked(fetchJson).mockResolvedValue({
      jobs: [
        {
          title: "Software Engineer",
          employmentType: "FullTime",
          location: "Paris",
          descriptionHtml: "Développement de logiciels en TypeScript",
          jobUrl: "https://example.com/job/1",
        },
        {
          title: "Software Intern",
          employmentType: "Intern",
          location: "London",
          address: { postalAddress: { addressCountry: "GB" } },
          descriptionHtml: "Développement de logiciels en TypeScript",
          jobUrl: "https://example.com/job/2",
        },
        {
          title: "Software Intern",
          employmentType: "Intern",
          location: "Paris",
          address: { postalAddress: { addressCountry: "FR" } },
          descriptionHtml: "Développement de logiciels en TypeScript",
          jobUrl: "https://example.com/job/3",
        },
      ],
    });
    expect(await new PublicBoardConnector(definition("ashby")).fetchOffers()).toHaveLength(1);
  });
  it("arrête les pages répétées et signale le rendu dynamique sans annonce", async () => {
    vi.mocked(fetchText).mockResolvedValue('<a href="/job/1">Job</a>');
    const connector = new PublicBoardConnector({
      ...definition("html"),
      pagination: { param: "page", start: 1, step: 1 },
    });
    await connector.fetchOffers();
    expect(connector.warnings).toContain("Pagination répétée par la source ; arrêt");
    vi.mocked(fetchText).mockResolvedValue("<html>Loading...</html>");
    await connector.fetchOffers();
    expect(connector.warnings).toContain(
      "Page sans liens d'offres : rendu dynamique ou format modifié",
    );
  });
});
