/**
 * Worker BullMQ : crons de fraîcheur des offres et d'alertes email.
 * Lancé par `npm run worker` (ou via start-all dans Docker).
 */
import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { expireStaleOffers, purgeOldOffers } from "@/server/ingest/freshness";
import { runIngestion } from "@/server/ingest/run-ingestion";
import { sendDailyAlerts } from "@/server/alerts/send";

const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const QUEUE_NAME = "nextstep-crons";

async function main(): Promise<void> {
  const queue = new Queue(QUEUE_NAME, { connection });

  // Ingestion temps réel : toutes les 30 min. Fraîcheur : toutes les heures.
  // Alertes : tous les jours à 8 h.
  const ingestionMinutes = Number(process.env.INGESTION_INTERVAL_MINUTES ?? "30");
  await queue.upsertJobScheduler(
    "ingest-offers",
    { pattern: `*/${ingestionMinutes} * * * *` },
    { name: "ingest-offers" },
  );
  await queue.upsertJobScheduler(
    "offer-freshness",
    { pattern: "0 * * * *" },
    { name: "offer-freshness" },
  );
  // Purge des offres de +2 mois : tous les jours à 3 h.
  await queue.upsertJobScheduler(
    "purge-old-offers",
    { pattern: "0 3 * * *" },
    { name: "purge-old-offers" },
  );
  await queue.upsertJobScheduler(
    "daily-alerts",
    { pattern: "0 8 * * *" },
    { name: "daily-alerts" },
  );

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === "ingest-offers") {
        await runIngestion();
      } else if (job.name === "offer-freshness") {
        const expired = await expireStaleOffers();
        console.log(`[cron] offer-freshness : ${expired} offre(s) expirée(s)`);
      } else if (job.name === "purge-old-offers") {
        const purged = await purgeOldOffers();
        console.log(`[cron] purge-old-offers : ${purged} offre(s) de +2 mois supprimée(s)`);
      } else if (job.name === "daily-alerts") {
        const { sent, matchedOffers } = await sendDailyAlerts();
        console.log(`[cron] daily-alerts : ${sent} email(s), ${matchedOffers} offre(s) matchée(s)`);
      }
    },
    { connection },
  );

  worker.on("failed", (job, err) => {
    console.error(`[worker] Job ${job?.name} en échec :`, err.message);
  });

  console.log(
    `[worker] Démarré — crons ingest-offers (${ingestionMinutes} min), ` +
      "offer-freshness (horaire), purge-old-offers (3h) et daily-alerts (8h).",
  );

  // Ingestion immédiate au démarrage pour peupler le site sans attendre le cron.
  runIngestion().catch((err) => console.error("[worker] Ingestion initiale échouée :", err));
}

main().catch((err) => {
  console.error("[worker] Erreur fatale :", err);
  process.exit(1);
});
