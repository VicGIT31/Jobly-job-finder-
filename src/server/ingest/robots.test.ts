import { describe, expect, it } from "vitest";
import { isPathAllowed, parseRobots } from "./robots";

describe("robots.txt", () => {
  it("applique le groupe qui nous vise avant le groupe générique", () => {
    const rules = parseRobots(
      "User-agent: *\nDisallow: /\n\nUser-agent: Jobly\nAllow: /\nDisallow: /prive/",
    );
    expect(isPathAllowed(rules, "/recrutement")).toBe(true);
    expect(isPathAllowed(rules, "/prive/x")).toBe(false);
  });

  it("retombe sur le groupe « * » et interdit ce qu'il interdit", () => {
    const rules = parseRobots("User-agent: *\nDisallow: /recrutement\nAllow: /recrutement/offres");
    expect(isPathAllowed(rules, "/recrutement")).toBe(false);
    expect(isPathAllowed(rules, "/recrutement/offres/asv")).toBe(true);
    expect(isPathAllowed(rules, "/contact")).toBe(true);
  });

  it("gère les jokers, l'ancre de fin et un fichier vide", () => {
    const rules = parseRobots("User-agent: *\nDisallow: /*.pdf$\nDisallow: /search?*");
    expect(isPathAllowed(rules, "/offre.pdf")).toBe(false);
    expect(isPathAllowed(rules, "/offre.pdf?x=1")).toBe(true);
    expect(isPathAllowed(rules, "/search?q=asv")).toBe(false);
    expect(isPathAllowed(parseRobots(""), "/n-importe-quoi")).toBe(true);
  });

  it("ignore les commentaires et les groupes qui ne nous visent pas", () => {
    const rules = parseRobots(
      "User-agent: Googlebot # moteur\nDisallow: /\n\nUser-agent: *\nDisallow: /admin",
    );
    expect(isPathAllowed(rules, "/offres")).toBe(true);
    expect(isPathAllowed(rules, "/admin")).toBe(false);
  });
});
