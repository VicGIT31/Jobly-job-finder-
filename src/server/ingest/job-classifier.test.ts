import { describe, expect, it } from "vitest";
import { experienceFrom } from "@/lib/job-taxonomy";
import { classifyJob, deriveTags, isInScope } from "./job-classifier";

const family = (title: string, description = "", context = {}) => {
  const job = classifyJob(title, description, context);
  return `${job.universe}/${job.family}`;
};

describe("Santé animale : auxiliaires vétérinaires", () => {
  it.each([
    "ASV H/F",
    "Auxiliaire spécialisé(e) vétérinaire",
    "Assistant(e) vétérinaire",
    "Assistante de clinique vétérinaire",
    "Auxiliaire de santé animale",
    "Infirmier(ère) vétérinaire",
    "Veterinary nurse",
    "AVQ diplômé",
  ])("reconnaît %s comme ASV", (title) => expect(family(title)).toBe("ASV/ASV"));

  it("range l'accueil et la gestion de clinique à part, sans les confondre avec un ASV", () => {
    expect(family("Réceptionniste clinique vétérinaire")).toBe("ASV/VET_SUPPORT");
    expect(family("Secrétaire vétérinaire")).toBe("ASV/VET_SUPPORT");
    expect(family("Responsable de clinique vétérinaire")).toBe("ASV/VET_SUPPORT");
    expect(family("Assistant(e) administratif(ve) – clinique vétérinaire")).toBe("ASV/VET_SUPPORT");
  });

  it("n'attribue pas à la santé animale les fonctions support d'un groupe vétérinaire", () => {
    expect(family("Responsable RH", "Groupe vétérinaire", { company: "Sevetys" })).toBe(
      "OTHER/OTHER",
    );
    expect(family("Chargé de marketing", "", { company: "Sevetys" })).toBe("COMMERCE/MARKETING");
  });

  it("qualifie un intitulé générique par l'employeur, jamais seul", () => {
    const missions =
      "Vous assistez le vétérinaire en consultation : contention des animaux, aide opératoire, soins.";
    expect(family("Assistant(e)", missions, { company: "Sevetys" })).toBe("ASV/ASV");
    expect(
      family("Réceptionniste", "Rejoignez notre clinique vétérinaire. Accueil et standard."),
    ).toBe("ASV/VET_SUPPORT");
    expect(family("Assistant(e)", missions, { company: "Boulangerie Martin" })).toBe("OTHER/OTHER");
  });

  it("déduit un ASV des missions seulement avec un contexte vétérinaire et plusieurs signaux forts", () => {
    const missions =
      "Missions : contention des animaux, aide opératoire au bloc, prise de sang, stérilisation du matériel.";
    expect(family("Agent polyvalent", missions, { company: "Clinique vétérinaire du Parc" })).toBe(
      "ASV/ASV",
    );
    expect(family("Agent polyvalent", missions, { company: "Entreprise X" })).toBe("OTHER/OTHER");
  });

  it.each([
    "Vétérinaire généraliste avec 4 ASV",
    "Chirurgien vétérinaire",
    "Vétérinaire canin",
    "Remplaçant vétérinaire",
    "Stagiaire vétérinaire",
  ])("écarte %s : un vétérinaire n'est pas un ASV", (title) =>
    expect(family(title)).toBe("OTHER/OTHER"),
  );

  it("range les métiers voisins (SPA, refuge, soigneur) sans les faire passer pour des ASV", () => {
    expect(
      family("Chargée de gestion et de management de refuge SPA F/H – contrat d'apprentissage"),
    ).toBe("ASV/ANIMAL_CARE");
    expect(family("Responsable de dispensaire SPA H/F - CDI - temps plein")).toBe(
      "ASV/VET_SUPPORT",
    );
    // De la vente en animalerie : un métier de commerce, retrouvé par le tag « Univers animalier ».
    for (const title of [
      "Vendeur conseil capacitaire en animalerie H/F",
      "Soigneur Vendeur Animalerie H/F",
    ]) {
      expect(family(title, "", { company: "Maxi Zoo" })).toBe("COMMERCE/RETAIL");
      expect(classifyJob(title, "", { company: "Maxi Zoo" }).tags).toContain("UNIVERS_ANIMALIER");
    }
    const spa =
      "Depuis 1845, la Société Protectrice des Animaux (SPA) agit pour la protection des animaux dans ses refuges.";
    expect(family("RESPONSABLE DE SITE (H/F)", spa, { company: "SPA" })).toBe("ASV/ANIMAL_CARE");
    expect(family("Responsable informatique", spa, { company: "SPA" })).not.toBe("ASV/ANIMAL_CARE");
    expect(
      family("Responsable de site", "Entreprise de nettoyage industriel.", {
        company: "Propreté Sud",
      }),
    ).toBe("OTHER/OTHER");
    for (const title of [
      "Soigneur animalier",
      "Agent d'accueil refuge SPA",
      "Responsable de refuge",
      "Toiletteur canin",
    ]) {
      const job = classifyJob(title);
      expect(job.universe).toBe("ASV");
      expect(job.family).toBe("ANIMAL_CARE");
      expect(job.confidence).toBeLessThan(1);
    }
  });
});

