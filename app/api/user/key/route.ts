import { getServerSession } from 'next-auth';
import { getSupabaseAdmin } from '../../../../lib/supabase';
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

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ configured: false, error: '数据库未配置' });
  }

  const { data } = await supabase
    .from('user_settings')
    .select('anthropic_key_encrypted')
    .eq('user_id', session.user.email)
    .single();

  if (data?.anthropic_key_encrypted) {
    const decrypted = decrypt(data.anthropic_key_encrypted);
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

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: session.user.email,
      anthropic_key_encrypted: encrypted,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, maskedKey: maskApiKey(body.apiKey.trim()) });
}

export async function DELETE() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: '数据库未配置' }, { status: 503 });
  }

  await supabase
    .from('user_settings')
    .update({ anthropic_key_encrypted: null, updated_at: new Date().toISOString() })
    .eq('user_id', session.user.email);

  return NextResponse.json({ ok: true });
}
