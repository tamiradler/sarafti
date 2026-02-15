import { headers } from "next/headers";

type RateLimitConfig = {
  windowMs: number;
  limit: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

const bucketStore = new Map<string, number[]>();

function cleanupBucket(bucket: number[], now: number, windowMs: number): number[] {
  return bucket.filter((timestamp) => now - timestamp < windowMs);
}

export function checkRateLimit(identifier: string, action: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const key = `${action}:${identifier}`;
  const existing = bucketStore.get(key) ?? [];
  const active = cleanupBucket(existing, now, config.windowMs);

  if (active.length >= config.limit) {
    const resetAt = active[0] + config.windowMs;
    bucketStore.set(key, active);
    return {
      allowed: false,
      remaining: 0,
      resetAt
    };
  }

  active.push(now);
  bucketStore.set(key, active);

  return {
    allowed: true,
    remaining: Math.max(0, config.limit - active.length),
    resetAt: now + config.windowMs
  };
}

export function getRequestIdentifier(): string {
  const headerStore = headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return realIp ?? "unknown";
}
