import { ApiError } from "../../errors/api-error.ts";

export interface RateLimitResult { count: number; resetAt: number }
export interface RateLimitStore { increment(key: string, windowMs: number): Promise<RateLimitResult> }

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();
  private readonly now: () => number;
  constructor(now: () => number = Date.now) { this.now = now; }
  async increment(key: string, windowMs: number): Promise<RateLimitResult> {
    const now = this.now();
    const current = this.buckets.get(key);
    if (!current || current.resetAt <= now) {
      const next = { count: 1, resetAt: now + windowMs };
      this.buckets.set(key, next);
      return next;
    }
    current.count += 1;
    return { ...current };
  }
}

export class RateLimiter {
  private readonly store: RateLimitStore;
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly code: string;
  private readonly message: string;
  constructor(store: RateLimitStore, limit = 20, windowMs = 60_000, code = "RATE_LIMITED", message = "Too many requests. Please try again shortly.") {
    this.store = store; this.limit = limit; this.windowMs = windowMs; this.code = code; this.message = message;
  }
  async check(key: string) {
    const result = await this.store.increment(key, this.windowMs);
    if (result.count > this.limit) throw new ApiError(429, this.code, this.message);
    return result;
  }
}

export class InMemoryRateLimiter extends RateLimiter {
  constructor(limit = 20, windowMs = 60_000, now: () => number = Date.now) {
    super(new InMemoryRateLimitStore(now), limit, windowMs, "EMMY_RATE_LIMITED", "Emmy is receiving too many requests. Please try again shortly.");
  }
}
