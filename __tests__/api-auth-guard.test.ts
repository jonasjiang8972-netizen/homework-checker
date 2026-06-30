import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock next-auth
vi.mock('next-auth', () => ({
  default: () => vi.fn(),
  getServerSession: vi.fn(),
}));
import { getServerSession } from 'next-auth';

// Mock supabase — return a valid mock that won't crash route handlers
const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  then: vi.fn(function (cb: any) { return Promise.resolve(cb({ data: [], error: null })); }),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
};
const mockSupabase = {
  from: vi.fn(() => mockQueryBuilder),
};
vi.mock('../lib/supabase', () => ({
  getSupabase: vi.fn(() => mockSupabase),
  getSupabaseAdmin: vi.fn(() => mockSupabase),
  uploadImage: vi.fn(),
}));

function createRequest(opts: { method?: string; body?: any; url?: string } = {}): NextRequest {
  const url = opts.url || 'http://localhost:3000/api/test';
  if (opts.method === 'POST' || opts.method === 'PATCH') {
    return new NextRequest(url, {
      method: opts.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts.body || {}),
    });
  }
  return new NextRequest(url);
}

function mockSession(email: string | null) {
  vi.mocked(getServerSession).mockResolvedValue(
    email ? { user: { email, name: email.split('@')[0] }, expires: '' } as any : null
  );
}

describe('/api/plans auth guard', () => {
  beforeEach(() => mockSession(null));

  it('GET 未登录应返回 401', async () => {
    const { GET } = await import('../app/api/plans/route');
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toContain('请先登录');
  });

  it('PATCH 未登录应返回 401', async () => {
    const { PATCH } = await import('../app/api/plans/route');
    const req = createRequest({ method: 'PATCH', body: { id: '1', status: 'done' } });
    const res = await PATCH(req);
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toContain('请先登录');
  });
});

describe('/api/questions auth guard', () => {
  beforeEach(() => mockSession(null));

  it('GET 未登录应返回 401', async () => {
    const { GET } = await import('../app/api/questions/route');
    const req = createRequest();
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toContain('请先登录');
  });
});

describe('/api/stats auth guard', () => {
  beforeEach(() => mockSession(null));

  it('GET 未登录应返回 401', async () => {
    const { GET } = await import('../app/api/stats/route');
    const req = createRequest();
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toContain('请先登录');
  });
});

describe('/api/quiz auth guard', () => {
  beforeEach(() => mockSession(null));

  it('GET 未登录应返回 401', async () => {
    const { GET } = await import('../app/api/quiz/route');
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toContain('请先登录');
  });
});

describe('/api/correct auth guard', () => {
  beforeEach(() => mockSession(null));

  it('POST 未登录应返回 401', async () => {
    const { POST } = await import('../app/api/correct/route');
    const req = createRequest({ method: 'POST' });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toContain('请先登录');
  });
});

describe('/api/user/settings auth guard', () => {
  beforeEach(() => mockSession(null));

  it('GET 未登录应返回 401', async () => {
    const { GET } = await import('../app/api/user/settings/route');
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toContain('请先登录');
  });

  it('PATCH 未登录应返回 401', async () => {
    const { PATCH } = await import('../app/api/user/settings/route');
    const req = createRequest({ method: 'PATCH', body: { defaultSubject: '英语' } });
    const res = await PATCH(req);
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toContain('请先登录');
  });
});

describe('/api/user/key auth guard', () => {
  beforeEach(() => mockSession(null));

  it('GET 未登录应返回 401', async () => {
    const { GET } = await import('../app/api/user/key/route');
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toContain('请先登录');
  });

  it('POST 未登录应返回 401', async () => {
    const { POST } = await import('../app/api/user/key/route');
    const req = createRequest({ method: 'POST', body: { apiKey: 'sk-test-long-key-for-test' } });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toContain('请先登录');
  });

  it('DELETE 未登录应返回 401', async () => {
    const { DELETE } = await import('../app/api/user/key/route');
    const res = await DELETE();
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toContain('请先登录');
  });
});
