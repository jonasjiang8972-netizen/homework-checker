import nodemailer from 'nodemailer';

export async function sendVerificationCode(to: string, code: string): Promise<void> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP not configured');
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: `作业小帮手 <${SMTP_USER}>`,
    to,
    subject: '作业小帮手 - 登录验证码',
    text: `你的验证码是：${code}，5分钟内有效。如果不是你本人操作，请忽略本邮件。`,
    html: `<div style="font-family:sans-serif;padding:20px;max-width:480px">
      <h2 style="color:#1a1a2e">作业小帮手</h2>
      <p>你的登录验证码是：</p>
      <div style="font-size:32px;font-weight:700;color:#4f6ef7;letter-spacing:8px;text-align:center;padding:16px;background:#f0f3ff;border-radius:8px;margin:12px 0">${code}</div>
      <p style="color:#8e95a2;font-size:13px">5分钟内有效，请勿泄露给他人。</p>
    </div>`,
  });
}
