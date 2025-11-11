import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

/**
 * Lightweight auth controller helpers.
 * - Adds a `register` export so routes that import it compile.
 * - Avoids any `any` usage and replaces require(...) with import.
 *
 * NOTE: register currently does not persist users — replace the TODO
 * with real DB logic (and password hashing) for production use.
 */

const getJwtSecret = (): string | null => {
  const secret = process.env.JWT_SECRET;
  return secret && secret.length > 0 ? secret : null;
};

export const register = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password) {
      return res.status(400).json({ message: 'username and password are required' });
    }

    // TODO: persist the user (hash password, check duplicates). This is a placeholder so TS builds.
    // Example: const created = await userService.create({ username, passwordHash });

    const secret = getJwtSecret();
    if (!secret) {
      return res.status(500).json({ message: 'JWT secret not configured' });
    }

    const token = jwt.sign({ sub: username }, secret, { expiresIn: '1h' });
    return res.status(201).json({ user: { username }, token });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };

    // TODO: replace with real authentication (verify password, lookup user in DB)
    const isValidUser = Boolean(username && password);
    if (!isValidUser) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const secret = getJwtSecret();
    if (!secret) {
      return res.status(500).json({ message: 'JWT secret not configured' });
    }

    const token = jwt.sign({ sub: username }, secret, { expiresIn: '1h' });
    return res.json({ token });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  const parts = authHeader.split(' ');
  const token = parts.length === 2 ? parts[1] : parts[0];
  const secret = getJwtSecret();
  if (!secret) {
    res.status(500).json({ message: 'JWT secret not configured' });
    return;
  }

  jwt.verify(
    token,
    secret,
    (err: jwt.VerifyErrors | null, decoded: string | jwt.JwtPayload | undefined) => {
      if (err) {
        res.status(401).json({ message: 'Invalid token' });
        return;
      }

      const payload = decoded as jwt.JwtPayload | undefined;
      (req as Request & { user?: jwt.JwtPayload }).user = payload;

      next();
    }
  );
};