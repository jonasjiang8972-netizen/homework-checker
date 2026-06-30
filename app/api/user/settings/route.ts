import { getServerSession } from 'next-auth';
import { execute, queryOne } from '../../../../lib/db';
import { checkRateLimit, getClientIp } from '../../../../lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  if (!checkRateLimit('user-settings', session.user.email, 20, 60_000)) {
    return NextResponse.json({ error: '操作太频繁' }, { status: 429 });
  }

  const row = queryOne('SELECT default_subject, default_model, mode, base_url FROM user_settings WHERE user_id = ?', [session.user.email]);

  return NextResponse.json({
    defaultSubject: row?.default_subject || '数学',
    defaultModel: row?.default_model || 'claude-3-5-sonnet-latest',
    mode: row?.mode || 'student',
    apiBaseUrl: row?.base_url || null,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  if (!checkRateLimit('user-settings', session.user.email, 20, 60_000)) {
    return NextResponse.json({ error: '操作太频繁' }, { status: 429 });
  }

  let body: { defaultSubject?: string; defaultModel?: string; mode?: string; apiBaseUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  execute(
    `INSERT INTO user_settings (user_id, default_subject, default_model, mode, base_url, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       default_subject = ?, default_model = ?, mode = ?, base_url = ?, updated_at = datetime('now')`,
    [
      session.user.email,
      body.defaultSubject || '数学', body.defaultModel || 'claude-3-5-sonnet-latest', body.mode || 'student',
      body.apiBaseUrl || null,
      body.defaultSubject || '数学', body.defaultModel || 'claude-3-5-sonnet-latest', body.mode || 'student',
      body.apiBaseUrl || null,
    ],
  );

  return NextResponse.json({ ok: true });
}
