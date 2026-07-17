import { describe, expect, it } from "vitest";
import { normalizeOffer, rawOfferSchema, NormalizationError } from "./normalize";

const validRaw = {
  title: "  Stage — Développeur   Backend ",
  companyName: " Doctolib ",
  city: "paris",
  description: "Une superbe opportunité de stage dans la e-santé française.",
  contractType: "Internship",
  remotePolicy: "Hybride",
  educationLevel: "Master",
  sector: "Tech",
  salaryMin: 1200,
  salaryMax: 1500,
  sourceUrl: "https://example.com/jobs/123",
};

describe("rawOfferSchema", () => {
  it("accepte une offre valide", () => {
    expect(rawOfferSchema.safeParse(validRaw).success).toBe(true);
  });

  it("rejette une offre sans sourceUrl", () => {
    const { sourceUrl: _sourceUrl, ...rest } = validRaw;
    expect(rawOfferSchema.safeParse(rest).success).toBe(false);
  });

  it("rejette une description trop courte", () => {
    expect(rawOfferSchema.safeParse({ ...validRaw, description: "court" }).success).toBe(false);
  });
});

describe("normalizeOffer", () => {
  it("normalise les espaces, la ville et mappe les enums", () => {
    const offer = normalizeOffer(rawOfferSchema.parse(validRaw));
    expect(offer.title).toBe("Stage — Développeur Backend");
    expect(offer.companyName).toBe("Doctolib");
    expect(offer.city).toBe("Paris");
    expect(offer.contractType).toBe("STAGE");
    expect(offer.remotePolicy).toBe("HYBRID");
    expect(offer.educationLevel).toBe("BAC_5");
  });

  it("mappe les synonymes de contrat (apprentissage → ALTERNANCE)", () => {
    const offer = normalizeOffer(
      rawOfferSchema.parse({ ...validRaw, contractType: "apprentissage" }),
    );
    expect(offer.contractType).toBe("ALTERNANCE");
  });

  it("applique les défauts (remote onsite, éducation indifférent)", () => {
    const { remotePolicy: _r, educationLevel: _e, ...rest } = validRaw;
    const offer = normalizeOffer(rawOfferSchema.parse(rest));
    expect(offer.remotePolicy).toBe("ONSITE");
    expect(offer.educationLevel).toBe("INDIFFERENT");
  });

  it("rejette un type de contrat inconnu", () => {
    expect(() =>
      normalizeOffer(rawOfferSchema.parse({ ...validRaw, contractType: "freelance" })),
    ).toThrow(NormalizationError);
  });

  it("rejette les contrats hors périmètre (CDI, CDD, VIE)", () => {
    for (const contractType of ["cdi", "full-time", "cdd", "vie"]) {
      expect(() => normalizeOffer(rawOfferSchema.parse({ ...validRaw, contractType }))).toThrow(
        /hors périmètre/,
      );
    }
  });

  it("rejette salaryMin > salaryMax", () => {
    expect(() =>
      normalizeOffer(rawOfferSchema.parse({ ...validRaw, salaryMin: 2000, salaryMax: 1000 })),
    ).toThrow(NormalizationError);
  });

  it("capitalise les villes composées", () => {
    const offer = normalizeOffer(rawOfferSchema.parse({ ...validRaw, city: "saint-étienne" }));
    expect(offer.city).toBe("Saint-Étienne");
  });
});
