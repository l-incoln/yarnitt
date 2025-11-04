import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import path from "path";
import mongoose from "mongoose";
import { query } from "./db";
import authRoutes from "./routes/auth";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/yarnitt";
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT_BACKEND || 4000;

// Auth routes
app.use("/api/auth", authRoutes);

app.get("/api/ping", (_req, res) => res.json({ ok: true }));

// Simple products list (replace with real model/controller later)
app.get("/api/products", async (_req, res) => {
  try {
    // Example: read first 10 products from DB if available
    const r = await query("SELECT p.id, p.title, p.price, p.currency FROM products p LIMIT 10");
    if (r && r.rows && r.rows.length) {
      return res.json(r.rows);
    }
  } catch (err) {
    // ignore and fallback to sample
  }

  res.json([
    {
      id: "11111111-1111-1111-1111-111111111111",
      title: "Creme Baby Blanket",
      price: 3200,
      currency: "KES",
      images: [{ url: "/uploads/sample1.jpg", thumbnail_url: "/uploads/sample1-thumb.jpg", order: 0 }],
      is_sponsored: true
    }
  ]);
});

// Serve development uploads folder
const uploadsDir = path.join(__dirname, "..", "uploads");
app.use("/uploads", express.static(uploadsDir));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});