/**
 * Worker BullMQ : crons de fraîcheur des offres et d'alertes email.
 * Lancé par `npm run worker` (ou via start-all dans Docker).
 */
import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { expireStaleOffers } from "@/server/ingest/freshness";
import { sendDailyAlerts } from "@/server/alerts/send";

const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const QUEUE_NAME = "nextstep-crons";

async function main(): Promise<void> {
  const queue = new Queue(QUEUE_NAME, { connection });

  // Fraîcheur : toutes les heures. Alertes : tous les jours à 8 h.
  await queue.upsertJobScheduler("offer-freshness", { pattern: "0 * * * *" }, { name: "offer-freshness" });
  await queue.upsertJobScheduler("daily-alerts", { pattern: "0 8 * * *" }, { name: "daily-alerts" });

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === "offer-freshness") {
        const expired = await expireStaleOffers();
        console.log(`[cron] offer-freshness : ${expired} offre(s) expirée(s)`);
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

  console.log("[worker] Démarré — crons offer-freshness (horaire) et daily-alerts (8h).");
}

main().catch((err) => {
  console.error("[worker] Erreur fatale :", err);
  process.exit(1);
});
