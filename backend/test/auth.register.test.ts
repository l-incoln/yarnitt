import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import authRoutes from "../src/routes/auth";
import { User } from "../src/models/User";

let app: express.Application;

// Setup test app
beforeAll(async () => {
  // Use MongoDB from environment or local
  const mongoUri = process.env.MONGO_URI_TEST || "mongodb://localhost:27017/yarnitt_test";
  
  // Connect with a timeout
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  
  // Setup Express app for testing
  app = express();
  app.use(bodyParser.json());
  app.use("/auth", authRoutes);

  // Set JWT_SECRET for testing
  process.env.JWT_SECRET = "test-secret-key";
  process.env.ACCESS_TOKEN_TTL = "15m";
  process.env.REFRESH_TOKEN_TTL = "7d";
}, 10000); // 10 second timeout for setup

// Cleanup after all tests
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

// Clear database between tests
beforeEach(async () => {
  await User.deleteMany({});
});

describe("POST /auth/register", () => {
  describe("Successful registration", () => {
    it("should return 201 with tokens when registration is successful", async () => {
      const response = await request(app)
        .post("/auth/register")
        .send({
          email: "test@example.com",
          password: "password123",
          name: "Test User",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("refreshToken");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toHaveProperty("email", "test@example.com");
      expect(response.body.user).toHaveProperty("name", "Test User");
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user).toHaveProperty("createdAt");

      // Verify user was created in database
      const user = await User.findOne({ email: "test@example.com" });
      expect(user).toBeTruthy();
      expect(user?.name).toBe("Test User");
    });

    it("should register user without name when name is not provided", async () => {
      const response = await request(app)
        .post("/auth/register")
        .send({
          email: "test2@example.com",
          password: "password123",
        });

      expect(response.status).toBe(201);
      expect(response.body.user.email).toBe("test2@example.com");
      expect(response.body.user.name).toBeUndefined();
    });

    it("should hash the password before saving", async () => {
      const password = "password123";
      await request(app)
        .post("/auth/register")
        .send({
          email: "test3@example.com",
          password,
        });

      const user = await User.findOne({ email: "test3@example.com" });
      expect(user).toBeTruthy();
      expect(user?.passwordHash).not.toBe(password);
      
      // Verify password can be verified
      const isValid = await user!.verifyPassword(password);
      expect(isValid).toBe(true);
    });
  });

  describe("Duplicate email handling", () => {
    it("should return 409 when registering with existing email", async () => {
      // First registration
      await request(app)
        .post("/auth/register")
        .send({
          email: "duplicate@example.com",
          password: "password123",
        });

      // Second registration with same email
      const response = await request(app)
        .post("/auth/register")
        .send({
          email: "duplicate@example.com",
          password: "password456",
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toMatch(/already exists/i);
    });

    it("should return 409 for duplicate email with different case", async () => {
      // First registration
      await request(app)
        .post("/auth/register")
        .send({
          email: "CaseTest@Example.com",
          password: "password123",
        });

      // Second registration with different case
      const response = await request(app)
        .post("/auth/register")
        .send({
          email: "casetest@example.com",
          password: "password456",
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Input validation", () => {
    it("should return 400 when email is missing", async () => {
      const response = await request(app)
        .post("/auth/register")
        .send({
          password: "password123",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toMatch(/email.*required/i);
    });

    it("should return 400 when password is missing", async () => {
      const response = await request(app)
        .post("/auth/register")
        .send({
          email: "test@example.com",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toMatch(/password.*required/i);
    });

    it("should return 400 when email format is invalid", async () => {
      const response = await request(app)
        .post("/auth/register")
        .send({
          email: "invalid-email",
          password: "password123",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toMatch(/invalid.*email/i);
    });

    it("should return 400 when password is less than 8 characters", async () => {
      const response = await request(app)
        .post("/auth/register")
        .send({
          email: "test@example.com",
          password: "short",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toMatch(/password.*8/i);
    });

    it("should accept password with exactly 8 characters", async () => {
      const response = await request(app)
        .post("/auth/register")
        .send({
          email: "test@example.com",
          password: "12345678",
        });

      expect(response.status).toBe(201);
    });
  });
});
