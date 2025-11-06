/**
 * Rate Limiting Utility for Edge Functions
 * Uses Upstash Redis for distributed rate limiting
 * 
 * FREE Tier: 10,000 requests/day
 */

interface RateLimitConfig {
  limit: number;
  window: string; // e.g., "1 h", "15 m", "1 d"
  prefix?: string;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Rate limiter using Upstash Redis
 * Fallback to in-memory if Upstash not configured (for local dev)
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { limit, window, prefix = "ratelimit" } = config;

  // Try Upstash Redis first
  const UPSTASH_REDIS_REST_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const UPSTASH_REDIS_REST_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

  if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
    try {
      return await checkRateLimitUpstash(identifier, { limit, window, prefix });
    } catch (error) {
      console.error("Upstash rate limit check failed:", error);
      // Fall through to in-memory fallback
    }
  }

  // Fallback: Simple in-memory rate limiting (per instance)
  // Note: This is not distributed, but works for single-instance deployments
  return checkRateLimitMemory(identifier, { limit, window, prefix });
}

/**
 * Upstash Redis-based rate limiting
 * Uses sliding window algorithm
 */
async function checkRateLimitUpstash(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { limit, window, prefix = "ratelimit" } = config;
  const UPSTASH_REDIS_REST_URL = Deno.env.get("UPSTASH_REDIS_REST_URL")!;
  const UPSTASH_REDIS_REST_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!;

  const key = `${prefix}:${identifier}`;
  
  // Parse window (e.g., "1 h" = 3600 seconds)
  const windowSeconds = parseWindow(window);
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - windowSeconds;

  // Get current count
  const response = await fetch(
    `${UPSTASH_REDIS_REST_URL}/pipeline`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["ZCOUNT", key, windowStart, "+inf"],
        ["ZADD", key, now, `${now}-${Math.random()}`],
        ["EXPIRE", key, windowSeconds],
        ["ZREMRANGEBYSCORE", key, "-inf", windowStart],
      ]),
    }
  );

  if (!response.ok) {
    throw new Error(`Upstash API error: ${response.statusText}`);
  }

  const results = await response.json();
  const currentCount = results[0].result || 0;
  const newCount = currentCount + 1;
  const reset = now + windowSeconds;

  return {
    success: newCount <= limit,
    limit,
    remaining: Math.max(0, limit - newCount),
    reset,
  };
}

/**
 * In-memory fallback rate limiting
 * Simple counter per identifier
 */
const memoryStore = new Map<string, { count: number; reset: number }>();

async function checkRateLimitMemory(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { limit, window } = config;
  const windowSeconds = parseWindow(window);
  const now = Math.floor(Date.now() / 1000);

  const key = identifier;
  const stored = memoryStore.get(key);

  // Clean expired entries
  if (stored && stored.reset < now) {
    memoryStore.delete(key);
  }

  const current = memoryStore.get(key) || { count: 0, reset: now + windowSeconds };

  if (current.reset < now) {
    // Reset window
    current.count = 0;
    current.reset = now + windowSeconds;
  }

  current.count++;
  memoryStore.set(key, current);

  return {
    success: current.count <= limit,
    limit,
    remaining: Math.max(0, limit - current.count),
    reset: current.reset,
  };
}

/**
 * Parse window string to seconds
 * Examples: "1 h" = 3600, "15 m" = 900, "1 d" = 86400
 */
function parseWindow(window: string): number {
  const match = window.match(/^(\d+)\s*(h|m|d|s)$/);
  if (!match) {
    throw new Error(`Invalid window format: ${window}. Use format like "1 h", "15 m", "1 d"`);
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case "s": return value;
    case "m": return value * 60;
    case "h": return value * 3600;
    case "d": return value * 86400;
    default: throw new Error(`Unknown unit: ${unit}`);
  }
}

/**
 * Get user identifier for rate limiting
 * Uses user ID if authenticated, otherwise IP address
 */
export function getRateLimitIdentifier(
  user: { id: string } | null,
  req: Request
): string {
  if (user) {
    return `user:${user.id}`;
  }

  // Fallback to IP address
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return `ip:${ip}`;
}

