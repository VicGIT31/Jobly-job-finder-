import { describe, expect, it } from "vitest";
import {
  frenchLocation,
  isTechOffer,
  jsonLdOffer,
  makeStudentOffer,
  studentContract,
  validDate,
} from "./scope";

describe("périmètre France / stage-alternance tech", () => {
  it("se fonde sur les missions, sans confondre le secteur de l'employeur et le poste", () => {
    expect(
      isTechOffer(
        "Stage contrôle qualité",
        "Notre entreprise fait du cloud, du Python et de la cybersécurité.\nVos missions\nContrôler la conformité dimensionnelle des pièces mécaniques.",
      ),
    ).toBe(false);
    expect(
      isTechOffer(
        "Stage simulation",
        "Vos missions\nDévelopper des simulations en MATLAB et Simulink.",
      ),
    ).toBe(true);
    expect(
      isTechOffer(
        "Stage Community Manager Transformation IA",
        "Animation des réseaux sociaux et du plan de communication.",
      ),
    ).toBe(false);
    expect(isTechOffer("Ingénieure / Ingénieur GRC - Stage")).toBe(true);
    expect(isTechOffer("Stage Analyste SOC")).toBe(true);
  });
  it("distingue le support SAP de la gestion des commandes en magasin", () => {
    expect(isTechOffer("Junior SAP Specialist - Apprenticeship")).toBe(true);
    expect(isTechOffer("Digital Merchandiser (WaterSports)")).toBe(false);
    expect(studentContract("Junior SAP Specialist - Apprenticeship")).toBe("alternance");
    expect(
      isTechOffer(
        "Junior Talent Development Specialist - apprenticeship",
        "Nos outils SAP et cloud",
      ),
    ).toBe(false);
    expect(
      isTechOffer("Junior Apprenticeship FP&A - Contrôleur de Gestion", "Développement SQL et SAP"),
    ).toBe(false);
    expect(isTechOffer("Junior Project Manager HR & Data - Apprenticeship")).toBe(false);
    expect(
      isTechOffer("Junior Project Manager - Apprenticeship", "Managing cybersecurity projects"),
    ).toBe(true);
    expect(
      isTechOffer("STAGE SERVICES ET EXPERIENCE CLIENT - Gestion du digital (commandes)"),
    ).toBe(false);
  });
  it("distingue un métier tech d'un stage RH ou communication qui mentionne l'IA", () => {
    expect(isTechOffer("Stage Ressources Humaines - Compétences & Digitalisation")).toBe(false);
    expect(isTechOffer("Stage communication et montée en compétences en IA")).toBe(false);
    expect(isTechOffer("Stage Data Analyst Marketing")).toBe(true);
  });
  it("ne transforme pas la capacité d'apprentissage ni les emplois permanents en alternance", () => {
    expect(
      studentContract(
        "Développeur logiciel",
        "",
        "Capacité d'apprentissage en autonomie. Développement logiciel",
      ),
    ).toBeNull();
    expect(
      studentContract(
        "Développeur logiciel",
        "alternance",
        "Contract Type:PermanentClasse Emploi: F12",
      ),
    ).toBeNull();
    expect(
      studentContract(
        "Data Scientist",
        "",
        "Missions data. Contract Type:InternshipExperience Level:Student",
      ),
    ).toBe("stage");
  });
  it("exclut les stages de communication ou achats même si le groupe se présente comme digital", () => {
    expect(
      isTechOffer(
        "Stage Chargé de Communication",
        "Notre groupe est un leader du digital et de la data",
      ),
    ).toBe(false);
    expect(
      isTechOffer("Stage Legal Fusions & Acquisitions", "Transformation digitale de l'entreprise"),
    ).toBe(false);
    expect(isTechOffer("Stage Gestion de projet IA & Achats 4.0")).toBe(true);
    expect(
      isTechOffer(
        "Stage Ingénieur méthodes",
        "Développer des scripts Python pour automatiser nos processus",
      ),
    ).toBe(true);
  });
  it("ne confond pas développement commercial et développement logiciel", () => {
    expect(
      isTechOffer(
        "Stage commerce - développer l'activité commerciale",
        "Suite Google informatique",
      ),
    ).toBe(false);
    expect(isTechOffer("Stage développeur Java")).toBe(true);
    expect(isTechOffer("Alternance Ingénieur tests technico-fonctionnels")).toBe(true);
    expect(isTechOffer("Stage Référent Handicap", "Transformation digitale et data")).toBe(false);
    expect(isTechOffer("Business Developer Intern", "Notre technologie data et logiciel")).toBe(
      false,
    );
    expect(isTechOffer("Sales Intern", "Notre logiciel et nos solutions cloud")).toBe(false);
    expect(isTechOffer("Approvisionneur - Stage", "Entreprise de cloud et logiciels")).toBe(false);
  });
  it("privilégie le contrat de l'annonce aux mentions de stages dans le texte", () => {
    expect(
      studentContract("Software Engineer", "CDI", "Vous avez déjà effectué un stage"),
    ).toBeNull();
    expect(studentContract("Stage informatique", "Intérim - Contrat travail")).toBeNull();
    expect(studentContract("Alternance développeur", "INTERN")).toBe("alternance");
    expect(studentContract("Stage développeur", "CDD - Contrat apprentissage")).toBe("alternance");
    expect(studentContract("Stage développeur", "INTERN", "Nous accueillons des alternants")).toBe(
      "stage",
    );
    expect(studentContract("Data Intern", "Full time")).toBe("stage");
    expect(
      studentContract("Software Engineer", "FullTime", "Join our early-stage startup"),
    ).toBeNull();
    expect(
      studentContract("Senior Fullstack Engineer", "", "Prior internship experience required"),
    ).toBeNull();
  });
  it("rejette les pays étrangers et les lieux inconnus, y compris les homonymes", () => {
    expect(frenchLocation("Paris", "US")).toBe(false);
    expect(frenchLocation("Remote, Europe")).toBe(false);
    expect(frenchLocation("Paris, United States")).toBe(false);
    expect(frenchLocation("Toulouse Area")).toBe(true);
    expect(frenchLocation("Une petite commune", "FR")).toBe(true);
  });
  it("ne fabrique pas de date de publication et valide les URLs", () => {
    expect(validDate("not-a-date")).toBeUndefined();
    expect(
      makeStudentOffer({
        title: "Stage développeur",
        company: "Test",
        city: "Paris",
        description: "Développement de logiciels en TypeScript",
        url: "javascript:alert(1)",
      }),
    ).toBeNull();
  });
  it("choisit un bureau français et rejette une annonce explicitement expirée", () => {
    const posting = {
      title: "Stage développeur",
      description: "Développement de logiciels en TypeScript",
      hiringOrganization: { name: "Test" },
      employmentType: "INTERN",
      jobLocation: [
        { address: { addressLocality: "London", addressCountry: "GB" } },
        { address: { addressLocality: "Paris", addressCountry: "FR" } },
      ],
    };
    expect(jsonLdOffer(posting, "https://example.com/job/1")?.city).toBe("Paris");
    expect(
      jsonLdOffer({ ...posting, validThrough: "2020-01-01" }, "https://example.com/job/1"),
    ).toBeNull();
  });
});
