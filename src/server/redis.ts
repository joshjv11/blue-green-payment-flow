import { RedisOptions } from "bullmq";
import { URL } from "node:url";
import { env } from "./env.ts";

function buildRedisOptions(redisUrl: string): RedisOptions {
  const parsed = new URL(redisUrl);

  const tls =
    parsed.protocol === "rediss:" ? ({ rejectUnauthorized: false } as const) : undefined;

  return {
    host: parsed.hostname,
    port: parsed.port ? Number.parseInt(parsed.port, 10) : 6379,
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    tls,
  };
}

export const redisOptions = buildRedisOptions(env.REDIS_URL);

