import { NextRequest, NextResponse } from 'next/server';
import { getDb, execute, queryOne } from '../../../../lib/db';
import { generateVerifyToken } from '../../../../lib/password';
import { sendVerificationCode } from '../../../../lib/email';
import { checkRateLimit, getClientIp } from '../../../../lib/rate-limit';

export async function POST(request: NextRequest) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: '请输入邮箱' }, { status: 400 });
  }

  const ip = getClientIp(request);
  if (!checkRateLimit('resend-verify', `ip:${ip}`, 3, 300_000)) {
    return NextResponse.json({ error: '操作太频繁，请 5 分钟后再试' }, { status: 429 });
  }

  await getDb();

  const user = queryOne('SELECT id, email, email_verified FROM users WHERE email = ?', [email]);
  if (!user) {
    return NextResponse.json({ error: '该邮箱未注册' }, { status: 404 });
  }

  if (user.email_verified) {
    return NextResponse.json({ error: '邮箱已验证' }, { status: 400 });
  }

  const verifyToken = generateVerifyToken();
  execute(
    `UPDATE users SET email_verify_token = ?, email_verify_sent_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    [verifyToken, user.id]
  );

  const baseUrl = process.env.NEXTAUTH_URL || 'http://1.116.253.201:3000';
  await sendVerificationCode(email, verifyToken, baseUrl);

  return NextResponse.json({ ok: true, message: '验证邮件已发送' });
}
