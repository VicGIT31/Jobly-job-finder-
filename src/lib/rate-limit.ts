import { getRedis } from "./redis";

export type RateLimitResult = { allowed: boolean; remaining: number };

/**
 * Rate limiting fenêtre fixe sur Redis (INCR + EXPIRE).
 * En cas d'indisponibilité Redis, on laisse passer (fail-open) :
 * le rate limiting est une protection, pas une fonctionnalité critique.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const redis = getRedis();
    const redisKey = `ratelimit:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  } catch {
    return { allowed: true, remaining: limit };
  }
}
