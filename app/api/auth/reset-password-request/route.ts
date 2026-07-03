import { NextRequest, NextResponse } from 'next/server';
import { getDb, execute, queryOne } from '../../../../lib/db';
import { generateVerifyToken } from '../../../../lib/password';
import { checkRateLimit, getClientIp } from '../../../../lib/rate-limit';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: '请输入正确的邮箱地址' }, { status: 400 });
  }

  const ip = getClientIp(request);
  if (!checkRateLimit('reset-password', `ip:${ip}`, 3, 300_000)) {
    return NextResponse.json({ error: '操作太频繁，请 5 分钟后再试' }, { status: 429 });
  }

  await getDb();

  const user = queryOne('SELECT id, email FROM users WHERE email = ?', [email]);
  if (!user) {
    return NextResponse.json({ ok: true, message: '如果该邮箱已注册，重置链接将发送到邮箱' });
  }

  const resetToken = generateVerifyToken();
  execute(
    `UPDATE users SET email_verify_token = ?, email_verify_sent_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    [resetToken, user.id]
  );

  const baseUrl = process.env.NEXTAUTH_URL || 'http://1.116.253.201:3000';
  await sendPasswordResetEmail(email, resetToken, baseUrl);

  return NextResponse.json({ ok: true, message: '如果该邮箱已注册，重置链接将发送到邮箱' });
}

async function sendPasswordResetEmail(to: string, token: string, baseUrl: string): Promise<void> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) throw new Error('SMTP not configured');

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 15000,
    socketTimeout: 15000,
    tls: { rejectUnauthorized: false },
    family: 4,
  } as any);

  const resetUrl = `${baseUrl}/api/auth/reset-password?token=${token}`;

  await transporter.sendMail({
    from: `作业小帮手 <${SMTP_USER}>`,
    to,
    subject: '作业小帮手 - 重置密码',
    text: `请点击以下链接重置你的密码：${resetUrl} 如果不是你本人操作，请忽略本邮件。`,
    html: `<div style="font-family:sans-serif;padding:20px;max-width:480px">
      <h2 style="color:#1a1a2e">作业小帮手</h2>
      <p>请点击下方按钮重置你的密码：</p>
      <div style="text-align:center;margin:20px 0">
        <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:#4f6ef7;color:white;text-decoration:none;border-radius:10px;font-size:16px;font-weight:600">重置密码</a>
      </div>
      <p style="color:#8e95a2;font-size:13px">如果按钮无法点击，请复制以下链接到浏览器：<br/>${resetUrl}</p>
      <p style="color:#8e95a2;font-size:13px">如果不是你本人操作，请忽略本邮件。</p>
    </div>`,
  });
}
