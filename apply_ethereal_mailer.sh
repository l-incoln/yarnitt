#!/usr/bin/env bash
# Apply Ethereal mailer support and patch forgot-password handler.
# Usage:
#   chmod +x apply_ethereal_mailer.sh
#   ./apply_ethereal_mailer.sh
set -euo pipefail

ROOT="$(pwd)"
BACKEND="$ROOT/backend"
SRV_DIR="$BACKEND/src/services"
ROUTES_DIR="$BACKEND/src/routes"
MAILER_FILE="$SRV_DIR/mailer.ts"
AUTH_FILE="$ROUTES_DIR/auth.ts"
ENV_EXAMPLE="$BACKEND/.env.example"
BACKUP_DIR="$BACKEND/backups/ethereal-$(date +%Y%m%d%H%M%S)"

echo "Repo root: $ROOT"
if [ ! -d "$BACKEND" ]; then
  echo "Error: backend folder not found at $BACKEND"
  exit 1
fi

mkdir -p "$BACKUP_DIR" "$SRV_DIR" "$ROUTES_DIR"

backup_if() {
  local f="$1"
  if [ -f "$f" ]; then
    echo "Backing up $f -> $BACKUP_DIR/$(basename "$f").bak"
    cp -v "$f" "$BACKUP_DIR/$(basename "$f").bak"
  fi
}

backup_if "$MAILER_FILE"
backup_if "$AUTH_FILE"
backup_if "$ENV_EXAMPLE"

echo "Writing $MAILER_FILE..."
cat > "$MAILER_FILE" <<'TS'
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
TS

echo "Updating .env.example (MAIL_SEND_MODE=ethereal)..."
cat > "$ENV_EXAMPLE" <<'ENV'
# Mailer settings
# Options: dev (json transport, returns token), ethereal (send via Ethereal & returns previewUrl), prod (send via SMTP, returns ok only)
MAIL_SEND_MODE=ethereal
MAIL_FROM="no-reply@example.com"
FRONTEND_URL="http://localhost:3000"

# For prod (SMTP) mode:
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=username
# SMTP_PASS=password
ENV

if [ ! -f "$AUTH_FILE" ]; then
  echo "Error: auth file not found at $AUTH_FILE"
  exit 1
fi

echo "Patching $AUTH_FILE (forgot-password handler)..."
# Replace the first send-block following 'user.save();' with ethereal-aware send logic.
awk '
  BEGIN { done=0 }
  {
    printline = $0
    print printline
    if (done==0 && /user\.save\(\);/) {
      # inject new send block
      print "    try {"
      print "      const info = await mailer.sendResetPasswordEmail(user.email, resetPlain);"
      print ""
      print "      if (mailer.isMailerProd()) {"
      print "        return res.json({ ok: true });"
      print "      }"
      print ""
      print "      if (mailer.isMailerEthereal()) {"
      print "        return res.json({ ok: true, previewUrl: info.previewUrl, expiresAt: expires });"
      print "      }"
      print ""
      print "      return res.json({ ok: true, resetToken: resetPlain, expiresAt: expires, emailSendInfo: info });"
      print "    } catch (sendErr) {"
      print "      console.error(\"Failed to send reset email\", sendErr);"
      print "      return res.status(500).json({ error: \"Failed to send reset email\" });"
      print "    }"
      done=1
    }
  }
' "$AUTH_FILE" > "$AUTH_FILE.tmp" && mv "$AUTH_FILE.tmp" "$AUTH_FILE"

echo "Installing nodemailer in backend..."
cd "$BACKEND"
npm install --no-audit --no-fund nodemailer
cd "$ROOT"

echo "Restarting backend with MAIL_SEND_MODE=ethereal..."
pkill -f ts-node-dev || true
# start with env var to force ethereal mode
nohup bash -lc "cd \"$BACKEND\" && MAIL_SEND_MODE=ethereal npm run dev" > /tmp/backend-dev.log 2>&1 &

echo "Waiting for server to come up..."
sleep 2
echo "=== /tmp/backend-dev.log (tail) ==="
tail -n 200 /tmp/backend-dev.log || true

echo
echo "Calling forgot-password (127.0.0.1) to show previewUrl (if created)..."
curl -4 -s -X POST "http://127.0.0.1:4000/api/auth/forgot-password" -H "Content-Type: application/json" -d '{"email":"buyer@test"}' | jq . || true

echo
echo "Backups are in: $BACKUP_DIR"
echo "Script complete."