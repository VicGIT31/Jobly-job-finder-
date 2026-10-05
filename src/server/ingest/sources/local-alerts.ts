import { existsSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseJobAlert } from "../job-alerts";
import type { RawOffer } from "../normalize";
import type { SourceConnector } from "./types";

/** Une règle de client mail peut déposer automatiquement les alertes dans ce dossier. */
export class LocalAlertsConnector implements SourceConnector {
  readonly sourceSite = "local-job-alerts";
  readonly label = "Alertes email locales";
  readonly warnings: string[] = [];
  readonly requestPrefixes: string[] = [];
  constructor(readonly directory = process.env.JOB_ALERTS_DIR ?? "data/job-alerts") {}
  isEnabled(): boolean {
    return existsSync(this.directory);
  }
  async fetchOffers(): Promise<RawOffer[]> {
    this.warnings.length = 0;
    const offers = new Map<string, RawOffer>();
    const directory = resolve(this.directory);
    const names = (await readdir(directory)).filter((name) => /\.eml$/i.test(name));
    const files = await Promise.all(
      names.map(async (name) => ({ name, info: await stat(join(directory, name)) })),
    );
    files.sort((a, b) => b.info.mtimeMs - a.info.mtimeMs);
    if (files.length > 500)
      this.warnings.push("Budget de 500 emails atteint ; archiver les anciens emails");
    for (const { name, info } of files.slice(0, 500)) {
      try {
        if (!info.isFile()) continue;
        if (info.size > 5_000_000) {
          this.warnings.push(`Email trop volumineux : ${name}`);
          continue;
        }
        const parsed = await parseJobAlert(await readFile(join(directory, name)));
        const date = parsed.receivedAt;
        // Le mail n'est pas une preuve que l'offre reste ouverte indéfiniment.
        if (
          !date ||
          date.getTime() > Date.now() + 86_400_000 ||
          Date.now() - date.getTime() > 7 * 86_400_000
        )
          continue;
        this.warnings.push(...parsed.warnings.map((warning) => `${name}: ${warning}`));
        for (const offer of parsed.offers)
          offers.set(offer.sourceUrl, { ...offer, scrapedAt: date });
      } catch (error) {
        this.warnings.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return [...offers.values()];
  }
}
