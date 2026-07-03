import { NextRequest, NextResponse } from 'next/server';
import { getDb, execute, queryOne, generateId } from '../../../../lib/db';
import { hashPassword, generateVerifyToken, calculateNextDueDate } from '../../../../lib/password';
import { sendVerificationCode } from '../../../../lib/email';
import { checkRateLimit, getClientIp } from '../../../../lib/rate-limit';

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();
  const name = body.name?.trim() || email?.split('@')[0];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: '请输入正确的邮箱地址' }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: '密码至少 8 位' }, { status: 400 });
  }

  const ip = getClientIp(request);
  if (!checkRateLimit('register', `ip:${ip}`, 3, 300_000)) {
    return NextResponse.json({ error: '操作太频繁，请 5 分钟后再试' }, { status: 429 });
  }

  await getDb();

  const existing = queryOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return NextResponse.json({ error: '该邮箱已被注册' }, {status: 400 });
  }

  const id = generateId();
  const passwordHash = await hashPassword(password);
  const verifyToken = generateVerifyToken();
  const nextDue = calculateNextDueDate(new Date());

  execute(
    `INSERT INTO users (id, email, password_hash, name, email_verified, email_verify_token, email_verify_sent_at, email_due_at)
     VALUES (?, ?, ?, ?, 0, ?, datetime('now'), ?)`,
    [id, email, passwordHash, name, verifyToken, nextDue.toISOString()]
  );

  const baseUrl = process.env.NEXTAUTH_URL || 'http://1.116.253.201:3000';
  await sendVerificationCode(email, verifyToken, baseUrl);

  const user = queryOne('SELECT id, email, name, email_verified, email_due_at FROM users WHERE id = ?', [id]);

  return NextResponse.json({
    ok: true,
    message: '注册成功，请查收验证邮件',
    user: {
      id: user?.id,
      email: user?.email,
      name: user?.name,
      emailVerified: !!user?.email_verified,
    },
  });
}
