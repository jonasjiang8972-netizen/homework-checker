import { NextRequest, NextResponse } from 'next/server';
import { setVerificationCode } from '../../../../lib/auth-store';
import { sendVerificationCode } from '../../../../lib/email';

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

  const smtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  if (!smtpConfigured) {
    return NextResponse.json({ error: '邮件服务未配置，无法发送验证码' }, { status: 503 });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  setVerificationCode(email, code);

  try {
    await sendVerificationCode(email, code);
    return NextResponse.json({ ok: true, message: '验证码已发送到你的邮箱' });
  } catch (error) {
    return NextResponse.json({ error: '验证码发送失败，请检查邮箱地址或稍后重试' }, { status: 500 });
  }
}
