import { Request, Response } from "express";
import { User } from "../models/User";
import { signAccessToken, signRefreshToken } from "../utils/jwt";

// Email regex for basic validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Register a new user
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name } = req.body;

    // Validate request body
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
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      name: name || undefined,
    });

    // Hash and set password
    await user.setPassword(password);

    // Save user to database
    await user.save();

    // Generate tokens
    const tokenPayload = {
      userId: (user._id as any).toString(),
      email: user.email,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    // Return success response with tokens
    res.status(201).json({
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
    // Handle duplicate key error from MongoDB
    if (error.code === 11000) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
