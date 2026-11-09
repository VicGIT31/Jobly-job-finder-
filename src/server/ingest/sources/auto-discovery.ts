import type { RawOffer } from "../normalize";
import type { SourceConnector, CollectionOptions } from "./types";
import { discoverSources } from "./discovery";
import seeds from "../../../../config/ai-career-seeds.json";
import { PublicBoardConnector } from "./public-boards";

/** Une collecte planifiée fait aussi avancer la découverte, sans bloquer les autres sources. */
export class AutoDiscoveryConnector implements SourceConnector {
  readonly personal = true;
  readonly group = "RECRUITERS" as const;
  readonly sourceSite = "discovery.jobly";
  readonly label = "Découverte automatique des recruteurs";
  readonly warnings: string[] = [];
  isEnabled() {
    return process.env.JOB_DISCOVERY_ENABLED !== "0";
  }
  async fetchOffers(options: CollectionOptions = {}): Promise<RawOffer[]> {
    this.warnings.length = 0;
    const result = await discoverSources({ prioritySeeds: seeds, search: true });
    this.warnings.push(...result.warnings);
    console.log(
      `[discovery] ${result.pages} pages, ${result.added} nouvelles sources vérifiées, ${result.pending} pages en attente`,
    );
    // Newly verified boards contribute now, not only two hours later.
    for (const definition of result.sources.slice(0, 4)) {
      try {
        const connector = new PublicBoardConnector({ ...definition, maxOffers: 100, maxPages: 4 });
        result.offers.push(...await connector.fetchOffers(options));
        this.warnings.push(...connector.warnings.map((warning) => `${definition.label} : ${warning}`));
      } catch (error) { this.warnings.push(`${definition.label} : ${error instanceof Error ? error.message : "collecte indisponible"}`); }
    }
    return result.offers;
  }
}
