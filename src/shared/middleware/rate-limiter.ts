import { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export class RateLimitError extends Error {
  constructor() {
    super('Too many requests');
    this.name = 'RateLimitError';
  }
}

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: NextRequest): void => {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    const key = `${ip}:${req.nextUrl.pathname}`;
    const now = Date.now();
    const entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    entry.count++;
    if (entry.count > maxRequests) throw new RateLimitError();
  };
}
