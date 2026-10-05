import { ApecConnector } from "./apec";
import { FreeWorkConnector } from "./free-work";
import { HelloWorkConnector } from "./hellowork";
import { LinkedInConnector } from "./linkedin";
import { TheMuseConnector } from "./themuse";
import { LocalAlertsConnector } from "./local-alerts";
import { loadSourceCatalog } from "./catalog";
import { PublicBoardConnector } from "./public-boards";
import type { SourceConnector } from "./types";

/** Aucun fournisseur avec clé ni intermédiaire payant dans le circuit de collecte. */
export async function getSourceConnectors(): Promise<SourceConnector[]> {
  const legacy: SourceConnector[] = [
    new ApecConnector(),
    new HelloWorkConnector(),
    new FreeWorkConnector(),
    new LinkedInConnector(),
    new TheMuseConnector(),
    new LocalAlertsConnector(),
  ];
  const catalog = await loadSourceCatalog();
  const allowed = process.env.INGEST_SOURCES?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const entries = [
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
    .filter((entry) => !allowed?.length || allowed.includes(entry.id))
    .map((entry) => entry.connector);
}
