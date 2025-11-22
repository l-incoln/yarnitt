import { Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';
import RefreshToken from '../models/RefreshToken';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';

function isValidEmail(email: string) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Register Buyer
export async function registerBuyer(req: Request, res: Response) {
  try {
    const { name, email, phone, password } = req.body || {};
    
    // Validation
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'name, email, phone, and password are required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'invalid email format' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }

    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'email already registered' });
    }

    // Create buyer user
    const user = new User({
      email,
      password,
      name,
      phone,
      role: 'buyer',
    });
    await user.save();

    // Generate tokens
    const payload = { sub: user._id.toString(), email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Save refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      expiresAt,
    });

    return res.status(201).json({ 
      user: user.toJSON(),
      accessToken, 
      refreshToken 
    });
  } catch (err: any) {
    if (err && (err.code === 11000 || err.code === '11000')) {
      return res.status(409).json({ error: 'email already registered' });
    }
    console.error('registerBuyer error', err);
    return res.status(500).json({ error: 'internal error' });
  }
}

// Register Seller
export async function registerSeller(req: Request, res: Response) {
  try {
    const { name, email, phone, password, shopName, bio, kraPin } = req.body || {};
    
    // Validation
    if (!name || !email || !phone || !password || !shopName) {
      return res.status(400).json({ error: 'name, email, phone, password, and shopName are required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'invalid email format' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }

    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'email already registered' });
    }

    // Create seller user
    const user = new User({
      email,
      password,
      name,
      phone,
      role: 'seller',
      shopName,
      bio,
      kraPin,
      sellerStatus: 'pending',
    });
    await user.save();

    // Generate tokens
    const payload = { sub: user._id.toString(), email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Save refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      expiresAt,
    });

    return res.status(201).json({ 
      user: user.toJSON(),
      accessToken, 
      refreshToken,
      message: 'Your shop is pending approval'
    });
  } catch (err: any) {
    if (err && (err.code === 11000 || err.code === '11000')) {
      return res.status(409).json({ error: 'email already registered' });
    }
    console.error('registerSeller error', err);
    return res.status(500).json({ error: 'internal error' });
  }
}

// Login
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body || {};
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'invalid email or password' });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'invalid email or password' });
    }

    // Check if seller is approved
    if (user.role === 'seller' && user.sellerStatus !== 'approved') {
      return res.status(403).json({ 
        error: 'seller account is not approved',
        sellerStatus: user.sellerStatus 
      });
    }

    // Generate tokens
    const payload = { sub: user._id.toString(), email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Save refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      expiresAt,
    });

    return res.status(200).json({ 
      user: user.toJSON(),
      accessToken, 
      refreshToken 
    });
  } catch (err: any) {
    console.error('login error', err);
    return res.status(500).json({ error: 'internal error' });
  }
}

// Logout
export async function logout(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body || {};
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required' });
    }

    // Delete refresh token from database
    await RefreshToken.deleteOne({ token: refreshToken });

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err: any) {
    console.error('logout error', err);
    return res.status(500).json({ error: 'internal error' });
  }
}

// Forgot Password
export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body || {};
    
    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      // For security, don't reveal if email exists
      return res.status(200).json({ message: 'Password reset link sent' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // In production, send email with reset link
    return res.status(200).json({ 
      message: 'Password reset link sent',
      resetToken // Remove this in production
    });
  } catch (err: any) {
    console.error('forgotPassword error', err);
    return res.status(500).json({ error: 'internal error' });
  }
}

// Reset Password
export async function resetPassword(req: Request, res: Response) {
  try {
    const { token } = req.params;
    const { password } = req.body || {};
    
    if (!password) {
      return res.status(400).json({ error: 'password is required' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'invalid or expired reset token' });
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.status(200).json({ message: 'Password reset successful' });
  } catch (err: any) {
    console.error('resetPassword error', err);
    return res.status(500).json({ error: 'internal error' });
  }
}

// Refresh Token
export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body || {};
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required' });
    }

    // Check if refresh token exists in database
    const storedToken = await RefreshToken.findOne({ 
      token: refreshToken,
      revoked: false,
      expiresAt: { $gt: new Date() }
    });

    if (!storedToken) {
      return res.status(401).json({ error: 'invalid or expired refresh token' });
    }

    // Verify JWT signature
    let payload: any;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (err) {
      return res.status(401).json({ error: 'invalid refresh token signature' });
    }

    // Generate new access token
    const accessToken = signAccessToken({ 
      sub: payload.sub, 
      email: payload.email,
      role: payload.role 
    });

    return res.status(200).json({ accessToken });
  } catch (err: any) {
    console.error('refreshToken error', err);
    return res.status(500).json({ error: 'internal error' });
  }
}

// Get Current User
export async function getCurrentUser(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: 'not authenticated' });
    }

    return res.status(200).json({ user: user.toJSON() });
  } catch (err: any) {
    console.error('getCurrentUser error', err);
    return res.status(500).json({ error: 'internal error' });
  }
}

// Keep the old register function for backwards compatibility
export async function register(req: Request, res: Response) {
  return registerBuyer(req, res);
}