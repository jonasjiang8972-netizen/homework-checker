import { NextRequest, NextResponse } from 'next/server';
import { getDb, execute, queryOne } from '../../../../lib/db';
import { hashPassword } from '../../../../lib/password';

export async function POST(request: NextRequest) {
  let body: { token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const token = body.token?.trim();
  const password = body.password?.trim();

  if (!token) return NextResponse.json({ error: '缺少重置令牌' }, { status: 400 });
  if (!password || password.length < 8) return NextResponse.json({ error: '密码至少 8 位' }, { status: 400 });

  await getDb();

  const user = queryOne('SELECT id, email_verify_sent_at FROM users WHERE email_verify_token = ?', [token]);
  if (!user) return NextResponse.json({ error: '重置链接无效或已过期' }, { status: 400 });

  const sentAt = user.email_verify_sent_at ? new Date(user.email_verify_sent_at).getTime() : 0;
  if (Date.now() - sentAt > 15 * 60 * 1000) {
    execute('UPDATE users SET email_verify_token = NULL WHERE id = ?', [user.id]);
    return NextResponse.json({ error: '重置链接已过期，请重新获取' }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  execute(
    `UPDATE users SET password_hash = ?, email_verify_token = NULL, email_verified = 1, email_due_at = ?, updated_at = datetime('now') WHERE id = ?`,
    [passwordHash, new Date(Date.now() + 30 * 86400000).toISOString(), user.id]
  );

  return NextResponse.json({ ok: true, message: '密码重置成功，请使用新密码登录' });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: '缺少重置令牌' }, { status: 400 });

  await getDb();
  const user = queryOne('SELECT id, email_verify_sent_at FROM users WHERE email_verify_token = ?', [token]);
  if (!user) return NextResponse.json({ error: '重置链接无效或已过期' }, { status: 400 });

  const sentAt = user.email_verify_sent_at ? new Date(user.email_verify_sent_at).getTime() : 0;
  if (Date.now() - sentAt > 15 * 60 * 1000) {
    execute('UPDATE users SET email_verify_token = NULL WHERE id = ?', [user.id]);
    return NextResponse.json({ error: '重置链接已过期，请重新获取' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, email: user.id });
}
