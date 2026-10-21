/**
 * Worker BullMQ : crons de fraîcheur des offres et d'alertes email.
 * Lancé par `npm run worker` (ou via start-all dans Docker).
 */
import { Queue, Worker } from "bullmq";
import { loadEnvConfig } from "@next/env";
import Redis from "ioredis";
import { getSettings } from "@/lib/settings";
import { expireStaleOffers, purgeOldOffers } from "@/server/ingest/freshness";
import { IngestionAlreadyRunningError, runIngestion } from "@/server/ingest/run-ingestion";
import { sendDailyAlerts } from "@/server/alerts/send";
import { reconcileSearchIndex } from "@/server/search/reconcile";

loadEnvConfig(process.cwd());

const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const QUEUE_NAME = "jobly-crons";

async function collectIfAvailable(): Promise<boolean> {
  try {
    await runIngestion();
    return true;
  } catch (error) {
    if (!(error instanceof IngestionAlreadyRunningError)) throw error;
    console.log("[worker] Collecte déjà en cours : ce déclenchement est ignoré.");
    return false;
  }
}

async function initialCollection(): Promise<void> {
  try {
    const { ingestionEnabled } = await getSettings("ingestion");
    if (ingestionEnabled && !(await collectIfAvailable())) {
      // Après un redémarrage, le verrou de l'ancien processus peut encore vivre
      // 3 minutes. Reprendre dès sa libération plutôt qu'attendre le prochain cron.
      setTimeout(() => void initialCollection(), 15_000).unref();
    }
  } catch (error) {
    console.error("[worker] Ingestion initiale échouée :", error);
  }
}

async function main(): Promise<void> {
  const queue = new Queue(QUEUE_NAME, { connection });
  // Ancien scheduler sans gestionnaire dans ce worker : éviter les réveils inutiles.
  await queue.removeJobScheduler("ingest-quick");

  // Ingestion : intervalle configurable (2 h par défaut). Fraîcheur : toutes les 15 min.
  // Alertes : tous les jours à 8 h.
  const configuredMinutes = Number(process.env.INGESTION_INTERVAL_MINUTES ?? "120");
  const ingestionMinutes =
    Number.isFinite(configuredMinutes) && configuredMinutes >= 5 ? configuredMinutes : 120;
  await queue.upsertJobScheduler(
    "ingest-offers",
    { every: ingestionMinutes * 60_000 },
    { name: "ingest-offers" },
  );
  await queue.upsertJobScheduler(
    "offer-freshness",
    { pattern: "*/15 * * * *" },
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
  await queue.upsertJobScheduler(
    "search-reconcile",
    { pattern: "10 * * * *" },
    { name: "search-reconcile" },
  );

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === "ingest-offers") {
        // Interrupteur de `/admin/parametres` : le cron peut être suspendu sans
        // arrêter le worker (les autres crons continuent de tourner).
        const { ingestionEnabled } = await getSettings("ingestion");
        if (!ingestionEnabled) {
          console.log("[cron] ingest-offers : ingestion désactivée dans les paramètres, ignorée.");
          return;
        }
        await collectIfAvailable();
      } else if (job.name === "offer-freshness") {
        const expired = await expireStaleOffers();
        console.log(`[cron] offer-freshness : ${expired} offre(s) expirée(s)`);
      } else if (job.name === "purge-old-offers") {
        const purged = await purgeOldOffers();
        console.log(`[cron] purge-old-offers : ${purged} offre(s) de +2 mois supprimée(s)`);
      } else if (job.name === "search-reconcile") {
        console.log("[cron] search-reconcile :", await reconcileSearchIndex());
      } else if (job.name === "daily-alerts") {
        const { sent, matchedOffers } = await sendDailyAlerts();
        console.log(`[cron] daily-alerts : ${sent} email(s), ${matchedOffers} offre(s) matchée(s)`);
      }
    },
    { connection, concurrency: 3 },
  );

  worker.on("failed", (job, err) => {
    console.error(`[worker] Job ${job?.name} en échec :`, err.message);
  });

  console.log(
    `[worker] Démarré — crons ingest-offers (${ingestionMinutes} min), ` +
      "offer-freshness (15 min), search-reconcile (horaire), purge-old-offers (3h) et daily-alerts (8h).",
  );

  // Ingestion immédiate au démarrage pour peupler le site sans attendre le cron.
  // Nettoyer dès le démarrage : un arrêt du worker ne doit pas laisser les
  // anciennes annonces actives jusqu'au prochain créneau horaire.
  await expireStaleOffers();
  void initialCollection();
}

main().catch((err) => {
  console.error("[worker] Erreur fatale :", err);
  process.exit(1);
});
