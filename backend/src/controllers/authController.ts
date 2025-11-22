import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Seller } from '../models/Seller';

// WARNING: In production, JWT_SECRET must be set via environment variable
// Using default for development purposes only
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET not set in production environment');
  process.exit(1);
}

// Helper function to generate JWT token
function generateToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

// Register Buyer
export async function registerBuyer(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, password, and name are required' 
      });
    }

    // Check if email exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      name,
      role: 'buyer',
    });

    // Generate token
    const token = generateToken(user._id.toString(), user.role);

    return res.status(201).json({
      success: true,
      message: 'Buyer registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Register buyer error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
}

// Register Seller
export async function registerSeller(req: Request, res: Response) {
  try {
    const { email, password, name, shopName } = req.body;

    // Validation
    if (!email || !password || !name || !shopName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, password, name, and shop name are required' 
      });
    }

    // Check if email exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }

    // Check if shop name exists
    const existingShop = await Seller.findOne({ shopName });
    if (existingShop) {
      return res.status(400).json({ 
        success: false, 
        message: 'Shop name already taken' 
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      name,
      role: 'seller',
    });

    // Create seller profile
    const seller = await Seller.create({
      userId: user._id,
      shopName,
      approvalStatus: 'pending',
    });

    // Generate token
    const token = generateToken(user._id.toString(), user.role);

    return res.status(201).json({
      success: true,
      message: 'Seller registered successfully. Your account is pending approval.',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      seller: {
        id: seller._id,
        shopName: seller.shopName,
        approvalStatus: seller.approvalStatus,
      },
    });
  } catch (error: any) {
    console.error('Register seller error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
}

// Login
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Account is deactivated' 
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // If seller, check approval status
    let sellerInfo = null;
    if (user.role === 'seller') {
      const seller = await Seller.findOne({ userId: user._id });
      if (seller) {
        if (seller.approvalStatus === 'banned') {
          return res.status(403).json({ 
            success: false, 
            message: 'Your seller account has been banned' 
          });
        }
        sellerInfo = {
          id: seller._id,
          shopName: seller.shopName,
          approvalStatus: seller.approvalStatus,
        };
      }
    }

    // Generate token
    const token = generateToken(user._id.toString(), user.role);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      seller: sellerInfo,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
}

// Get Me
export async function getMe(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authenticated' 
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // If seller, fetch seller profile
    let sellerInfo = null;
    if (user.role === 'seller') {
      const seller = await Seller.findOne({ userId: user._id });
      if (seller) {
        sellerInfo = {
          id: seller._id,
          shopName: seller.shopName,
          bio: seller.bio,
          logo: seller.logo,
          banner: seller.banner,
          approvalStatus: seller.approvalStatus,
          rating: seller.rating,
          totalSales: seller.totalSales,
          totalOrders: seller.totalOrders,
        };
      }
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
      },
      seller: sellerInfo,
    });
  } catch (error: any) {
    console.error('Get me error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
}

// Forgot Password
export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    const user = await User.findOne({ email }).select('+resetPasswordToken +resetPasswordExpires');
    
    // Don't reveal if user exists for security
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token and save to user
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour from now

    await user.save();

    // TODO: Send email in production
    // For development, log the reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    console.log('Password Reset URL:', resetUrl);

    return res.status(200).json({
      success: true,
      message: 'If the email exists, a password reset link has been sent',
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
}

// Reset Password
export async function resetPassword(req: Request, res: Response) {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters' 
      });
    }

    // Hash the provided token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset token' 
      });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
}

// Verify Token
export async function verifyToken(req: Request, res: Response) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(200).json({ valid: false });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
      
      const user = await User.findById(decoded.userId);
      
      if (!user || !user.isActive) {
        return res.status(200).json({ valid: false });
      }

      return res.status(200).json({
        valid: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      return res.status(200).json({ valid: false });
    }
  } catch (error: any) {
    console.error('Verify token error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
}