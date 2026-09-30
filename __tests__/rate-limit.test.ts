import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkRateLimit, checkRateLimitMemory } from '../lib/rate-limit';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('内存限流', () => {
  it('超过上限后拒绝', () => {
    const ns = `t-${Math.random()}`;
    expect([1, 2, 3].map(() => checkRateLimitMemory(ns, 'k', 3, 60_000))).toEqual([true, true, true]);
    expect(checkRateLimitMemory(ns, 'k', 3, 60_000)).toBe(false);
    expect(checkRateLimitMemory(ns, 'other', 3, 60_000)).toBe(true);
  });
});

describe('Redis 限流', () => {
  it('配置 Upstash 时使用共享计数', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'tok');
    let count = 0;
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([{ result: ++count }, { result: 1 }])));
    vi.stubGlobal('fetch', fetchMock);
    expect(await checkRateLimit('r', 'ip', 2, 1000)).toBe(true);
    expect(await checkRateLimit('r', 'ip', 2, 1000)).toBe(true);
    expect(await checkRateLimit('r', 'ip', 2, 1000)).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it('Redis 出错时降级到内存计数而不是放行所有请求', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'tok');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    const ns = `fb-${Math.random()}`;
    expect(await checkRateLimit(ns, 'k', 1, 1000)).toBe(true);
    expect(await checkRateLimit(ns, 'k', 1, 1000)).toBe(false);
  });
});
