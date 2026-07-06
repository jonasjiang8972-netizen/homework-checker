import nodemailer from 'nodemailer';

export async function sendVerificationCode(to: string, token: string, baseUrl?: string): Promise<void> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP not configured');
  }

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

  const verifyUrl = `${baseUrl || process.env.NEXTAUTH_URL || ''}/api/auth/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `作业小帮手 <${SMTP_USER}>`,
    to,
    subject: '作业小帮手 - 验证你的邮箱',
    text: `请点击以下链接验证你的邮箱：${verifyUrl} 如果不是你本人操作，请忽略本邮件。`,
    html: `<div style="font-family:sans-serif;padding:20px;max-width:480px">
      <h2 style="color:#1a1a2e">作业小帮手</h2>
      <p>请点击下方按钮验证你的邮箱：</p>
      <div style="text-align:center;margin:20px 0">
        <a href="${verifyUrl}" style="display:inline-block;padding:14px 32px;background:#4f6ef7;color:white;text-decoration:none;border-radius:10px;font-size:16px;font-weight:600">验证邮箱</a>
      </div>
      <p style="color:#8e95a2;font-size:13px">如果按钮无法点击，请复制以下链接到浏览器：<br/>${verifyUrl}</p>
      <p style="color:#8e95a2;font-size:13px">如果不是你本人操作，请忽略本邮件。</p>
    </div>`,
  });
}
