/**
 * Ingestion manuelle des offres réelles (stage / alternance tech, France).
 * Usage : `npm run ingest:now`
 */
import "./load-env";
import { runIngestion } from "../src/server/ingest/run-ingestion";

runIngestion()
  .then((results) => {
    const created = results.reduce((n, r) => n + (r.summary?.created ?? 0), 0);
    const incomplete = results.filter((result) => !result.ok);
    console.log(
      `\nIngestion terminée : ${created} nouvelle(s) offre(s), ${incomplete.length} source(s) en échec ou partielles.`,
    );
    for (const result of incomplete)
      console.warn(`${result.label}: ${result.error ?? "Collecte partielle"}`);
    process.exit(incomplete.length ? 1 : 0);
  })
  .catch((err) => {
    console.error("❌ Ingestion échouée :", err);
    process.exit(1);
  });
