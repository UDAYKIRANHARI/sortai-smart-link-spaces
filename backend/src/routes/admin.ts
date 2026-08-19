import { Router, Response } from "express";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { getFeedbacks, getTotalLinksCount, getTotalUsersCount, saveFeedback, Feedback } from "../services/db";

const router = Router();

// Middleware to check if the user is the admin
const adminMiddleware = (req: AuthenticatedRequest, res: Response, next: () => void) => {
  const allowedAdmins = [
    process.env.ADMIN_EMAIL,
    "udaykiranhari07@gmail.com",
    "hariudaykiran0715@gmail.com"
  ].filter(Boolean);
  
  if (req.userId !== "M2204" && (!req.userEmail || !allowedAdmins.includes(req.userEmail))) {
    console.warn(`[ADMIN] Unauthorized access attempt by user: ${req.userEmail || req.userId}`);
    res.status(403).json({ error: "Forbidden: Admin access required" });
    return;
  }
  
  next();
};

// ---------------------------------------------------------------------------
// GET /api/admin/stats – Fetch high-level app statistics
// ---------------------------------------------------------------------------
router.get("/admin/stats", authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [totalUsers, totalLinks] = await Promise.all([
      getTotalUsersCount(),
      getTotalLinksCount()
    ]);
    
    res.json({
      totalUsers,
      totalLinks
    });
  } catch (err) {
    console.error("[ADMIN] GET /api/admin/stats error:", (err as Error).message);
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/feedbacks – Fetch all user feedbacks
// ---------------------------------------------------------------------------
router.get("/admin/feedbacks", authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const feedbacks = await getFeedbacks();
    res.json(feedbacks);
  } catch (err) {
    console.error("[ADMIN] GET /api/admin/feedbacks error:", (err as Error).message);
    res.status(500).json({ error: "Failed to fetch feedbacks" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/feedback – Allow any authenticated user to submit feedback
// ---------------------------------------------------------------------------
router.post("/feedback", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, email } = req.body;
    const userId = req.userId!;
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ error: "Feedback message is required" });
      return;
    }

    const feedbackData: Feedback = {
      userId,
      userEmail: email || null,
      message: message.trim(),
      createdAt: new Date().toISOString()
    };
    
    const saved = await saveFeedback(feedbackData);
    console.log(`[FEEDBACK] Saved feedback from user ${userId}: ${saved.id}`);
    
    res.status(201).json(saved);
  } catch (err) {
    console.error("[FEEDBACK] POST /api/feedback error:", (err as Error).message);
    res.status(500).json({ error: "Failed to save feedback" });
  }
});

export default router;
