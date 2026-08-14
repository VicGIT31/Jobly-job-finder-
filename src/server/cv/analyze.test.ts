import { describe, expect, it } from "vitest";
import { computeCvMatch } from "./analyze";

describe("computeCvMatch", () => {
  it("retourne null si l'offre ne contient aucun mot-clé reconnu", () => {
    const result = computeCvMatch(
      "Développeur React avec 3 ans d'expérience",
      "Nous cherchons une personne motivée et rigoureuse pour rejoindre l'équipe.",
    );
    expect(result).toBeNull();
  });

  it("100% si tous les mots-clés de l'offre sont dans le CV", () => {
    const result = computeCvMatch(
      "Expérience en React, TypeScript et Docker sur plusieurs projets.",
      "Nous recherchons un profil maîtrisant React et TypeScript.",
    );
    expect(result?.score).toBe(100);
    expect(result?.found.sort()).toEqual(["react", "typescript"]);
    expect(result?.missing).toEqual([]);
  });

  it("liste found/missing correctement quand partiel", () => {
    const result = computeCvMatch(
      "Compétences : Python, Django, PostgreSQL.",
      "Le poste demande Python, Kubernetes et AWS.",
    );
    expect(result?.found).toEqual(["python"]);
    expect(result?.missing.sort()).toEqual(["aws", "kubernetes"]);
    expect(result?.score).toBe(33);
  });

  it("insensible aux accents et à la casse", () => {
    const result = computeCvMatch(
      "MAÎTRISE DE CYBERSÉCURITÉ ET LINUX",
      "Poste orienté cybersécurité.",
    );
    expect(result?.found).toEqual(["cybersécurité"]);
  });

  it("0% si aucun mot-clé de l'offre n'est dans le CV", () => {
    const result = computeCvMatch(
      "Expérience en vente et relation client.",
      "Poste de développeur Python avec Django.",
    );
    expect(result?.score).toBe(0);
    expect(result?.found).toEqual([]);
  });
});
