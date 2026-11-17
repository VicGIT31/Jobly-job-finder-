import { load } from "cheerio";
import { assertCollectionBudget, fetchText, mapPool } from "../http";
import { readCatalogCursor, saveCatalogCursor, selectCatalogDetails } from "../catalog-rotation";
import { PERSONAL_CONTRACTS } from "../personal-offer";
import { robotsAllows } from "../robots";
import { franceTravailPublicDetail } from "./france-travail-public";
import type { CollectionOptions, SourceConnector } from "./types";
import type { RawOffer } from "../normalize";

const ORIGIN = "https://candidat.francetravail.fr";
const SITEMAPS = "/rechercheoffre/sitemap/";
const DAY = 86_400_000;
const PAGES_PER_CYCLE = 12;
const DETAILS_PER_PAGE = 4;
type Partition = { url: string; sector: string; department: string };

export function nationalPartitions(crossings: string, sectors: string): Partition[][] {
  const names = new Map<string, string>();
  const byDepartment = new Map<string, Partition[]>();
  for (const [, url] of sectors.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const match = /^https:\/\/candidat\.francetravail\.fr\/(?:rechercheoffre|offres)\/emploi\/([a-z0-9-]+)\/s(\d+)$/.exec(url);
    if (match) names.set(match[2], match[1].replaceAll("-", " "));
  }
  for (const [, url] of crossings.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const match = /^https:\/\/candidat\.francetravail\.fr\/offres\/emploi\/[a-z0-9-]+\/[a-z0-9-]+\/s(\d+)m\d+d(\d+)$/.exec(url);
    if (!match) continue;
    const [, sector, department] = match;
    const rows = byDepartment.get(department) ?? [];
    rows.push({ url, sector: names.get(sector) ?? "Non renseigné", department });
    byDepartment.set(department, rows);
  }
  // Intercalation des territoires ultramarins au premier passage.
  const departments = [...byDepartment.keys()].sort((a, b) => Number(a) - Number(b));
  const mainland = departments.filter((code) => Number(code) < 970);
  departments.filter((code) => Number(code) >= 970).forEach((code, i) => mainland.splice(i * 5, 0, code));
  return mainland.map((code, index) => {
    const partitions = byDepartment.get(code)!;
    const groups = new Map<string, Partition[]>();
    for (const partition of partitions) {
      const group = groups.get(partition.sector) ?? [];
      group.push(partition);
      groups.set(partition.sector, group);
    }
    const lanes = [...groups.values()];
    const list = lanes.slice(index % lanes.length).concat(lanes.slice(0, index % lanes.length));
    const ordered: Partition[] = [];
    for (let row = 0; ordered.length < partitions.length; row++)
      for (const lane of list) if (lane[row]) ordered.push(lane[row]);
    return ordered;
  });
}

async function publicText(path: string, cacheTtlMs: number, maxBodyBytes = 2_000_000) {
  const url = new URL(path, ORIGIN);
  if (!(await robotsAllows(url))) return null;
  return fetchText(url, { publicOnly: true, cacheTtlMs, minIntervalMs: 600, maxBodyBytes });
}

export class NationalConnector implements SourceConnector {
  readonly national = true;
  readonly personal = true;
  readonly group = "NATIONAL" as const;
  readonly label = "France Travail · emploi national";
  readonly sourceSite = "francetravail.fr/national";
  readonly requestPrefixes = [ORIGIN + "/"];
  readonly acceptedContracts = PERSONAL_CONTRACTS;
  readonly warnings: string[] = [];
  coverage?: NonNullable<SourceConnector["coverage"]>;
  isEnabled() { return true; }

  async fetchOffers({ onBatch }: CollectionOptions = {}): Promise<RawOffer[]> {
    this.warnings.length = 0;
    const [crossings, sectors] = await Promise.all([
      publicText(SITEMAPS + "croisements-metiers-departements.xml", DAY, 8_000_000),
      publicText(SITEMAPS + "secteurs-metiers.xml", DAY),
    ]);
    const groups = nationalPartitions(crossings ?? "", sectors ?? "");
    if (!groups.length) throw new Error("Répertoire national France Travail indisponible.");
    const catalogTotal = groups.reduce((total, group) => total + group.length, 0);
    this.coverage = { mode: "rotation département et métier", catalogTotal, listingsSeen: 0, detailsRead: 0, accepted: 0, complete: false };
    const cursor = await readCatalogCursor("national-partition-v1");
    let step = Number(cursor ?? 0);
    if (!Number.isSafeInteger(step) || step < 0) step = 0;
    const end = Math.max(...groups.map((group) => group.length)) * groups.length;
    const seen = new Set<string>();
    const offers: RawOffer[] = [];
    let index = 0;
    while (index < PAGES_PER_CYCLE) {
      assertCollectionBudget();
      step %= end;
      const partition = groups[step % groups.length][Math.floor(step / groups.length)];
      step++;
      if (!partition) continue;
      index++;
      const html = await publicText(partition.url, 30 * 60_000);
      if (!html) this.warnings.push(`Département ${partition.department} : page indisponible`);
      else {
        const $ = load(html);
        const links = [...new Set($('a[href^="/offres/recherche/detail/"]').map((_, link) => $(link).attr("href")!).get())]
          .filter((link) => /^\/offres\/recherche\/detail\/[a-z0-9]+$/i.test(link));
        this.coverage.listingsSeen += links.length;
        const detailCursor = `national-detail:${partition.url}`;
        const rotation = selectCatalogDetails(
          links.filter((link) => !seen.has(link)).map((link) => [link, ""] as const),
          DETAILS_PER_PAGE, await readCatalogCursor(detailCursor),
        );
        const batch = await mapPool(rotation.selected, 2, async ([link]) => {
          seen.add(link);
          const url = new URL(link, ORIGIN);
          if (!(await robotsAllows(url))) return null;
          this.coverage!.detailsRead++;
          return franceTravailPublicDetail(url.href, partition.sector);
        });
        const accepted = batch.map((offer) => ({ ...offer, sourceSite: this.sourceSite }));
        this.coverage.accepted += accepted.length;
        offers.push(...accepted);
        if (accepted.length) await onBatch?.(accepted);
        if (rotation.nextCursor) await saveCatalogCursor(detailCursor, rotation.nextCursor);
      }
      await saveCatalogCursor("national-partition-v1", String(step));
    }
    return offers;
  }
}
