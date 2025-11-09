import express from "express";

const app = express();
app.use(express.json());

// Example middleware where _next is intentionally unused
app.use((req, res, _next) => {
  void _next;
  res.setHeader("X-OK", "true");
});

// Minimal health route
app.get("/health", (_req, res) => res.json({ status: "ok" }));

export default app;
