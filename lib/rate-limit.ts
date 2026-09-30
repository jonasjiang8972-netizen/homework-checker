import { NextRequest } from 'next/server';

/**
 * 限流：配置了 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN 时使用共享的 Redis 计数
 * （多实例、serverless 下也生效）；未配置或 Redis 不可用时回退到进程内存计数。
 */

const stores = new Map<string, Map<string, { count: number; resetAt: number }>>();

const cleanup = setInterval(() => {
  const now = Date.now();
  for (const store of stores.values()) {
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }
}, 60_000);
if (typeof cleanup.unref === 'function') cleanup.unref();

/** 进程内计数（同步）。返回 true 表示放行。 */
export function checkRateLimitMemory(
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

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ''), token };
}

/** 固定窗口计数：INCR 后首次设置过期。Redis 出错时抛出，由调用方回退。 */
async function checkRateLimitRedis(
  cfg: { url: string; token: string },
  namespace: string,
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  const redisKey = `rl:${namespace}:${key}`;
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      ['INCR', redisKey],
      ['PEXPIRE', redisKey, String(windowMs), 'NX'],
    ]),
    signal: AbortSignal.timeout(1500),
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const data = (await res.json()) as Array<{ result?: number; error?: string }>;
  const count = data?.[0]?.result;
  if (typeof count !== 'number') throw new Error(data?.[0]?.error || 'redis bad response');
  return count <= maxRequests;
}

export async function checkRateLimit(
  namespace: string,
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  const cfg = redisConfig();
  if (cfg) {
    try {
      return await checkRateLimitRedis(cfg, namespace, key, maxRequests, windowMs);
    } catch {
      // Redis 不可用时降级为进程内计数，避免限流失效或整站不可用
    }
  }
  return checkRateLimitMemory(namespace, key, maxRequests, windowMs);
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
