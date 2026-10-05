import { describe, expect, it } from "vitest";
import {
  employmentContractType,
  extractJobPosting,
  jobLocationCity,
  jobLocationCountry,
  jsonLdText,
} from "./jsonld";

function page(json: string): string {
  return `<html><head><script type="application/ld+json">${json}</script></head><body></body></html>`;
}

describe("extractJobPosting", () => {
  it("extrait un JobPosting simple", () => {
    const posting = extractJobPosting(
      page(JSON.stringify({ "@type": "JobPosting", title: "Stage développeur" })),
    );
    expect(posting?.title).toBe("Stage développeur");
  });

  it("ignore les blocs qui ne sont pas des offres", () => {
    const html =
      page(JSON.stringify({ "@type": "WebSite", name: "Site" })) +
      page(JSON.stringify({ "@type": "JobPosting", title: "Alternance data" }));
    expect(extractJobPosting(html)?.title).toBe("Alternance data");
  });

  it("trouve une offre imbriquée dans un @graph", () => {
    const html = page(
      JSON.stringify({
        "@graph": [{ "@type": "Organization" }, { "@type": "JobPosting", title: "X" }],
      }),
    );
    expect(extractJobPosting(html)?.title).toBe("X");
  });

  it("accepte un @type sous forme de tableau", () => {
    const html = page(JSON.stringify({ "@type": ["JobPosting", "Thing"], title: "Y" }));
    expect(extractJobPosting(html)?.title).toBe("Y");
  });

  it("tolère les caractères de contrôle bruts dans les chaînes", () => {
    // Cas réel : des sites laissent de vrais retours à la ligne dans le JSON,
    // ce que `JSON.parse` refuse. Le bloc doit quand même être lu.
    const html = page('{"@type":"JobPosting","title":"Stage","description":"ligne 1\nligne 2"}');
    const posting = extractJobPosting(html);
    expect(posting?.title).toBe("Stage");
    expect(posting?.description).toContain("ligne 1");
  });

  it("renvoie null quand la page ne contient aucune offre", () => {
    expect(extractJobPosting("<html><body>rien</body></html>")).toBeNull();
    expect(extractJobPosting(page("{ json invalide"))).toBeNull();
  });
});

describe("jobLocation", () => {
  const posting = {
    jobLocation: {
      "@type": "Place",
      address: { addressLocality: "Saint-Denis", addressCountry: "fr" },
    },
  };

  it("lit la ville et le pays", () => {
    expect(jobLocationCity(posting)).toBe("Saint-Denis");
    expect(jobLocationCountry(posting)).toBe("FR");
  });

  it("accepte une liste de lieux", () => {
    expect(jobLocationCity({ jobLocation: [posting.jobLocation] })).toBe("Saint-Denis");
  });

  it("renvoie null sur une offre 100 % distancielle sans lieu", () => {
    expect(jobLocationCity({ jobLocation: null })).toBeNull();
    expect(jobLocationCountry({})).toBeNull();
  });
});

describe("employmentContractType", () => {
  it("reconnaît le stage via le code normalisé", () => {
    expect(employmentContractType({ employmentType: ["INTERN", "FULL_TIME"] })).toBe("stage");
  });

  it("reconnaît l'alternance via le libellé français", () => {
    expect(employmentContractType({ employmentType: "Alternance" })).toBe("alternance");
    expect(employmentContractType({ employmentType: "Contrat d'apprentissage" })).toBe(
      "alternance",
    );
  });

  it("renvoie null hors périmètre", () => {
    expect(employmentContractType({ employmentType: "FULL_TIME" })).toBeNull();
    expect(employmentContractType({})).toBeNull();
  });
});

describe("jsonLdText", () => {
  it("retire les balises échappées Greenhouse et garde les vrais caractères de texte", () => {
    expect(
      jsonLdText(
        "&lt;p&gt;Missions R&amp;D&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Python&lt;/li&gt;&lt;/ul&gt;",
      ),
    ).toBe("Missions R&D\n\n- Python");
    expect(jsonLdText("<p>Exemple : &lt;T&gt; et a &lt; b.</p>")).toBe("Exemple : <T> et a < b.");
  });
  it("convertit le HTML de description en texte lisible", () => {
    expect(jsonLdText("<p>Missions</p><ul><li>Coder</li></ul>")).toBe("Missions\n\n- Coder");
    expect(jsonLdText("R&amp;D chez L&#39;Or&eacute;al")).toContain("R&D");
  });
});
