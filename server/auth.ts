import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import type { User } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "your-refresh-secret-change-in-production";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function getRefreshTokenExpiry(): Date {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

export function authMiddleware(storage: any) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const user = await storage.getUser(payload.userId);
    if (!user || !user.active) {
      return res.status(401).json({ error: "User not found or inactive" });
    }

    req.user = user;
    next();
  };
}

export function optionalAuthMiddleware(storage: any) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];

    if (token) {
      const payload = verifyAccessToken(token);
      if (payload) {
        const user = await storage.getUser(payload.userId);
        if (user && user.active) {
          req.user = user;
        }
      }
    }

    next();
  };
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
}
