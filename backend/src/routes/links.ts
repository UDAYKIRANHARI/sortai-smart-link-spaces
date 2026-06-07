import { Router, Response } from "express";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { classifyRateLimit } from "../middleware/rateLimit";
import { detectSource, extractMetadata } from "../services/scraper";
import { isYouTubeUrl, getYouTubeMetadata } from "../services/youtube";
import { classifyLink, heuristicClassifyLink } from "../services/gemini";
import { saveLink, getLinks, getSpacesSummary, deleteLink, SavedLink } from "../services/db";

const router = Router();
const SPACE_ALLOWLIST = new Set([
  "Career",
  "Study",
  "Fashion",
  "Fitness",
  "Tech",
  "Tools",
  "Web links",
  "Entertainment",
  "Life",
  "Other",
]);

function sanitizeInput(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

// ---------------------------------------------------------------------------
// POST /api/links – classify & save a new link
// ---------------------------------------------------------------------------
router.post("/links", authMiddleware, classifyRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payload = req.body as { url?: string };
    const url = typeof payload?.url === "string" ? sanitizeInput(payload.url) : "";

    // ---- Validate URL ---- //
    if (!url || url.length === 0 || url.length > 2048) {
      res.status(400).json({ error: "A valid URL is required in the request body" });
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      res.status(400).json({ error: "Invalid URL format. Must start with http:// or https://" });
      return;
    }

    const cleanUrl = parsedUrl.href;
    const userId = req.userId!;

    console.log(`[LINKS] Processing URL for user ${userId}: ${cleanUrl}`);

    // ---- 1. Extract metadata ---- //
    const source = detectSource(cleanUrl);
    let metadata;

    if (isYouTubeUrl(cleanUrl)) {
      // Try YouTube API first, fall back to generic scraper
      const ytMeta = await getYouTubeMetadata(cleanUrl);
      if (ytMeta) {
        metadata = ytMeta;
      } else {
        console.warn("[LINKS] YouTube API failed – falling back to scraper");
        metadata = await extractMetadata(cleanUrl);
      }
    } else {
      metadata = await extractMetadata(cleanUrl);
    }

    console.log(`[LINKS] Metadata extracted: "${metadata.title}" (${metadata.source})`);

    // ---- 2. Classify with Gemini (with local fallback if quota/API fails) ---- //
    let classification;
    try {
      classification = await classifyLink(metadata);
      console.log(
        `[LINKS] Classified as "${classification.space}" (${classification.confidence} confidence)`
      );
    } catch (classifyErr) {
      console.warn(
        `[LINKS] Gemini classification failed – using local heuristic fallback. Reason:`,
        (classifyErr as Error).message
      );
      classification = heuristicClassifyLink(metadata);
    }

    // ---- 3. Save to Firestore ---- //
    const linkData: SavedLink = {
      url: cleanUrl,
      source,
      space: classification.space,
      title: classification.title,
      shortDescription: classification.short_description,
      tags: classification.tags,
      reasonToSave: classification.reason_to_save,
      confidence: classification.confidence,
      imageUrl: metadata.imageUrl || "",
      thumbnailUrl: metadata.thumbnailUrl || "",
      createdAt: new Date().toISOString(),
    };

    const saved = await saveLink(userId, linkData);
    console.log(`[LINKS] Saved link ${saved.id} to space "${saved.space}"`);

    res.status(saved.created ? 201 : 200).json(saved);
  } catch (err) {
    console.error("[LINKS] POST /api/links error:", (err as Error).message);

    // Differentiate known error types
    const message = (err as Error).message || "Internal server error";

    if (message.includes("Gemini API key")) {
      res.status(503).json({ error: "Classification service unavailable", details: message });
      return;
    }
    if (message.includes("Gemini classification failed")) {
      res.status(502).json({ error: "Classification failed", details: message });
      return;
    }

    res.status(500).json({ error: "Failed to process link", details: message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/links – list saved links
// ---------------------------------------------------------------------------
router.get("/links", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const spaceRaw = req.query.space as string | undefined;
    const queryRaw = req.query.q as string | undefined;
    const pageSizeRaw = req.query.pageSize as string | undefined;
    const cursorRaw = req.query.cursor as string | undefined;
    const pageSize = pageSizeRaw ? Number.parseInt(pageSizeRaw, 10) : 20;

    if (Number.isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      res.status(400).json({ error: "pageSize must be a number between 1 and 100" });
      return;
    }

    let normalizedSpace: string | undefined;
    if (spaceRaw && spaceRaw.trim().length > 0) {
      const candidate = sanitizeInput(spaceRaw);
      if (!SPACE_ALLOWLIST.has(candidate)) {
        res.status(400).json({ error: "Invalid space filter" });
        return;
      }
      normalizedSpace = candidate;
    }

    const query = queryRaw ? sanitizeInput(queryRaw).slice(0, 120) : undefined;
    const cursor = cursorRaw ? sanitizeInput(cursorRaw) : undefined;

    const links = await getLinks(userId, normalizedSpace, query, pageSize, cursor);
    res.json(links);
  } catch (err) {
    console.error("[LINKS] GET /api/links error:", (err as Error).message);
    res.status(500).json({ error: "Failed to fetch links", details: (err as Error).message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/spaces-summary – link counts per space
// ---------------------------------------------------------------------------
router.get(
  "/spaces-summary",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const summary = await getSpacesSummary(userId);

      res.json(summary);
    } catch (err) {
      console.error("[LINKS] GET /api/spaces-summary error:", (err as Error).message);
      res
        .status(500)
        .json({ error: "Failed to fetch spaces summary", details: (err as Error).message });
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/links/:id – delete a saved link
// ---------------------------------------------------------------------------
router.delete("/links/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const linkId = sanitizeInput(req.params.id as string);

    if (!linkId) {
      res.status(400).json({ error: "Link ID is required" });
      return;
    }

    await deleteLink(userId, linkId);
    console.log(`[LINKS] User ${userId} deleted link ${linkId}`);
    res.json({ success: true, message: "Link deleted successfully" });
  } catch (err) {
    console.error("[LINKS] DELETE /api/links/:id error:", (err as Error).message);
    res.status(500).json({ error: "Failed to delete link", details: (err as Error).message });
  }
});

export default router;
