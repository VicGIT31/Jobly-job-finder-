import { describe, expect, it } from "vitest";
import { queryFamilies, experienceFrom, qualificationFrom } from "@/lib/job-taxonomy";
import { classifyJob } from "./job-classifier";
import { distanceKm, TOULOUSE } from "@/lib/geo";
import { geocodeCity } from "./sources/geocode";
import { personalContract, makePersonalOffer, PERSONAL_CONTRACTS } from "./personal-offer";
import { normalizeOffer, rawOfferSchema } from "./normalize";
import { samePersonalOffer } from "./personal-dedup";
import { extractJobPosting } from "./jsonld";

describe("Métiers personnels et géographie", () => {
  it.each(["ASV H/F", "Auxiliaire spécialisé(e) vétérinaire", "Assistant(e) vétérinaire", "Veterinary nurse", "AVQ diplômé"])("reconnaît %s comme ASV", (title) => expect(classifyJob(title).universe).toBe("ASV"));
  it.each(["Vétérinaire généraliste avec 4 ASV", "Chirurgien vétérinaire", "Vétérinaire canin", "Développeur logiciel", "Testeur Fonctionnel de Logiciels Marketing & CRM"])("écarte %s de la recherche ASV", (title) => expect(classifyJob(title).universe).not.toBe("ASV"));
  it.each([["Business developer", "BUSINESS_DEVELOPMENT"], ["Chargée de marketing digital", "MARKETING"], ["Vendeur polyvalent", "RETAIL"], ["Customer success manager", "CUSTOMER_SERVICE"], ["Account manager", "SALES"], ["Commercial Développeur Quart Sud-Ouest", "SALES"], ["Acheteur Category Manager", "RETAIL"], ["Community manager", "COMMUNICATION"]])("classe %s", (title, family) => expect(classifyJob(title).family).toBe(family));
  it("n’infère pas un métier commercial depuis le texte publicitaire de l’employeur", () => expect(classifyJob("Ingénieur logiciel", "Notre équipe marketing et nos commerciaux").universe).toBe("TECH"));
  it("classe un soigneur animalier comme métier voisin de l’ASV, pas comme ASV", () => { const job = classifyJob("Soigneur animalier"); expect(job.universe).toBe("ASV"); expect(job.family).toBe("ANIMAL_CARE"); });
  it("rapproche les synonymes et conserve les métiers distincts", () => { expect(queryFamilies("business developer", "COMMERCE")).toEqual(["BUSINESS_DEVELOPMENT"]); expect(queryFamilies("commercial", "COMMERCE")).toContain("RETAIL"); expect(queryFamilies("ASV", "ASV")).toEqual(["ASV"]); });
  it("inclut Blagnac, Colomiers et Labège dans 30 km, mais pas Montpellier", () => { for (const city of ["Blagnac", "Colomiers", "Labège", "Balma", "Muret"]) expect(distanceKm(TOULOUSE, geocodeCity(city)!)).toBeLessThan(30); expect(distanceKm(TOULOUSE, geocodeCity("Montpellier")!)).toBeGreaterThan(100); expect(geocodeCity("Commune inventée")).toBeNull(); });
  it("ne transforme pas une ancienneté inconnue en débutant", () => { expect(experienceFrom("ASV", "Nous recrutons une personne motivée")).toBe("UNKNOWN"); expect(experienceFrom("Commercial junior", "")).toBe("JUNIOR"); expect(qualificationFrom("Diplôme APFORM exigé. Équipe bienveillante.")).toContain("APFORM"); });
});
describe("Métadonnées et formats constatés sur les sources", () => {
  it("ne classe pas un testeur logiciel comme un métier marketing", () => expect(classifyJob("Testeur Fonctionnel de Logiciels Marketing & CRM").universe).toBe("TECH"));
  it("identifie un contrat salarié ou indépendant explicitement annoncé", () => { expect(personalContract("ASV de nuit", "", "Dans un remplacement nous recrutons un ASV de nuit en CDD de trois mois")).toBe("cdd"); expect(personalContract("Agent commercial", "Profession commerciale - Emploi non salarié")).toBe("employment_freelance"); });
  it("ne classe pas une proposition de CDI après alternance comme une offre CDI actuelle", () => expect(personalContract("Alternance marketing", "CDI", "")).toBe("alternance"));
  it("préserve les inconnues et la différence entre collecte et publication", async () => { const raw = await makePersonalOffer({ title: "Commercial H/F", company: "Entreprise réelle", city: "Toulouse", description: "Vous accueillez et accompagnez les clients dans leurs projets.", url: "https://example.org/jobs/1" }); const normalized = normalizeOffer(rawOfferSchema.parse(raw), { personal: true, acceptedContracts: PERSONAL_CONTRACTS }); expect(normalized.contractType).toBe("UNKNOWN"); expect(normalized.remotePolicy).toBe("UNKNOWN"); expect(normalized.publishedAt).toBeNull(); expect(normalized.salaryPeriod).toBe("UNKNOWN"); expect(normalized.scrapedAt).toBeInstanceOf(Date); });
  it("conserve les centimes des salaires horaires", async () => { const raw = await makePersonalOffer({ title: "Commercial H/F", company: "Employeur", city: "Toulouse", description: "Vous accompagnez les clients dans leurs projets.", url: "https://example.org/emploi", salaryMin: 12.42, salaryPeriod: "HOUR" }); expect(raw?.salaryMin).toBe(12.42); expect(normalizeOffer(raw!, { personal: true, acceptedContracts: PERSONAL_CONTRACTS }).salaryMin).toBe(12.42); });
  it("lit le JSON-LD dont le type MIME encode le signe plus, observé chez HelloWork", () => expect(extractJobPosting('<script type="application/ld&#x2B;json">{"@type":"JobPosting","title":"Commercial Toulouse"}</script>')?.title).toBe("Commercial Toulouse"));
});

describe("Regroupement entre sources", () => {
  const body = Array.from({ length: 160 }, (_, i) => `compétence${i} mission${i} client${i}`).join(" ");
  const base = { title: "Commercial H/F", city: "Toulouse", companyName: "Employeur", contractType: "CDI", description: body, publishedAt: new Date("2026-11-01"), sourceUrl: "https://source-a.fr/jobs/1" };
  it("regroupe une réplique substantielle avec son introduction de job board", () => expect(samePersonalOffer(base, { ...base, sourceUrl: "https://source-b.fr/offres/3", description: "Présentation du poste et de notre employeur. " + body })).toBe(true));
  it("préserve deux réquisitions d’un même employeur sur un même site", () => expect(samePersonalOffer(base, { ...base, sourceUrl: "https://source-a.fr/jobs/2" })).toBe(false));
  it("préserve des contrats, missions ou références distinctes", () => { expect(samePersonalOffer(base, { ...base, contractType: "CDD", sourceUrl: "https://source-b.fr/3" })).toBe(false); expect(samePersonalOffer(base, { ...base, description: body.replaceAll("client", "animal"), sourceUrl: "https://source-b.fr/3" })).toBe(false); expect(samePersonalOffer({ ...base, description: body + " Référence du poste : REF1234" }, { ...base, description: body + " Référence du poste : REF9999", sourceUrl: "https://source-b.fr/3" })).toBe(false); });
});
