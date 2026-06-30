import { getServerSession } from 'next-auth';
import { execute, getDb, queryOne } from '../../../../lib/db';
import { encrypt, decrypt, maskApiKey } from '../../../../lib/encryption';
import { checkRateLimit, getClientIp } from '../../../../lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  if (!checkRateLimit('user-key', getClientIp(request), 20, 60_000)) {
    return NextResponse.json({ error: '操作太频繁' }, { status: 429 });
  }

  await getDb();
  const row = queryOne('SELECT anthropic_key_encrypted, base_url FROM user_settings WHERE user_id = ?', [session.user.email]);

  if (row?.anthropic_key_encrypted) {
    const decrypted = decrypt(row.anthropic_key_encrypted as string);
    return NextResponse.json({
      configured: true,
      maskedKey: decrypted ? maskApiKey(decrypted) : null,
      baseUrl: (row.base_url as string) || process.env.ANTHROPIC_BASE_URL || 'https://api.siliconflow.cn/v1',
    });
  }

  return NextResponse.json({
    configured: false,
    baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.siliconflow.cn/v1',
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    if (!checkRateLimit('user-key', session.user.email, 10, 60_000)) {
      return NextResponse.json({ error: '操作太频繁' }, { status: 429 });
    }

    let body: { apiKey?: string; baseUrl?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
    }

    if (!body.apiKey || typeof body.apiKey !== 'string' || body.apiKey.trim().length < 10) {
      return NextResponse.json({ error: 'API Key 格式不正确' }, { status: 400 });
    }

    const encrypted = encrypt(body.apiKey.trim());
    const baseUrl = body.baseUrl?.trim() || process.env.ANTHROPIC_BASE_URL || 'https://api.siliconflow.cn/v1';

    await getDb();
    execute(
      `INSERT INTO user_settings (user_id, anthropic_key_encrypted, base_url, updated_at) VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET anthropic_key_encrypted = ?, base_url = ?, updated_at = datetime('now')`,
      [session.user.email, encrypted, baseUrl, encrypted, baseUrl],
    );

    return NextResponse.json({ ok: true, maskedKey: maskApiKey(body.apiKey.trim()), baseUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : '未知错误';
    return NextResponse.json({ error: `服务器错误: ${message}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  if (!checkRateLimit('user-key', session.user.email, 5, 60_000)) {
    return NextResponse.json({ error: '操作太频繁' }, { status: 429 });
  }

  await getDb();
  execute(
    'UPDATE user_settings SET anthropic_key_encrypted = NULL, updated_at = datetime(\'now\') WHERE user_id = ?',
    [session.user.email],
  );

  return NextResponse.json({ ok: true });
}
