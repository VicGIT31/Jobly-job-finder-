import { makePersonalOffer } from "../personal-offer";
import { robotsAllows } from "../robots";
import { fetchJson } from "../http";
import { jsonLdText } from "../jsonld";
import { makeStudentOffer } from "../scope";
import type { RawOffer } from "../normalize";

type PublicDescription = {
  intituleOffre?: string;
  descriptif?: string;
  lieuTravail?: string | { libelleCommuneLieuTravail?: string; libelleLieuTravail?: string };
  dateCreation?: string;
  syntheseContrat?: string;
  etablissement?: { libelleEnseigne?: string };
  descriptionEntreprise?: string;
};

/** Flux anonyme effectivement utilisé par le composant <descriptif-offre> du site. */
export async function franceTravailPublicDetail(url: string, sector?: string): Promise<RawOffer | null> {
  const target = new URL(url);
  if (target.hostname !== "candidat.francetravail.fr") return null;
  const id = /\/offres\/recherche\/detail\/([a-z0-9]+)$/i.exec(target.pathname)?.[1];
  if (!id) return null;
  const configUrl = new URL("/ihm-descriptifoffre/configuration.json", target);
  if (sector && !(await robotsAllows(configUrl))) return null;
  const config = await fetchJson<{ pn330cwdescriptifoffreBff?: string }>(
    configUrl,
    { publicOnly: !!sector, cacheTtlMs: 24 * 60 * 60 * 1000 },
  );
  if (!config?.pn330cwdescriptifoffreBff)
    throw new Error("Configuration publique France Travail absente");
  const base = new URL(config.pn330cwdescriptifoffreBff, target.origin);
  if (base.origin !== target.origin)
    throw new Error("France Travail a changé d'hôte de descriptif : vérifier le catalogue");
  const detailUrl = `${base.href.replace(/\/$/, "")}/offre/${encodeURIComponent(id)}`;
  if (sector && !(await robotsAllows(detailUrl))) return null;
  const detail = await fetchJson<PublicDescription>(
    detailUrl,
    { publicOnly: !!sector, cacheTtlMs: 4 * 60 * 60 * 1000, minIntervalMs: 750, retries: 1 },
  );
  if (!detail?.intituleOffre || !detail.descriptif) return null;
  const name = detail.etablissement?.libelleEnseigne;
  const company =
    name && !/non disponible/i.test(name) ? name : "Entreprise confidentielle (France Travail)";
  const location = typeof detail.lieuTravail === "string" ? detail.lieuTravail :
    detail.lieuTravail?.libelleCommuneLieuTravail ?? detail.lieuTravail?.libelleLieuTravail ?? "";
  const city = location.replace(/^\d{2,3}\s*-\s*/, "").replace(/\s*\(\d{2,5}\)\s*$/, "").trim();
  if (sector) return makePersonalOffer({
    title: detail.intituleOffre, company, city: city || undefined, country: "FR",
    description: detail.descriptif, contract: detail.syntheseContrat, url,
    publishedAt: detail.dateCreation, sector,
  }, { national: true });
  return makeStudentOffer({
    title: detail.intituleOffre,
    company,
    city,
    country: "FR",
    contract: detail.syntheseContrat,
    description: jsonLdText(detail.descriptif),
    url,
    // dateDerniereModification est une modification, PAS une publication.
  });
}
