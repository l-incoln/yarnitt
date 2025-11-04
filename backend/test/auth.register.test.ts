/**
 * Auth Registration Tests
 * 
 * Note: These tests require network access to download MongoDB binaries.
 * If running in a restricted network environment, mongodb-memory-server may fail.
 * To run these tests, ensure access to fastdl.mongodb.org or pre-install MongoDB.
 */

import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import bodyParser from "body-parser";
import authRoutes from "../src/routes/auth";
import { User } from "../src/models/User";

let mongoServer: MongoMemoryServer;
let app: express.Application;

beforeAll(async () => {
  // Create in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect to the in-memory database
  await mongoose.connect(mongoUri);

  // Setup Express app
  app = express();
  app.use(bodyParser.json());
  app.use("/auth", authRoutes);
});

afterAll(async () => {
  // Disconnect and stop the in-memory database
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all users before each test
  await User.deleteMany({});
});

describe("POST /auth/register", () => {
  it("should successfully register a new user with valid credentials", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("accessToken");
    expect(response.body).toHaveProperty("refreshToken");
    expect(typeof response.body.accessToken).toBe("string");
    expect(typeof response.body.refreshToken).toBe("string");

    // Verify user was created in database
    const user = await User.findOne({ email: "test@example.com" });
    expect(user).not.toBeNull();
    expect(user?.email).toBe("test@example.com");
    expect(user?.name).toBe("Test User");
  });

  it("should successfully register a user without optional name field", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({
        email: "testnoname@example.com",
        password: "password123",
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("accessToken");
    expect(response.body).toHaveProperty("refreshToken");

    const user = await User.findOne({ email: "testnoname@example.com" });
    expect(user).not.toBeNull();
    expect(user?.name).toBeUndefined();
  });

  it("should return 409 when email already exists", async () => {
    // Create a user first
    await request(app)
      .post("/auth/register")
      .send({
        email: "duplicate@example.com",
        password: "password123",
      });

    // Try to register with the same email
    const response = await request(app)
      .post("/auth/register")
      .send({
        email: "duplicate@example.com",
        password: "differentpassword",
      });

    expect(response.status).toBe(409);
    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toContain("already exists");
  });

  it("should return 400 when email is missing", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({
        password: "password123",
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toContain("required");
  });

  it("should return 400 when password is missing", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({
        email: "test@example.com",
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toContain("required");
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
    expect(response.body.error).toContain("Invalid email");
  });

  it("should return 400 when password is too short", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({
        email: "test@example.com",
        password: "short",
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toContain("at least 8 characters");
  });

  it("should handle case-insensitive email matching", async () => {
    // Register with lowercase email
    await request(app)
      .post("/auth/register")
      .send({
        email: "test@example.com",
        password: "password123",
      });

    // Try to register with uppercase version of same email
    const response = await request(app)
      .post("/auth/register")
      .send({
        email: "TEST@EXAMPLE.COM",
        password: "password123",
      });

    expect(response.status).toBe(409);
    expect(response.body).toHaveProperty("error");
  });

  it("should hash the password (not store in plain text)", async () => {
    await request(app)
      .post("/auth/register")
      .send({
        email: "test@example.com",
        password: "password123",
      });

    const user = await User.findOne({ email: "test@example.com" });
    expect(user).not.toBeNull();
    expect(user?.passwordHash).not.toBe("password123");
    expect(user?.passwordHash).toBeTruthy();
    
    // Verify password works
    const isValid = await user!.verifyPassword("password123");
    expect(isValid).toBe(true);
    
    const isInvalid = await user!.verifyPassword("wrongpassword");
    expect(isInvalid).toBe(false);
  });
});
