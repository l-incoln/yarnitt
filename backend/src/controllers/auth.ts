import { Request, Response } from "express";
import { User } from "../models/User";
import { signAccessToken, signRefreshToken } from "../utils/jwt";

// Simple email validation regex - validates basic email format
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Register a new user
 * POST /auth/register
 * Body: { email, password, name? }
 */
export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;

    // Validate email format
    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        error: "Invalid email format",
      });
    }

    // Validate password length
    if (!password || password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        error: "User with this email already exists",
      });
    }

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      name: name || undefined,
    });

    // Set password (hashed)
    await user.setPassword(password);

    // Save user
    await user.save();

    // Generate tokens
    const tokenPayload = {
      userId: (user._id as any).toString(),
      email: user.email,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    // Return success response
    return res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Registration error:", error);

    // Handle duplicate key error (MongoDB error code 11000)
    if (error.code === 11000) {
      return res.status(409).json({
        error: "User with this email already exists",
      });
    }

    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
