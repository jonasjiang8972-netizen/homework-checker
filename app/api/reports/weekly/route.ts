import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getUserId } from '../../../../lib/auth-utils';
import { checkRateLimit, getClientIp } from '../../../../lib/rate-limit';
import { getDb, queryOne, execute } from '../../../../lib/db';
import { loadWeeklyReport } from '../../../../lib/report-data';
import { renderReportHtml, renderReportText } from '../../../../lib/report';
import { isSmtpConfigured, sendMail } from '../../../../lib/mailer';

/** 预览本周周报（JSON） */
export async function GET(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  if (!(await checkRateLimit('report-preview', getClientIp(request), 10, 60_000))) {
    return NextResponse.json({ error: '操作太频繁' }, { status: 429 });
  }

  return NextResponse.json({ report: await loadWeeklyReport(userId) });
}

/** 立即把周报发给已设置的家长邮箱 */
export async function POST(request: NextRequest) {
  const session = await getServerSession();
  const email = session?.user?.email;
  const userId = await getUserId();
  if (!email || !userId) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  if (!(await checkRateLimit('report-send', email, 3, 3_600_000))) {
    return NextResponse.json({ error: '发送太频繁，请一小时后再试' }, { status: 429 });
  }
  if (!isSmtpConfigured()) {
    return NextResponse.json({ error: '服务器未配置邮件服务' }, { status: 503 });
  }

  await getDb();
  const settings = queryOne('SELECT parent_email FROM user_settings WHERE user_id = ?', [email]);
  const parentEmail = settings?.parent_email as string | undefined;
  if (!parentEmail) return NextResponse.json({ error: '请先在设置中填写家长邮箱' }, { status: 400 });

  const report = await loadWeeklyReport(userId);
  const name = (session?.user?.name as string) || '孩子';
  try {
    await sendMail(parentEmail, '作业小帮手 · 本周学习周报', renderReportText(report, name), renderReportHtml(report, name));
  } catch {
    return NextResponse.json({ error: '邮件发送失败，请检查邮件服务配置' }, { status: 502 });
  }
  execute("UPDATE user_settings SET last_report_at = datetime('now') WHERE user_id = ?", [email]);
  return NextResponse.json({ ok: true });
}
