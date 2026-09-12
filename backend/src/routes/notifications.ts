import { Router, Response } from "express";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import {
  getPublicVapidKey,
  savePushSubscription,
  sendPushToUser,
  PushSubscriptionData,
} from "../services/notifications";
import { getLinks } from "../services/db";

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/notifications/vapid-key – return public VAPID key
// ---------------------------------------------------------------------------
router.get("/notifications/vapid-key", (_req, res: Response) => {
  res.json({ publicKey: getPublicVapidKey() });
});

// ---------------------------------------------------------------------------
// POST /api/notifications/subscribe – save web push subscription
// ---------------------------------------------------------------------------
router.post(
  "/notifications/subscribe",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const subscription = req.body as PushSubscriptionData;

      if (!subscription || !subscription.endpoint || !subscription.keys) {
        res.status(400).json({ error: "Invalid push subscription object" });
        return;
      }

      await savePushSubscription(userId, subscription);
      res.json({ success: true, message: "Push subscription saved" });
    } catch (err) {
      console.error("[NOTIFICATIONS] Subscribe error:", (err as Error).message);
      res.status(500).json({ error: "Failed to save push subscription" });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/notifications/trigger-daily – trigger daily commute highlight notification
// ---------------------------------------------------------------------------
router.post(
  "/notifications/trigger-daily",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const userLinks = await getLinks(userId);

      if (userLinks.length === 0) {
        res.json({ message: "No saved links to notify about" });
        return;
      }

      // Pick top 2 recent links
      const recent = userLinks.slice(0, 2);
      const spaceNames = [...new Set(recent.map((l) => l.space))].join(" & ");

      const result = await sendPushToUser(userId, {
        title: "🔔 SortAi Morning Highlight",
        body: `You saved ${recent.length} link${recent.length > 1 ? "s" : ""} in ${spaceNames} — read them on your commute today!`,
        url: "https://sortai.dev",
      });

      res.json({
        success: true,
        sentCount: result.successCount,
        failedCount: result.failureCount,
      });
    } catch (err) {
      console.error("[NOTIFICATIONS] Trigger daily error:", (err as Error).message);
      res.status(500).json({ error: "Failed to trigger push notification" });
    }
  }
);

export default router;
