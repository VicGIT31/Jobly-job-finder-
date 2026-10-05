import { fetchJson } from "../http";
import { jsonLdText } from "../jsonld";
import { makeStudentOffer } from "../scope";
import type { RawOffer } from "../normalize";

type PublicDescription = {
  intituleOffre?: string;
  descriptif?: string;
  lieuTravail?: string;
  syntheseContrat?: string;
  etablissement?: { libelleEnseigne?: string };
  descriptionEntreprise?: string;
};

/** Flux anonyme effectivement utilisé par le composant <descriptif-offre> du site. */
export async function franceTravailPublicDetail(url: string): Promise<RawOffer | null> {
  const target = new URL(url);
  if (target.hostname !== "candidat.francetravail.fr") return null;
  const id = /\/offres\/recherche\/detail\/([a-z0-9]+)$/i.exec(target.pathname)?.[1];
  if (!id) return null;
  const config = await fetchJson<{ pn330cwdescriptifoffreBff?: string }>(
    `${target.origin}/ihm-descriptifoffre/configuration.json`,
    { cacheTtlMs: 24 * 60 * 60 * 1000 },
  );
  if (!config?.pn330cwdescriptifoffreBff)
    throw new Error("Configuration publique France Travail absente");
  const base = new URL(config.pn330cwdescriptifoffreBff, target.origin);
  if (base.origin !== target.origin)
    throw new Error("France Travail a changé d'hôte de descriptif : vérifier le catalogue");
  const detail = await fetchJson<PublicDescription>(
    `${base.href.replace(/\/$/, "")}/offre/${encodeURIComponent(id)}`,
    { cacheTtlMs: 4 * 60 * 60 * 1000, minIntervalMs: 750, retries: 1 },
  );
  if (!detail?.intituleOffre || !detail.descriptif) return null;
  const name = detail.etablissement?.libelleEnseigne;
  const company =
    name && !/non disponible/i.test(name) ? name : "Entreprise confidentielle (France Travail)";
  return makeStudentOffer({
    title: detail.intituleOffre,
    company,
    city: (detail.lieuTravail ?? "").replace(/\s*\(\d{2,3}\)\s*$/, ""),
    country: "FR",
    contract: detail.syntheseContrat,
    description: jsonLdText(detail.descriptif),
    url,
    // dateDerniereModification est une modification, PAS une publication.
  });
}
