import { processIngest, type IngestSummary } from "./ingest";
import { FranceTravailConnector } from "./sources/france-travail";
import { TheMuseConnector } from "./sources/themuse";
import type { SourceConnector } from "./sources/types";

const CONNECTORS: SourceConnector[] = [new FranceTravailConnector(), new TheMuseConnector()];

export type IngestionRunResult = {
  source: string;
  ok: boolean;
  fetched: number;
  summary?: IngestSummary;
  error?: string;
};

/**
 * Lance toutes les sources activées et ingère leurs offres via le pipeline
 * commun (normalisation, déduplication, rejet hors périmètre, indexation).
 * Une source en échec n'interrompt pas les autres.
 */
export async function runIngestion(): Promise<IngestionRunResult[]> {
  const results: IngestionRunResult[] = [];

  for (const connector of CONNECTORS) {
    if (!connector.isEnabled()) {
      console.log(`[ingestion] ${connector.label} : désactivée (identifiants absents), ignorée.`);
      continue;
    }
    const started = Date.now();
    try {
      const offers = await connector.fetchOffers();
      const summary = await processIngest(connector.sourceSite, offers);
      const ms = Date.now() - started;
      console.log(
        `[ingestion] ${connector.label} : ${offers.length} récupérées → ` +
          `${summary.created} créées, ${summary.updated} maj, ${summary.duplicates} doublons, ` +
          `${summary.rejected} rejetées (${ms} ms)`,
      );
      results.push({ source: connector.sourceSite, ok: true, fetched: offers.length, summary });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ingestion] ${connector.label} : échec — ${message}`);
      results.push({ source: connector.sourceSite, ok: false, fetched: 0, error: message });
    }
  }

  return results;
}
