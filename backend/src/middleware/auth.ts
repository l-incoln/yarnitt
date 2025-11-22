import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Seller from '../models/Seller';

// WARNING: In production, JWT_SECRET must be set via environment variable
// Using default for development purposes only
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET not set in production environment');
  process.exit(1);
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
      };
    }
  }
}

// Authenticate middleware
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };

      // Find user and check if active
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid token or user not found' 
        });
      }

      // Attach user info to request
      req.user = {
        userId: decoded.userId,
        role: decoded.role,
      };

      next();
    } catch (error: any) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid token' 
        });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Token expired' 
        });
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during authentication' 
    });
  }
}

// Authorize by roles
export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authenticated' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
}

// Require approved seller
export async function requireApprovedSeller(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'seller') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only sellers can access this resource' 
      });
    }

    const seller = await Seller.findOne({ userId: req.user.userId });
    
    if (!seller) {
      return res.status(404).json({ 
        success: false, 
        message: 'Seller profile not found' 
      });
    }

    if (seller.approvalStatus === 'banned') {
      return res.status(403).json({ 
        success: false, 
        message: 'Your seller account has been banned' 
      });
    }

    if (seller.approvalStatus !== 'approved') {
      return res.status(403).json({ 
        success: false, 
        message: 'Your seller account is not approved yet' 
      });
    }

    next();
  } catch (error: any) {
    console.error('Require approved seller error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
}

// Optional authentication (doesn't fail if no token)
export async function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };

      // Find user and check if active
      const user = await User.findById(decoded.userId);
      if (user && user.isActive) {
        // Attach user info to request
        req.user = {
          userId: decoded.userId,
          role: decoded.role,
        };
      }
    } catch (error) {
      // Silently fail and continue without authentication
    }

    next();
  } catch (error: any) {
    // Continue without authentication on any error
    next();
  }
}
