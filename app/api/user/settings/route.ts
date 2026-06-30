import { getServerSession } from 'next-auth';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { execute, queryOne } from '../../../../lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const row = queryOne('SELECT default_subject, default_model, mode FROM user_settings WHERE user_id = ?', [session.user.email]);

  return NextResponse.json({
    defaultSubject: row?.default_subject || '数学',
    defaultModel: row?.default_model || 'claude-3-5-sonnet-latest',
    mode: row?.mode || 'student',
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  let body: { defaultSubject?: string; defaultModel?: string; mode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  execute(
    `INSERT INTO user_settings (user_id, default_subject, default_model, mode, updated_at) VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET default_subject = ?, default_model = ?, mode = ?, updated_at = datetime('now')`,
    [
      session.user.email, body.defaultSubject || '数学', body.defaultModel || 'claude-3-5-sonnet-latest', body.mode || 'student',
      body.defaultSubject || '数学', body.defaultModel || 'claude-3-5-sonnet-latest', body.mode || 'student',
    ],
  );

  return NextResponse.json({ ok: true });
}