describe("Commerce, marketing et communication", () => {
  it.each([
    ["Business developer", "BUSINESS_DEVELOPMENT"],
    ["Chargée de marketing digital", "MARKETING"],
    ["Vendeur polyvalent", "RETAIL"],
    ["Customer success manager", "CUSTOMER_SERVICE"],
    ["Account manager", "SALES"],
    ["Community manager", "COMMUNICATION"],
    ["Chargé de communication", "COMMUNICATION"],
    ["Acheteur category manager", "CATEGORY_MANAGER"],
    ["Cheffe de catégorie e-commerce (CDI)", "CATEGORY_MANAGER"],
    ["Responsable de catégorie produits", "CATEGORY_MANAGER"],
    ["Stage Category Manager Data et assortiment", "CATEGORY_MANAGER"],
  ])("classe %s", (title, expected) => expect(family(title)).toBe(`COMMERCE/${expected}`));

  it("tient « développeur commercial » pour un poste de vente, pas de logiciel", () => {
    expect(family("Développeur commercial")).toBe("COMMERCE/SALES");
    expect(family("Commercial Développeur Quart Sud-Ouest")).toBe("COMMERCE/SALES");
    expect(family("Développeur logiciel")).toBe("TECH/TECH");
  });

  it("déduit un métier des missions avec un seuil strict, jamais d'un mot isolé", () => {
    const missions =
      "Missions : prospection de nouveaux clients, négociation, développement du portefeuille clients, suivi du pipeline.";
    expect(family("Chargé de développement", missions)).toBe("COMMERCE/BUSINESS_DEVELOPMENT");
    expect(family("Gestionnaire de paie", "Nous avons une équipe de vente et du marketing.")).toBe(
      "OTHER/OTHER",
    );
  });
});

describe("Arbitrage avec la tech", () => {
  it("garde la tech en stage et alternance, et son vocabulaire reste tech", () => {
    expect(family("Stage développeur web full stack")).toBe("TECH/TECH");
    expect(family("Data analyst marketing")).toBe("TECH/TECH");
    expect(family("Ingénieur logiciel", "Notre équipe marketing et nos commerciaux")).toBe(
      "TECH/TECH",
    );
  });

  it("préfère le métier de vente quand le contrat n'est pas un stage ou une alternance", () => {
    const store = "Magasin multimédia";
    expect(family("Conseiller de vente informatique", store, { contract: "CDI" })).toBe(
      "COMMERCE/RETAIL",
    );
    expect(family("Conseiller de vente informatique", store, { contract: "STAGE" })).toBe(
      "TECH/TECH",
    );
  });

  it("limite le périmètre : tech en stage ou alternance, les autres métiers tous contrats", () => {
    const tech = classifyJob("Développeur web");
    expect(isInScope(tech, "STAGE").ok).toBe(true);
    expect(isInScope(tech, "CDI").ok).toBe(false);
    expect(isInScope(classifyJob("ASV"), "CDI").ok).toBe(true);
    expect(isInScope(classifyJob("Gestionnaire de paie"), "CDI").ok).toBe(false);
  });
});

describe("Attributs et expérience", () => {
  it("déduit des attributs lisibles de l'annonce, propres à la santé animale", () => {
    const description =
      "Clinique canine et féline avec urgences. Débutant accepté, formation assurée. Un week-end sur trois.";
    const tags = deriveTags({ universe: "ASV", title: "ASV", description });
    expect(tags).toEqual(
      expect.arrayContaining([
        "DEBUTANT_ACCEPTE",
        "FORMATION_ASSUREE",
        "WEEKEND_GARDE",
        "URGENCES",
        "CANIN_FELIN",
        "UNIVERS_ANIMALIER",
      ]),
    );
    expect(deriveTags({ universe: "COMMERCE", title: "Vendeur", description })).not.toContain(
      "CANIN_FELIN",
    );
  });

  it("ne prend pas une garde d'enfants pour une garde de nuit", () => {
    expect(
      deriveTags({
        universe: "ASV",
        title: "ASV",
        description: "Avantages : garde d'enfants, mutuelle.",
      }),
    ).not.toContain("WEEKEND_GARDE");
  });

  it("repère l'univers animalier d'un commerce sans lui prêter de métier vétérinaire", () => {
    const tags = deriveTags({
      universe: "COMMERCE",
      title: "Conseiller de vente",
      description: "",
      company: "Maxi Zoo",
    });
    expect(tags).toContain("UNIVERS_ANIMALIER");
    expect(tags).not.toContain("FAUNE_SAUVAGE");
  });

  it("lit le niveau dans l'intitulé : « manager » seul ne dit rien et « junior » prime", () => {
    for (const title of ["Community Manager", "Account Manager", "Traffic Manager"])
      expect(experienceFrom(title, "")).toBe("UNKNOWN");
    expect(experienceFrom("Brand manager junior", "")).toBe("JUNIOR");
    expect(experienceFrom("Chargé de communication - Alternance", "")).toBe("JUNIOR");
    expect(experienceFrom("Responsable de magasin", "")).toBe("SENIOR");
    expect(experienceFrom("ASV confirmé", "")).toBe("CONFIRMED");
    expect(experienceFrom("ASV", "Nous recrutons une personne motivée")).toBe("UNKNOWN");
  });
});
