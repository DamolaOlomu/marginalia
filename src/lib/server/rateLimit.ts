import { HttpError } from "./errors";

// In-memory, so limits are per server instance. Fine for one server; use Redis/Upstash if you scale out.
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);

  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  entry.count += 1;
  if (entry.count > limit) throw new HttpError(429, "Too many attempts. Wait a few minutes and try again.");
}

export const resetRateLimit = (key: string): void => void hits.delete(key);
