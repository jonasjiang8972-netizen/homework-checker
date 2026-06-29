import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export async function sendVerificationCode(email: string, code: string): Promise<void> {
  await getTransporter().sendMail({
    from: process.env.SMTP_USER,
    to: email,
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
