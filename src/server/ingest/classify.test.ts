import { describe, expect, it } from "vitest";
import { classifySpecialty } from "./classify";

describe("classifySpecialty", () => {
  it("reconnaît la cybersécurité", () => {
    expect(classifySpecialty("Stage Analyste SOC")).toBe("CYBERSECURITE");
    expect(classifySpecialty("Alternance pentester")).toBe("CYBERSECURITE");
    expect(classifySpecialty("Stage sécurité informatique", "Audit OWASP et vulnérabilités")).toBe(
      "CYBERSECURITE",
    );
  });

  it("reconnaît l'IA et la data science", () => {
    expect(classifySpecialty("Stage Data Scientist")).toBe("IA");
    expect(classifySpecialty("Alternance Machine Learning Engineer")).toBe("IA");
    expect(classifySpecialty("Stage IA générative", "Développement de LLM avec PyTorch")).toBe(
      "IA",
    );
  });

  it("reconnaît le DevOps", () => {
    expect(classifySpecialty("Alternance DevOps")).toBe("DEVOPS");
    expect(classifySpecialty("Stage ingénieur cloud", "Kubernetes, Terraform et CI/CD")).toBe(
      "DEVOPS",
    );
  });

  it("reconnaît le web", () => {
    expect(classifySpecialty("Stage développeur web full stack")).toBe("WEB");
    expect(classifySpecialty("Alternance développeur React")).toBe("WEB");
    expect(classifySpecialty("Stage intégrateur web", "HTML, CSS et WordPress")).toBe("WEB");
  });

  it("reconnaît le software engineering", () => {
    expect(classifySpecialty("Stage ingénieur logiciel C++")).toBe("SOFTWARE");
    expect(classifySpecialty("Alternance développeur mobile Android")).toBe("SOFTWARE");
    expect(classifySpecialty("Software Engineer Intern", "Développement embarqué en Rust")).toBe(
      "SOFTWARE",
    );
  });

  it("reconnaît les réseaux", () => {
    expect(classifySpecialty("Alternance administrateur réseaux")).toBe("RESEAUX");
    expect(classifySpecialty("Stage ingénieur réseaux et télécoms", "Cisco, VLAN, routage")).toBe(
      "RESEAUX",
    );
  });

  it("ne confond pas « réseaux de neurones » avec les réseaux informatiques", () => {
    expect(
      classifySpecialty("Stage deep learning", "Conception de réseaux de neurones convolutifs"),
    ).toBe("IA");
  });

  it("tranche en faveur de la spécialité la plus précise", () => {
    // Une offre cyber mentionne souvent du cloud et du réseau sans être DevOps.
    expect(
      classifySpecialty(
        "Alternance cybersécurité cloud",
        "Sécurité des systèmes, SIEM, réseau et AWS",
      ),
    ).toBe("CYBERSECURITE");
  });

  it("renvoie AUTRE quand le signal est insuffisant", () => {
    expect(classifySpecialty("Stage en entreprise")).toBe("AUTRE");
    expect(classifySpecialty("Alternance chargé de communication")).toBe("AUTRE");
    expect(classifySpecialty("")).toBe("AUTRE");
  });

  it("laisse le titre trancher même face à un corps très bavard", () => {
    // Cas réel remonté par l'ingestion : une annonce « développeur web » dont la
    // description détaille le contexte sécurité de l'entreprise finissait
    // classée en cybersécurité, et disparaissait du filtre « Web ».
    expect(
      classifySpecialty(
        "ALTERNANCE – Développeur solution Web – F/H",
        "Notre équipe sécurité informatique gère les vulnérabilités, l'audit SIEM, " +
          "la conformité RGPD, la sécurité applicative, le SOC et la cryptographie.",
      ),
    ).toBe("WEB");
  });

  it("donne plus de poids au titre qu'au corps de l'annonce", () => {
    // Le corps parle de web, mais le poste est un poste réseau.
    expect(
      classifySpecialty(
        "Alternance ingénieur réseaux",
        "L'équipe maintient aussi un site web en PHP.",
      ),
    ).toBe("RESEAUX");
  });
});
