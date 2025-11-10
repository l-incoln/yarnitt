import jwt from 'jsonwebtoken';

const ACCESS_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '1h';
const REFRESH_EXPIRY_SECONDS = parseInt(process.env.REFRESH_TOKEN_SECONDS || String(7 * 24 * 60 * 60), 10);

export function signAccessToken(payload: { userId: string; role?: string }) {
  const token = jwt.sign(
    { userId: payload.userId, role: payload.role || 'BUYER' },
    process.env.JWT_SECRET || 'change-me',
    { expiresIn: ACCESS_EXPIRY }
  );
  return token;
}

export function verifyAccess(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET || 'change-me') as any;
}

export function getRefreshExpirySeconds() {
  return REFRESH_EXPIRY_SECONDS;
}
