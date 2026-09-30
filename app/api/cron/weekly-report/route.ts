import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getDb, queryAll, execute } from '../../../../lib/db';
import { loadWeeklyReport } from '../../../../lib/report-data';
import { renderReportHtml, renderReportText } from '../../../../lib/report';
import { isSmtpConfigured, sendMail } from '../../../../lib/mailer';

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization') || '';
  const given = Buffer.from(header.replace(/^Bearer\s+/i, ''));
  const expected = Buffer.from(secret);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

/**
 * 定时发送家长周报，由外部 cron 调用（如每周日 20:00）：
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/cron/weekly-report
 * 只发送给开启了周报、填写了家长邮箱、且 6 天内没发过的用户。
 */
async function handle(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSmtpConfigured()) return NextResponse.json({ error: 'SMTP not configured' }, { status: 503 });

  await getDb();
  const cutoff = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 19).replace('T', ' ');
  const targets = queryAll(
    `SELECT s.user_id AS email, s.parent_email, u.id AS uid, u.name
       FROM user_settings s JOIN users u ON u.email = s.user_id
      WHERE s.weekly_report = 1 AND s.parent_email IS NOT NULL AND s.parent_email != ''
        AND (s.last_report_at IS NULL OR s.last_report_at < ?)`,
    [cutoff],
  );

  let sent = 0;
  let failed = 0;
  for (const t of targets) {
    try {
      const report = await loadWeeklyReport(t.uid as string);
      const name = (t.name as string) || '孩子';
      await sendMail(t.parent_email as string, '作业小帮手 · 本周学习周报', renderReportText(report, name), renderReportHtml(report, name));
      execute("UPDATE user_settings SET last_report_at = datetime('now') WHERE user_id = ?", [t.email]);
      sent++;
    } catch {
      failed++;
    }
  }
  return NextResponse.json({ candidates: targets.length, sent, failed });
}

export const GET = handle;
export const POST = handle;
