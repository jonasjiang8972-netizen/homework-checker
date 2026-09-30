import nodemailer from 'nodemailer';

export function isSmtpConfigured(): boolean {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

/** 通用邮件发送（与验证码邮件使用同一套 SMTP 配置） */
export async function sendMail(to: string, subject: string, text: string, html: string): Promise<void> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) throw new Error('SMTP not configured');

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 15000,
    socketTimeout: 15000,
    tls: { rejectUnauthorized: process.env.NODE_ENV !== 'production' },
    family: 4,
  } as any);

  await transporter.sendMail({ from: `作业小帮手 <${SMTP_USER}>`, to, subject, text, html });
}
