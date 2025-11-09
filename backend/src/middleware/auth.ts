import { Request, Response, NextFunction } from "express";
import User from "../models/User";

// allow a runtime require here but silence the ESLint rule for this line
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { verifyAccessToken } = require("../utils/jwt") as {
  verifyAccessToken?: (token: string) => unknown;
};

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).send({ error: "Missing authorization" });

    const token = authHeader.split(" ")[1];
    const payload = verifyAccessToken ? verifyAccessToken(token) : null;

    if (!payload || typeof payload !== "object") return res.status(401).send({ error: "Invalid token" });

    const payloadObj = payload as Record<string, unknown>;
    const userId =
      typeof payloadObj.sub === "string" ? payloadObj.sub : (payloadObj.userId as string | undefined);

    if (!userId) return res.status(401).send({ error: "Invalid token payload" });

    const user = await User.findById(userId).exec();
    if (!user) return res.status(401).send({ error: "User not found" });

    // attach user using a typed request augmentation (avoids `any`)
    const reqWithUser = req as Request & { user?: unknown };
    reqWithUser.user = user;

    return next();
  } catch (err) {
    return res.status(401).send({ error: "Unauthorized" });
  }
}
