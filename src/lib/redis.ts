import Redis from "ioredis";
import { DesktopCoordinator } from "./desktop-coordinator";

const globalForRedis = globalThis as unknown as { redis?: Redis; desktopCoordinator?: DesktopCoordinator };

export function getRedis(): Redis | DesktopCoordinator {
  if (process.env.JOBLY_DESKTOP === "1") {
    return (globalForRedis.desktopCoordinator ??= new DesktopCoordinator());
  }
  if (!globalForRedis.redis) {
    globalForRedis.redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    globalForRedis.redis.on("error", (err) => {
      console.error("[redis]", err.message);
    });
  }
  return globalForRedis.redis;
}
