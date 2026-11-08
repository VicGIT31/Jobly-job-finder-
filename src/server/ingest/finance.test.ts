import { describe, expect, it } from "vitest";
import { classifyJob, isInScope } from "./job-classifier";
import { makeStudentOffer } from "./scope";
import { personalContract } from "./personal-offer";
import { studentContract } from "./scope";
import { queryFamilies } from "@/lib/job-taxonomy";
import { parseOfferSearchParams } from "@/lib/search-params";
import { financeConnectors } from "./sources/finance";

describe("stages et alternances assurance, banque et finance", () => {
  it.each([
    ["Stage BTS Assurance", "INSURANCE"],
    ["Alternance gestionnaire sinistres", "INSURANCE"],
    ["Stage conseiller bancaire", "BANKING"],
    ["Stage contrôle de gestion", "CORPORATE_FINANCE"],
    ["Stage comptable", "ACCOUNTING"],
    ["Stage audit financier", "AUDIT_RISK"],
    ["Stage private equity", "FINANCIAL_MARKETS"],
  ])("classe %s et conserve les critères financiers dans la recherche", (title, family) => {
    const classification = classifyJob(title);
    expect(classification).toMatchObject({ universe: "FINANCE", family });
    expect(isInScope(classification, "STAGE").ok).toBe(true);
    expect(isInScope(classification, "CDI").ok).toBe(false);
  });
  it("préserve le métier réel quand l'employeur est un assureur", () => {
    expect(classifyJob("Stage développeur logiciel assurance").universe).toBe("TECH");
    expect(classifyJob("Stage marketing assurance").universe).toBe("COMMERCE");
    expect(classifyJob("Stage assurance qualité").universe).toBe("OTHER");
    expect(classifyJob("Stage ressources humaines assurance").universe).toBe("OTHER");
  });
  it("accepte un stage assurance dans une commune française hors liste de grandes villes", () => {
    const input = {
      title: "Stage BTS Assurance",
      company: "Cabinet exemple",
      city: "Dax",
      country: "FR",
      description: "Gestion des contrats et indemnisation des sinistres. Formation BTS Assurance.",
      url: "https://example.com/jobs/assurance",
    };
    expect(makeStudentOffer(input)).toMatchObject({
      contractType: "stage",
      countryCode: "FR",
      educationLevel: "bac+2",
    });
    expect(makeStudentOffer({ ...input, country: "BE" })).toBeNull();
    expect(makeStudentOffer({ ...input, title: "CDI Assurance" })).toBeNull();
  });
  it("distingue l'apprentissage d'un simple antécédent de stage sur les boards au contrat INTERN générique", () => {
    const description = "Vous rejoignez notre équipe en contrat d’apprentissage. Une première expérience en stage est appréciée.";
    expect(personalContract("Courtier en assurances BTS", "INTERN", description)).toBe("alternance");
    expect(studentContract("Courtier en assurances BTS", "INTERN", description)).toBe("alternance");
    expect(personalContract("Stage assurance", "INTERN", description)).toBe("stage");
  });
  it("expose le domaine, les synonymes BTS et des requêtes nationales sans lieu imposé", () => {
    expect(queryFamilies("BTS Assurance")).toContain("INSURANCE");
    expect(
      parseOfferSearchParams({ univers: "FINANCE", metier: "INSURANCE", national: "1" }).univers,
    ).toEqual(["FINANCE"]);
    const connectors = financeConnectors();
    expect(connectors.length).toBeGreaterThan(20);
    for (const { connector } of connectors) {
      expect(connector.group).toBe("FINANCE");
      expect(connector.definition.place).toBeUndefined();
      expect(connector.definition.rotatePages).toBe(true);
    }
  });
});
