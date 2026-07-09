import { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";

// ---------------------------------------------------------------------------
// Extend Express Request to carry authenticated user info
// ---------------------------------------------------------------------------
export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // ----- 1. Try Bearer token from Authorization header ----- //
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();

      if (token) {
        // If Firebase Admin is initialised, verify the token
        if (admin.apps.length > 0) {
          try {
            const authApp = admin.apps.find(app => app?.name === "authApp") || admin.app();
            const decoded = await authApp.auth().verifyIdToken(token);
            req.userId = decoded.uid;
            req.userEmail = decoded.email;
            return next();
          } catch (verifyErr) {
            console.warn(
              "[AUTH] Token verification failed:",
              (verifyErr as Error).message
            );
            // Fall through to other auth methods
          }
        } else {
          // Firebase not initialised – accept the token value as a userId for
          // local development / testing.
          console.warn(
            "[AUTH] Firebase Admin not initialised – using raw token as userId"
          );
          req.userId = token;
          return next();
        }
      }
    }

    // ----- 2. Fallback: userId query parameter (dev only) ----- //
    const queryUserId = req.query.userId as string | undefined;
    if (queryUserId && queryUserId.trim().length > 0) {
      console.warn(
        "[AUTH] Using query-param userId (dev fallback):",
        queryUserId
      );
      req.userId = queryUserId.trim();
      return next();
    }

    // ----- 3. Fallback: userId in request body ----- //
    const bodyUserId = (req.body as Record<string, unknown>)?.userId as
      | string
      | undefined;
    if (bodyUserId && bodyUserId.trim().length > 0) {
      console.warn("[AUTH] Using body userId (dev fallback):", bodyUserId);
      req.userId = bodyUserId.trim();
      return next();
    }

    // ----- No auth at all ----- //
    res.status(401).json({ error: "Authentication required" });
  } catch (err) {
    console.error("[AUTH] Unexpected error:", (err as Error).message);
    res.status(500).json({ error: "Authentication error" });
  }
}
