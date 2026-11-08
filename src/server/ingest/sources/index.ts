import { AutoDiscoveryConnector } from "./auto-discovery";
import { baristaConnectors } from "./barista";
import { financeConnectors } from "./finance";
import { ApecConnector } from "./apec";
import { FreeWorkConnector } from "./free-work";
import { HelloWorkConnector } from "./hellowork";
import { LinkedInConnector } from "./linkedin";
import { TheMuseConnector } from "./themuse";
import { LocalAlertsConnector } from "./local-alerts";
import { loadSourceCatalog } from "./catalog";
import { PublicBoardConnector } from "./public-boards";
import type { SourceConnector } from "./types";
import { personalConnectors } from "./personal";
import { recruiterConnectors } from "./recruiter-pages";

export type SourceEntry = { id: string; connector: SourceConnector };

/**
 * Toutes les sources connues, dans l'ordre de collecte : d'abord les sources
 * rapides pour commerce, communication et ASV (premiers résultats), puis les
 * pages recruteurs, puis les sources tech en stage et alternance. Aucun
 * fournisseur avec clé ni intermédiaire payant dans le circuit de collecte.
 */
export async function getSourceEntries(): Promise<SourceEntry[]> {
  const legacy: SourceConnector[] = [
    new ApecConnector(),
    new HelloWorkConnector(),
    new FreeWorkConnector(),
    new LinkedInConnector(),
    new TheMuseConnector(),
    new LocalAlertsConnector(),
  ];
  const catalog = await loadSourceCatalog();
  const area =
    process.env.JOBLY_DESKTOP === "1"
      ? await (await import("@/server/personal/search-area")).getSearchArea()
      : undefined;
  return [
    ...personalConnectors(area),
    ...baristaConnectors(),
    ...financeConnectors(),
    ...recruiterConnectors(area),
    ...legacy.map((connector) => ({ id: connector.sourceSite, connector })),
    { id: "auto-discovery", connector: new AutoDiscoveryConnector() },
    ...catalog.map((definition) => ({
      id: definition.id,
      connector: new PublicBoardConnector(definition),
    })),
  ];
}

export async function getSourceConnectors(
  options: { ignoreSelection?: boolean } = {},
): Promise<SourceConnector[]> {
  const entries = await getSourceEntries();
  const known = new Set(entries.map((entry) => entry.id));
  let allowed = process.env.INGEST_SOURCES?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (allowed?.length) {
    const unknown = allowed.filter((id) => !known.has(id));
    if (unknown.length) throw new Error(`Sources inconnues : ${unknown.join(", ")}`);
  }
  if (process.env.JOBLY_DESKTOP === "1" && !options.ignoreSelection) {
    const { prisma } = await import("@/lib/prisma");
    const setting = await prisma.siteSetting.findUnique({ where: { key: "desktopSources" } });
    // Un identifiant disparu du catalogue (mise à jour) ne doit pas faire échouer la collecte.
    if (Array.isArray(setting?.value))
      allowed = setting.value.filter((id): id is string => typeof id === "string" && known.has(id));
  }
  if (options.ignoreSelection) allowed = undefined;
  return (
    entries
      // Par défaut tout le catalogue tourne ; une sélection explicite du Bureau la restreint.
      .filter((entry) => !allowed?.length || allowed.includes(entry.id))
      .map((entry) => entry.connector)
  );
}
