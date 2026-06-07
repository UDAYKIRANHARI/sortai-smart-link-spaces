import { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";
import { initializeFirebase, isFirebaseInitialized } from "../services/db";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!isFirebaseInitialized()) {
      initializeFirebase();
    }

    if (admin.apps.length === 0) {
      res.status(503).json({ error: "Authentication service unavailable" });
      return;
    }

    const token = authHeader.slice(7).trim();
    const decoded = await admin.auth().verifyIdToken(token, true);
    req.userId = decoded.uid;
    next();
  } catch (err) {
    console.error("[AUTH] Token verification failed:", (err as Error).message);
    res.status(401).json({ error: "Invalid authentication token" });
  }
}
