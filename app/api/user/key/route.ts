import { getServerSession } from 'next-auth';
import { execute, generateId } from '../../../../lib/db';
import { encrypt, decrypt, maskApiKey } from '../../../../lib/encryption';
import { NextRequest, NextResponse } from 'next/server';

function getAuth() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.startsWith('your_')) return null;
  return { url, key };
}

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { queryOne } = await import('../../../../lib/db');
  const row = queryOne('SELECT anthropic_key_encrypted FROM user_settings WHERE user_id = ?', [session.user.email]);

  if (row?.anthropic_key_encrypted) {
    const decrypted = decrypt(row.anthropic_key_encrypted as string);
    return NextResponse.json({
      configured: true,
      maskedKey: decrypted ? maskApiKey(decrypted) : null,
    });
  }

  return NextResponse.json({ configured: false });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  let body: { apiKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  if (!body.apiKey || typeof body.apiKey !== 'string' || body.apiKey.trim().length < 10) {
    return NextResponse.json({ error: 'API Key 格式不正确' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: '数据库未配置' }, { status: 503 });
  }

  const encrypted = encrypt(body.apiKey.trim());

  execute(
    `INSERT INTO user_settings (user_id, anthropic_key_encrypted, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET anthropic_key_encrypted = ?, updated_at = datetime('now')`,
    [session.user.email, encrypted, encrypted],
  );

  return NextResponse.json({ ok: true, maskedKey: maskApiKey(body.apiKey.trim()) });
}

export async function DELETE() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  execute(
    'UPDATE user_settings SET anthropic_key_encrypted = NULL, updated_at = datetime(\'now\') WHERE user_id = ?',
    [session.user.email],
  );

  return NextResponse.json({ ok: true });
}
