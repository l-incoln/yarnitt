import { Request, Response } from "express";
import mongoose from "mongoose";
import { User } from "../models/User";
import { signAccessToken, signRefreshToken } from "../utils/jwt";

// Email validation regex - simple and safe regex that avoids ReDoS
// This regex has linear time complexity and is not vulnerable to catastrophic backtracking
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Register a new user
 * POST /auth/register
 * Body: { email: string, password: string, name?: string }
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    // Validate password length
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters long" });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(409).json({ error: "User with this email already exists" });
      return;
    }

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      name: name || undefined,
    });

    // Set password (will be hashed)
    await user.setPassword(password);

    // Save user to database
    await user.save();

    // Generate tokens
    const tokenPayload = {
      userId: (user._id as mongoose.Types.ObjectId).toString(),
      email: user.email,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    // Return success response with tokens
    res.status(201).json({
      message: "User registered successfully",
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
    // Handle duplicate key error (in case unique index catches it)
    if (error.code === 11000) {
      res.status(409).json({ error: "User with this email already exists" });
      return;
    }

    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
