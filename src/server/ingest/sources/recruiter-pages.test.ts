import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import {
  atsTarget,
  clinicsFromOsm,
  findCareerLinks,
  freeTextOffers,
  isPublicWebUrl,
} from "./recruiter-pages";

const base = new URL("https://clinique-exemple.fr/");

describe("garde sur les URL issues d'OpenStreetMap", () => {
  it("accepte un site public et ajoute le protocole manquant", () => {
    expect(isPublicWebUrl("clinique-exemple.fr")?.href).toBe("https://clinique-exemple.fr/");
    expect(isPublicWebUrl("http://www.vet-du-parc.com/accueil")?.hostname).toBe(
      "www.vet-du-parc.com",
    );
  });

  it("refuse le réseau local, les ports, les identifiants et les adresses IP", () => {
    for (const url of [
      "http://localhost/x",
      "http://192.168.1.10/",
      "http://127.0.0.1:8080",
      "https://user:pass@exemple.fr",
      "http://exemple.fr:8080",
      "http://[::1]/",
      "https://imprimante.local/",
      "ftp://exemple.fr",
    ])
      expect(isPublicWebUrl(url), url).toBeNull();
  });

  it("écarte les réseaux sociaux, annuaires et groupes déjà couverts", () => {
    for (const url of [
      "https://www.facebook.com/clinique",
      "https://www.doctolib.fr/x",
      "https://sevetys.fr/cliniques/y",
      "https://www.anicura.fr",
    ])
      expect(isPublicWebUrl(url), url).toBeNull();
  });
});

describe("page recrutement d'un site", () => {
  const home = `<nav><a href="/">Accueil</a><a href="/equipe">Notre équipe</a><a href="/recrutement">Nous recrutons</a><a href="https://facebook.com/x">Facebook</a><a href="/jobs/offres.pdf">Offres</a></nav>
    <footer><a href="/carrieres/">Carrières</a><a href="https://exemple.teamtailor.com/jobs">Offres</a></footer>`;

  it("trouve les liens de recrutement du même site, sans PDF ni réseaux sociaux", () => {
    const links = findCareerLinks(home, base).map((link) => link.href);
    expect(links).toContain("https://clinique-exemple.fr/recrutement");
    expect(links).toContain("https://clinique-exemple.fr/carrieres/");
    expect(links.some((href) => href.includes("facebook") || href.endsWith(".pdf"))).toBe(false);
  });

  it("repère un ATS public dont le flux est documenté", () => {
    expect(
      findCareerLinks(home, base).some((link) => link.hostname === "exemple.teamtailor.com"),
    ).toBe(true);
    expect(atsTarget(new URL("https://exemple.teamtailor.com/jobs"))).toEqual({
      kind: "teamtailor",
      url: "https://exemple.teamtailor.com/jobs.rss",
    });
    expect(atsTarget(new URL("https://exemple.recruitee.com/"))?.url).toBe(
      "https://exemple.recruitee.com/api/offers/",
    );
    expect(atsTarget(new URL("https://jobs.lever.co/clinique/abc"))?.url).toBe(
      "https://api.lever.co/v0/postings/clinique?mode=json",
    );
    expect(atsTarget(new URL("https://exemple.workable.com/"))).toBeNull();
  });
});

describe("annonces en texte libre", () => {
  const offer = `<h1>Recrutement</h1><h2>Auxiliaire spécialisé(e) vétérinaire</h2>
    <p>Nous recrutons un(e) ASV en CDI à temps plein pour notre clinique canine et féline : contention, aide opératoire, accueil des propriétaires.</p>
    <h2>Candidature spontanée</h2><p>Envoyez votre CV par mail.</p>`;

  it("lit un métier suivi d'un signal de recrutement", () => {
    const offers = freeTextOffers(
      offer,
      new URL("https://clinique-exemple.fr/recrutement"),
      "Clinique Exemple",
      "Blagnac",
    );
    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({
      title: "Auxiliaire spécialisé(e) vétérinaire",
      city: "Blagnac",
      url: "https://clinique-exemple.fr/recrutement#auxiliaire-specialise-e-veterinaire",
    });
  });

  it("ne produit rien quand la page annonce n'avoir aucun poste", () => {
    const empty = offer + "<p>Aucun poste n'est à pourvoir pour le moment.</p>";
    expect(
      freeTextOffers(empty, new URL("https://clinique-exemple.fr/recrutement"), "Clinique"),
    ).toEqual([]);
  });

  it("ne tient pas pour une annonce un métier cité sans signal de recrutement", () => {
    const team = `<h2>Auxiliaire spécialisé vétérinaire</h2><p>Marie accueille vos animaux avec douceur depuis dix ans dans la salle d'attente.</p>`;
    expect(freeTextOffers(team, new URL("https://clinique-exemple.fr/equipe"), "Clinique")).toEqual(
      [],
    );
  });
});

describe("découverte des cabinets", () => {
  const center = { lat: 43.6047, lng: 1.4442 };
  const element = (name: string, website: string | undefined, lat: number, lon: number) => ({
    lat,
    lon,
    tags: { name, ...(website ? { website } : {}), "addr:city": "Toulouse" },
  });

  it("ne garde que les cabinets avec un site public, dédoublonnés et les plus proches d'abord", () => {
    const clinics = clinicsFromOsm(
      [
        element("Loin", "https://loin.fr", 43.9, 1.9),
        element("Proche", "https://proche.fr/contact", 43.61, 1.45),
        element("Doublon", "https://www.proche.fr", 43.62, 1.46),
        element("Sans site", undefined, 43.6, 1.44),
        element("Réseau social", "https://facebook.com/vet", 43.6, 1.44),
        element("Local", "http://192.168.0.2", 43.6, 1.44),
      ],
      center,
    );
    expect(clinics.map((clinic) => clinic.name)).toEqual(["Proche", "Loin"]);
    expect(clinics[0].url.href).toBe("https://proche.fr/");
  });
});
