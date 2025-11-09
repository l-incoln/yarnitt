import express, { Request, Response, NextFunction } from "express";

const app = express();
app.use(express.json());

// Example middleware where _next is intentionally unused
app.use((req: Request, res: Response, _next: NextFunction) => {
  void _next;
  res.setHeader("X-OK", "true");
});

// Minimal health route
app.get("/health", (_req: Request, res: Response) => res.json({ status: "ok" }));

export default app;
