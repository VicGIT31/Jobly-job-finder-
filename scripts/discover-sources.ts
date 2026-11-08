import "./load-env";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { discoverSources } from "../src/server/ingest/sources/discovery";
import { withCollectionBudget, getHttpFailures } from "../src/server/ingest/http";

async function main() {
  const args = process.argv.slice(2);
  const option = (key: string) => {
    const index = args.indexOf(key);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const maxPages = Number(option("--max-pages") ?? 50);
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 200)
    throw new Error("--max-pages : entier entre 1 et 200 attendu");
  const result = await withCollectionBudget(180000, () =>
    discoverSources({
      maxPages,
      directory: !args.includes("--no-directory"),
      seeds: args.filter((arg) => /^https?:\/\//.test(arg)),
    }),
  );
  const output = resolve(option("--output") ?? "reports/discovered-sources.json");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(
    output,
    JSON.stringify(
      { at: new Date().toISOString(), ...result, httpFailures: getHttpFailures() },
      null,
      2,
    ),
  );
  console.log(
    `${result.pages} pages inspectées, ${result.added} sources vérifiées ajoutées automatiquement, ${result.pending} pages en attente. Rapport : ${output}`,
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
