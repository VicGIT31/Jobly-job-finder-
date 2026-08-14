import { describe, expect, it } from "vitest";
import { nextStatusOnApply } from "./tracker";

describe("nextStatusOnApply", () => {
  it("passe à APPLIED si aucun suivi n'existe encore", () => {
    expect(nextStatusOnApply(null)).toBe("APPLIED");
  });

  it("passe de SAVED à APPLIED", () => {
    expect(nextStatusOnApply("SAVED")).toBe("APPLIED");
  });

  it("ne régresse jamais un statut déjà avancé", () => {
    expect(nextStatusOnApply("APPLIED")).toBe("APPLIED");
    expect(nextStatusOnApply("ASSESSMENT")).toBe("ASSESSMENT");
    expect(nextStatusOnApply("INTERVIEW")).toBe("INTERVIEW");
    expect(nextStatusOnApply("OFFER")).toBe("OFFER");
    expect(nextStatusOnApply("REJECTED")).toBe("REJECTED");
    expect(nextStatusOnApply("WITHDRAWN")).toBe("WITHDRAWN");
  });
});
