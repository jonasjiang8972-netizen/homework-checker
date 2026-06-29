import { getServerSession } from 'next-auth';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ defaultSubject: '数学', defaultModel: 'claude-3-5-sonnet-latest' });
  }

  const { data } = await supabase
    .from('user_settings')
    .select('default_subject, default_model')
    .eq('user_id', session.user.email)
    .single();

  return NextResponse.json({
    defaultSubject: data?.default_subject || '数学',
    defaultModel: data?.default_model || 'claude-3-5-sonnet-latest',
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  let body: { defaultSubject?: string; defaultModel?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: '数据库未配置' }, { status: 503 });
  }

  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  if (body.defaultSubject) update.default_subject = body.defaultSubject;
  if (body.defaultModel) update.default_model = body.defaultModel;

  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: session.user.email, ...update }, { onConflict: 'user_id' });

  if (error) {
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
