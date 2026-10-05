import "./load-env";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fetchText } from "../src/server/ingest/http";
import {
  sourceDefinitionSchema,
  type SourceDefinition,
} from "../src/server/ingest/sources/catalog";
import { extractLinks } from "../src/server/ingest/sources/public-boards";

/** Inspecte une page carrière fournie, sans exécuter ses scripts ni scanner des hôtes. */
async function main(): Promise<void> {
  const input = process.argv[2];
  if (!input?.startsWith("https://"))
    throw new Error(
      "Usage : npm run sources:discover -- https://entreprise.fr/carrieres [--output fichier.json]",
    );
  const url = sourceDefinitionSchema.parse({
    id: "discovery",
    label: "Découverte",
    kind: "html",
    url: input,
  }).url;
  const html = await fetchText(url, { retries: 0, timeoutMs: 15_000, minIntervalMs: 1000 });
  if (!html) throw new Error("Page publique inaccessible");
  const urls = new Set([url]);
  for (const match of html.matchAll(/https?:\/\/[^\s"'<>\\]+/g)) {
    if (
      /myworkdayjobs\.com|(?:job-boards|boards)\.greenhouse\.io|jobs(?:\.eu)?\.lever\.co|jobs\.ashbyhq\.com|careers\.smartrecruiters\.com/.test(
        match[0],
      )
    )
      urls.add(match[0].replace(/&amp;/g, "&"));
  }
  const proposals: SourceDefinition[] = [];
  for (const candidate of urls) {
    const target = new URL(candidate);
    const hostname = target.hostname;
    const kind = /myworkdayjobs\.com$/.test(hostname)
      ? "workday"
      : /greenhouse\.io$/.test(hostname)
        ? "greenhouse"
        : /lever\.co$/.test(hostname)
          ? "lever"
          : /ashbyhq\.com$/.test(hostname)
            ? "ashby"
            : /smartrecruiters\.com$/.test(hostname)
              ? "smartrecruiters"
              : "html";
    const id =
      `${hostname.replace(/^www\./, "").replace(/[^a-z0-9]+/gi, "-")}-${proposals.length + 1}`.toLowerCase();
    const data: Record<string, unknown> = {
      id,
      label: hostname,
      kind,
      url: target.href,
      enabled: false,
      notes:
        "Découverte automatique : vérifier avec sources:check --include-disabled --collect avant activation.",
    };
    if (kind === "html") {
      const links = extractLinks(html, url, /\/(?:job|jobs|annonce|offres)\//i);
      const robots = await fetchText(`${target.origin}/robots.txt`, {
        retries: 0,
        timeoutMs: 10_000,
      });
      const sitemaps = [...(robots ?? "").matchAll(/^sitemap\s*:\s*(https:\/\/\S+)/gim)]
        .map((match) => match[1])
        .filter((map) => new URL(map).hostname === hostname);
      data.listingUrls = [url];
      data.sitemapUrls = sitemaps;
      data.notes = `${data.notes} ${links.length} lien(s) d'annonce trouvé(s).`;
    }
    const parsed = sourceDefinitionSchema.safeParse(data);
    if (parsed.success) proposals.push(parsed.data);
  }
  const index = process.argv.indexOf("--output");
  const output = resolve(index >= 0 ? process.argv[index + 1] : "reports/discovered-sources.json");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(proposals, null, 2));
  console.log(`${proposals.length} proposition(s) enregistrée(s) : ${output}`);
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
