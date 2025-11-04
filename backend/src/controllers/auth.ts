import { Request, Response } from "express";
import mongoose from "mongoose";
import { User } from "../models/User";
import { signAccessToken, signRefreshToken } from "../utils/jwt";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        error: "Invalid email format",
      });
    }

    // Validate password length
    if (password.length < 8) {
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

    // Set password (hashes it)
    await user.setPassword(password);

    // Save user to database
    await user.save();

    // Generate tokens
    const tokenPayload = {
      sub: (user._id as mongoose.Types.ObjectId).toString(),
      email: user.email,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    // Return success with tokens
    return res.status(201).json({
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
