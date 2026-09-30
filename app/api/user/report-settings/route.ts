import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { execute } from '../../../../lib/db';
import { checkRateLimit } from '../../../../lib/rate-limit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 家长周报设置：{ parentEmail, weeklyReport }（与其他设置分开保存，避免互相覆盖） */
export async function PATCH(request: NextRequest) {
  const session = await getServerSession();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  if (!(await checkRateLimit('report-settings', email, 20, 60_000))) {
    return NextResponse.json({ error: '操作太频繁' }, { status: 429 });
  }

  let body: { parentEmail?: string; weeklyReport?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const parentEmail = (body.parentEmail ?? '').trim();
  if (parentEmail && (parentEmail.length > 254 || !EMAIL_RE.test(parentEmail))) {
    return NextResponse.json({ error: '家长邮箱格式不正确' }, { status: 400 });
  }
  const weekly = body.weeklyReport ? 1 : 0;
  if (weekly && !parentEmail) {
    return NextResponse.json({ error: '开启周报需要先填写家长邮箱' }, { status: 400 });
  }

  execute(
    `INSERT INTO user_settings (user_id, parent_email, weekly_report, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET parent_email = ?, weekly_report = ?, updated_at = datetime('now')`,
    [email, parentEmail || null, weekly, parentEmail || null, weekly],
  );

  return NextResponse.json({ ok: true });
}
