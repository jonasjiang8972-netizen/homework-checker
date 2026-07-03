import { NextRequest, NextResponse } from 'next/server';
import { getDb, execute, queryOne } from '../../../../lib/db';
import { calculateNextDueDate } from '../../../../lib/password';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: '缺少验证令牌' }, { status: 400 });
  }

  await getDb();

  const user = queryOne('SELECT id, email, email_verified, email_due_at FROM users WHERE email_verify_token = ?', [token]);
  if (!user) {
    return NextResponse.json({ error: '验证链接无效或已过期' }, { status: 400 });
  }

  const now = new Date();
  const nextDue = calculateNextDueDate(now);

  execute(
    `UPDATE users SET email_verified = 1, email_verify_token = NULL, email_verify_sent_at = datetime('now'), email_due_at = ?, updated_at = datetime('now') WHERE id = ?`,
    [nextDue.toISOString(), user.id]
  );

  const baseUrl = process.env.NEXTAUTH_URL || 'http://1.116.253.201:3000';
  return NextResponse.redirect(`${baseUrl}/settings?verified=1`);
}
