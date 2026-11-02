import { describe, expect, it } from "vitest";
import { cityFromText } from "./personal";

describe("lieu d'une fiche sans données structurées", () => {
  it("lit « Commune (code postal) » après le titre et écarte le lieu-dit répété", () => {
    expect(
      cityFromText(
        "Retour à la liste Bazoches Bazoches-sur-Guyonne (78490) CDD Vous aimez les animaux",
      ),
    ).toBe("Bazoches-sur-Guyonne");
    expect(
      cityFromText("Animalier Soigneur Retour à la liste Mauzé-sur-le-Mignon (79210) CDI"),
    ).toBe("Mauzé-sur-le-Mignon");
  });

  it("lit un lieu libellé et s'arrête avant le champ suivant", () => {
    expect(cityFromText("Lieu de travail : Blagnac Contrat : CDI")).toBe("Blagnac");
    expect(cityFromText("Aucune indication de lieu ici.")).toBeUndefined();
  });
});
