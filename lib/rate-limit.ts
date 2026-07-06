import { NextRequest } from 'next/server';

const stores = new Map<string, Map<string, { count: number; resetAt: number }>>();

setInterval(() => {
  const now = Date.now();
  for (const store of stores.values()) {
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }
}, 60_000);

export function checkRateLimit(
  namespace: string,
  key: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  if (!stores.has(namespace)) stores.set(namespace, new Map());
  const store = stores.get(namespace)!;

  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

export function getClientIp(request: NextRequest): string {
  const xpi = (request as any).ip;
  if (xpi) return xpi;

  const xri = request.headers.get('x-real-ip');
  if (xri && /^[0-9a-fA-F.:]+$/.test(xri.trim())) return xri.trim();

  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const ip = xff.split(',')[0]?.trim();
    if (ip && /^[0-9a-fA-F.:]+$/.test(ip)) return ip;
  }

  return 'unknown';
}
