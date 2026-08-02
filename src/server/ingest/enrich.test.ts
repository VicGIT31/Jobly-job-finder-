import { describe, expect, it } from "vitest";
import { inferContractType, inferEducationLevel, inferRemotePolicy } from "./enrich";

describe("inferRemotePolicy", () => {
  it("reconnaît le télétravail total", () => {
    expect(inferRemotePolicy("Développeur Full Remote")).toBe("remote");
    expect(inferRemotePolicy("Poste 100% télétravail")).toBe("remote");
  });

  it("reconnaît l'hybride, y compris le nombre de jours", () => {
    expect(inferRemotePolicy("Stage data", "Mode hybride")).toBe("hybride");
    expect(inferRemotePolicy("2 jours de télétravail par semaine")).toBe("hybride");
    expect(inferRemotePolicy("Possibilité de télétravail")).toBe("hybride");
  });

  it("privilégie le télétravail total sur l'hybride", () => {
    expect(inferRemotePolicy("Full remote, hybride possible")).toBe("remote");
  });

  it("retombe sur le présentiel par défaut", () => {
    expect(inferRemotePolicy("Stage développeur à Lyon")).toBe("onsite");
    expect(inferRemotePolicy("Poste en présentiel")).toBe("sur site");
  });
});

describe("inferEducationLevel", () => {
  it("reconnaît les niveaux courants", () => {
    expect(inferEducationLevel("Stage Bac+5 en data")).toBe("bac+5");
    expect(inferEducationLevel("Étudiant en Master informatique")).toBe("bac+5");
    expect(inferEducationLevel("Alternance BTS SIO")).toBe("bac+2");
    expect(inferEducationLevel("Licence professionnelle")).toBe("bac+3");
    expect(inferEducationLevel("Doctorat en IA")).toBe("doctorat");
  });

  it("retient le niveau le plus élevé d'une fourchette", () => {
    expect(inferEducationLevel("Profil Bac+3 à Bac+5")).toBe("bac+5");
  });

  it("reste indifférent sans mention", () => {
    expect(inferEducationLevel("Stage développeur web")).toBe("indifférent");
  });
});

describe("inferContractType", () => {
  it("privilégie l'alternance sur le stage", () => {
    expect(inferContractType("Stage / Alternance développeur")).toBe("alternance");
  });

  it("reconnaît un stage", () => {
    expect(inferContractType("Internship — Backend Engineer")).toBe("stage");
    expect(inferContractType("Offre de PFE")).toBe("stage");
  });

  it("renvoie null quand rien n'est reconnaissable", () => {
    expect(inferContractType("Développeur backend Node.js")).toBeNull();
  });
});
