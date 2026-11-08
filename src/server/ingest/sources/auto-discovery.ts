import type { RawOffer } from "../normalize";
import type { SourceConnector } from "./types";
import { discoverSources } from "./discovery";

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
  async fetchOffers(): Promise<RawOffer[]> {
    this.warnings.length = 0;
    const result = await discoverSources();
    this.warnings.push(...result.warnings);
    console.log(
      `[discovery] ${result.pages} pages, ${result.added} nouvelles sources vérifiées, ${result.pending} pages en attente`,
    );
    return result.offers;
  }
}
