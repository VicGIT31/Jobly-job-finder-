/**
 * Ingestion manuelle des offres réelles (stage / alternance tech, France).
 * Usage : `npm run ingest:now`
 */
import { runIngestion } from "../src/server/ingest/run-ingestion";

runIngestion()
  .then((results) => {
    const created = results.reduce((n, r) => n + (r.summary?.created ?? 0), 0);
    console.log(`\n✅ Ingestion terminée : ${created} nouvelle(s) offre(s) au total.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Ingestion échouée :", err);
    process.exit(1);
  });
