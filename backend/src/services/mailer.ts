import nodemailer from 'nodemailer';

const MAIL_SEND_MODE = (process.env.MAIL_SEND_MODE || 'dev').toLowerCase(); // 'dev' | 'ethereal' | 'prod'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const MAIL_FROM = process.env.MAIL_FROM || 'no-reply@example.com';

type SendInfo = {
  rawInfo: any;
  previewUrl?: string | null;
};

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

async function initTransporter(): Promise<nodemailer.Transporter> {
  if (transporterPromise) return transporterPromise;

  if (MAIL_SEND_MODE === 'prod') {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !port || !user || !pass) {
      throw new Error('SMTP configuration missing for MAIL_SEND_MODE=prod. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS.');
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    transporterPromise = Promise.resolve(transporter);
    return transporter;
  }

  if (MAIL_SEND_MODE === 'ethereal') {
    transporterPromise = nodemailer.createTestAccount().then((testAccount) => {
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      // eslint-disable-next-line no-console
      console.info('[mailer] ethereal account created', { user: testAccount.user, pass: testAccount.pass });
      return transporter;
    });
    return transporterPromise;
  }

  // dev default: jsonTransport
  const devTransporter = nodemailer.createTransport({ jsonTransport: true });
  transporterPromise = Promise.resolve(devTransporter);
  return devTransporter;
}

async function sendMail(to: string, subject: string, text: string, html?: string): Promise<SendInfo> {
  const transporter = await initTransporter();
  const msg = {
    from: MAIL_FROM,
    to,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(msg);

  let previewUrl: string | undefined | null = null;
  try {
    previewUrl = nodemailer.getTestMessageUrl(info) || null;
  } catch (e) {
    previewUrl = null;
  }

  // eslint-disable-next-line no-console
  console.info('[mailer] sendMail result:', { envelope: info?.envelope || null, messageId: info?.messageId || null, previewUrl });

  return { rawInfo: info, previewUrl: previewUrl ?? null };
}

export async function sendResetPasswordEmail(to: string, token: string) {
  const resetUrl = `${FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
  const subject = 'Reset your password';
  const text = `You requested a password reset. Click or open the link to reset your password:\n\n${resetUrl}\n\nIf you didn't request this, ignore this message.`;
  const html = `
    <p>You requested a password reset.</p>
    <p><a href="${resetUrl}">Reset your password</a></p>
    <p>If you didn't request this, ignore this message.</p>
  `;

  return sendMail(to, subject, text, html);
}

export function isMailerProd() {
  return MAIL_SEND_MODE === 'prod';
}

export function isMailerEthereal() {
  return MAIL_SEND_MODE === 'ethereal';
}

export function isMailerDev() {
  return MAIL_SEND_MODE === 'dev';
}

export default {
  sendResetPasswordEmail,
  isMailerProd,
  isMailerEthereal,
  isMailerDev,
};
