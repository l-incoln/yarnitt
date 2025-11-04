import request from "supertest";
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import authRoutes from "../src/routes/auth";
import { User } from "../src/models/User";

let mongoServer: MongoMemoryServer | null = null;
let app: express.Application;

beforeAll(async () => {
  // Disable rate limiting for tests
  process.env.DISABLE_RATE_LIMIT = "true";
  
  let mongoUri: string;

  // Check if MONGO_URI is provided in environment (for CI/CD or local with MongoDB running)
  if (process.env.MONGO_URI) {
    mongoUri = process.env.MONGO_URI;
    console.log("Using provided MONGO_URI for tests");
  } else {
    // Try to use in-memory MongoDB server
    try {
      mongoServer = await MongoMemoryServer.create();
      mongoUri = mongoServer.getUri();
      console.log("Using in-memory MongoDB server for tests");
    } catch (error) {
      console.error("Failed to create in-memory MongoDB server:", error);
      console.log("To run tests, either:");
      console.log("1. Ensure MongoDB is accessible and set MONGO_URI environment variable");
      console.log("2. Or allow network access for mongodb-memory-server to download binaries");
      throw error;
    }
  }

  // Connect to the database
  await mongoose.connect(mongoUri);

  // Create Express app for testing
  app = express();
  app.use(bodyParser.json());
  app.use("/auth", authRoutes);
});

afterAll(async () => {
  // Disconnect from database
  await mongoose.disconnect();
  
  // Stop in-memory server if it was created
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  // Clear the database before each test
  await User.deleteMany({});
});

describe("POST /auth/register", () => {
  it("should register a new user successfully and return 201 with tokens", async () => {
    const userData = {
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    };

    const response = await request(app)
      .post("/auth/register")
      .send(userData)
      .expect(201);

    expect(response.body).toHaveProperty("accessToken");
    expect(response.body).toHaveProperty("refreshToken");
    expect(response.body).toHaveProperty("user");
    expect(response.body.user.email).toBe(userData.email.toLowerCase());
    expect(response.body.user.name).toBe(userData.name);
    expect(response.body.user).toHaveProperty("id");
    expect(response.body.user).toHaveProperty("createdAt");

    // Verify user was created in database
    const user = await User.findOne({ email: userData.email.toLowerCase() });
    expect(user).not.toBeNull();
    expect(user?.email).toBe(userData.email.toLowerCase());
    expect(user?.name).toBe(userData.name);
  });

  it("should register a user without a name", async () => {
    const userData = {
      email: "noname@example.com",
      password: "password123",
    };

    const response = await request(app)
      .post("/auth/register")
      .send(userData)
      .expect(201);

    expect(response.body).toHaveProperty("accessToken");
    expect(response.body).toHaveProperty("refreshToken");
    expect(response.body.user.email).toBe(userData.email.toLowerCase());
  });

  it("should return 409 when registering with an existing email", async () => {
    const userData = {
      email: "duplicate@example.com",
      password: "password123",
      name: "First User",
    };

    // Register user first time
    await request(app).post("/auth/register").send(userData).expect(201);

    // Try to register again with same email
    const response = await request(app)
      .post("/auth/register")
      .send(userData)
      .expect(409);

    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toContain("already exists");
  });

  it("should return 400 for invalid email format", async () => {
    const invalidEmails = [
      "notanemail",
      "nodot@domain",
      "@nodomain.com",
      "spaces in@email.com",
      "",
    ];

    for (const email of invalidEmails) {
      const response = await request(app)
        .post("/auth/register")
        .send({
          email,
          password: "password123",
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Invalid email");
    }
  });

  it("should return 400 for password less than 8 characters", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({
        email: "test@example.com",
        password: "short",
      })
      .expect(400);

    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toContain("at least 8 characters");
  });

  it("should return 400 for missing password", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({
        email: "test@example.com",
      })
      .expect(400);

    expect(response.body).toHaveProperty("error");
  });

  it("should normalize email to lowercase", async () => {
    const userData = {
      email: "MixedCase@Example.COM",
      password: "password123",
    };

    const response = await request(app)
      .post("/auth/register")
      .send(userData)
      .expect(201);

    expect(response.body.user.email).toBe("mixedcase@example.com");

    const user = await User.findOne({ email: "mixedcase@example.com" });
    expect(user).not.toBeNull();
  });

  it("should hash the password (not store plain text)", async () => {
    const userData = {
      email: "secure@example.com",
      password: "password123",
    };

    await request(app).post("/auth/register").send(userData).expect(201);

    const user = await User.findOne({ email: userData.email });
    expect(user?.passwordHash).toBeDefined();
    expect(user?.passwordHash).not.toBe(userData.password);
    
    // Verify password can be verified
    const isValid = await user!.verifyPassword(userData.password);
    expect(isValid).toBe(true);
    
    // Verify wrong password fails
    const isInvalid = await user!.verifyPassword("wrongpassword");
    expect(isInvalid).toBe(false);
  });
});
