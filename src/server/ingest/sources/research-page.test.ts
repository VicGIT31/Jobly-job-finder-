import { describe, expect, it } from "vitest";
import { inriaOffer } from "./research-page";
const page = (contract = "Convention de stage", date = "2099-12-31") => `<main><h1>Internship Research - LLM privacy</h1><p>Type de contrat : ${contract} Niveau de diplôme exigé : Master</p><h2>A propos du centre</h2><p>Institution informatique</p><h2>Mission confiée</h2><p>Étudier les fuites d'information de modèles LLM avec apprentissage automatique.</p><h2>Informations générales</h2><p>Ville : Palaiseau Centre Inria : Centre de Saclay Date limite pour postuler : ${date}</p></main>`;
describe("stages de recherche Inria", () => {
  it("extrait contrat, commune et échéance sans inventer une publication", () => {
    const offer = inriaOffer(page(), "https://jobs.inria.fr/public/classic/fr/offres/2026-10662");
    expect(offer).toMatchObject({ city: "Palaiseau", companyName: "Inria", contractType: "stage", validThrough: new Date("2099-12-31T23:59:59Z") });
    expect(offer?.publishedAt).toBeUndefined();
    expect(offer?.description).not.toContain("Institution informatique");
  });
  it("écarte les contrats non étudiants, les échéances passées et les lieux absents", () => {
    expect(inriaOffer(page("CDD"), "https://jobs.inria.fr/test")).toBeNull();
    expect(inriaOffer(page("Convention de stage", "2000-01-01"), "https://jobs.inria.fr/test")).toBeNull();
    expect(inriaOffer(page().replace("Ville : Palaiseau", ""), "https://jobs.inria.fr/test")).toBeNull();
  });
});
