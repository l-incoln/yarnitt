import { Request, Response } from 'express';
import { User } from '../models/User';
import { signAccessToken, signRefreshToken } from '../utils/jwt';

function isValidEmail(email: string) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'invalid email' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'email already registered' });
    }

    const user = new User({ email, name });
    await user.setPassword(password);
    await user.save();

    const payload = { sub: user._id.toString(), email: user.email };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return res.status(201).json({ accessToken, refreshToken });
  } catch (err: any) {
    if (err && (err.code === 11000 || err.code === '11000')) {
      return res.status(409).json({ error: 'email already registered' });
    }
    console.error('register error', err);
    return res.status(500).json({ error: 'internal error' });
  }
}