import "./load-env";
import { LocalAlertsConnector } from "../src/server/ingest/sources/local-alerts";
import { processIngest } from "../src/server/ingest/ingest";
import { prisma } from "../src/lib/prisma";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

async function main(): Promise<void> {
  const directory = process.argv[2];
  if (!directory || directory.startsWith("--"))
    throw new Error("Usage : npm run alerts:import -- dossier-eml [--export fichier.json]");
  const connector = new LocalAlertsConnector(directory);
  const offers = await connector.fetchOffers();
  const index = process.argv.indexOf("--export");
  if (index >= 0) {
    const output = resolve(process.argv[index + 1]);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify({ offers, warnings: connector.warnings }, null, 2));
    console.log(`${offers.length} annonce(s) exportée(s) : ${output}`);
  } else console.log(await processIngest(connector.sourceSite, offers));
  if (connector.warnings.length) console.warn(connector.warnings.join("\n"));
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
