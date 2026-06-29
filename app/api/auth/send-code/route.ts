import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationCode } from '../../../../lib/email';

const codeStore = new Map<string, { code: string; expires: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [email, entry] of codeStore) {
    if (now > entry.expires) codeStore.delete(email);
  }
}, 60_000);

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

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: '邮件服务未配置，无法发送验证码' }, { status: 503 });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  codeStore.set(email, { code, expires: Date.now() + 5 * 60 * 1000 });

  try {
    await sendVerificationCode(email, code);
    return NextResponse.json({ ok: true, message: '验证码已发送到你的邮箱' });
  } catch {
    return NextResponse.json({ error: '验证码发送失败，请检查邮箱地址或稍后重试' }, { status: 500 });
  }
}

export function verifyCode(email: string, code: string): boolean {
  const entry = codeStore.get(email);
  if (!entry) return false;
  if (Date.now() > entry.expires) {
    codeStore.delete(email);
    return false;
  }
  if (entry.code !== code) return false;
  codeStore.delete(email);
  return true;
}
