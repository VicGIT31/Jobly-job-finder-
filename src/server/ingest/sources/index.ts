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

/** Aucun fournisseur avec clé ni intermédiaire payant dans le circuit de collecte. */
export async function getSourceConnectors(options: { ignoreSelection?: boolean } = {}): Promise<SourceConnector[]> {
  const legacy: SourceConnector[] = [
    new ApecConnector(),
    new HelloWorkConnector(),
    new FreeWorkConnector(),
    new LinkedInConnector(),
    new TheMuseConnector(),
    new LocalAlertsConnector(),
  ];
  const catalog = await loadSourceCatalog();
  let allowed = process.env.INGEST_SOURCES?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (process.env.JOBLY_DESKTOP === "1" && !options.ignoreSelection) {
    const { prisma } = await import("@/lib/prisma");
    const setting = await prisma.siteSetting.findUnique({ where: { key: "desktopSources" } });
    if (Array.isArray(setting?.value)) allowed = setting.value.filter((id): id is string => typeof id === "string");
  }
  if (options.ignoreSelection) allowed = undefined;
  const area = process.env.JOBLY_DESKTOP === "1" ? await (await import("@/server/personal/search-area")).getSearchArea() : undefined;
  const entries: Array<{ id: string; connector: SourceConnector }> = [
    ...personalConnectors(area),
    ...legacy.map((connector) => ({ id: connector.sourceSite, connector })),
    ...catalog.map((definition) => ({
      id: definition.id,
      connector: new PublicBoardConnector(definition),
    })),
  ];
  if (allowed?.length) {
    const unknown = allowed.filter((id) => !entries.some((entry) => entry.id === id));
    if (unknown.length) throw new Error(`Sources inconnues : ${unknown.join(", ")}`);
  }
  return entries
    .filter((entry) => options.ignoreSelection || (allowed?.length ? allowed.includes(entry.id) : !!entry.connector.personal))
    .map((entry) => entry.connector);
}
