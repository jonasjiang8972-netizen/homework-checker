const RESEND_API = 'https://api.resend.com/emails';

export async function sendVerificationCode(to: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not configured');

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: '作业小帮手 <onboarding@resend.dev>',
      to,
      subject: '作业小帮手 - 登录验证码',
      text: `你的验证码是：${code}，5分钟内有效。如果不是你本人操作，请忽略本邮件。`,
      html: `<div style="font-family:sans-serif;padding:20px;max-width:480px">
        <h2 style="color:#1a1a2e">作业小帮手</h2>
        <p>你的登录验证码是：</p>
        <div style="font-size:32px;font-weight:700;color:#4f6ef7;letter-spacing:8px;text-align:center;padding:16px;background:#f0f3ff;border-radius:8px;margin:12px 0">${code}</div>
        <p style="color:#8e95a2;font-size:13px">5分钟内有效，请勿泄露给他人。</p>
      </div>`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}
