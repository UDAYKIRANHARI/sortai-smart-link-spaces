import { Router, Response } from "express";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { detectSource, extractMetadata } from "../services/scraper";
import { isYouTubeUrl, getYouTubeMetadata } from "../services/youtube";
import { classifyLink, heuristicClassifyLink, generateEmbedding } from "../services/gemini";
import { saveLink, getLinks, getSpacesSummary, deleteLink, updateLinkSpace, SavedLink } from "../services/db";
import { upsertLinkVector, searchSimilarLinks, deleteLinkVector } from "../services/vectorDb";

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/links – classify & save a new link
// ---------------------------------------------------------------------------
router.post("/links", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { url, savedFrom } = req.body as { url?: string; savedFrom?: string };

    // ---- Validate URL ---- //
    if (!url || typeof url !== "string" || url.trim().length === 0) {
      res.status(400).json({ error: "A valid URL is required in the request body" });
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.trim());
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
      ...(savedFrom && { savedFrom }),
      createdAt: new Date().toISOString(),
    };

    const saved = await saveLink(userId, linkData);
    console.log(`[LINKS] Saved link ${saved.id} to space "${saved.space}"`);

    // ---- 4. Save Semantic Embedding to Pinecone ---- //
    try {
      const embedText = `${saved.title} ${saved.shortDescription || ""} ${(saved.tags || []).join(" ")}`;
      const vector = await generateEmbedding(embedText);
      await upsertLinkVector(saved.id, vector, {
        userId,
        title: saved.title || "Untitled",
        url: saved.url,
        space: saved.space,
        createdAt: saved.createdAt,
      });
    } catch (vectorErr) {
      console.error("[LINKS] Failed to save semantic vector, but link was saved:", vectorErr);
      // We don't fail the overall request if vector saving fails
    }

    res.status(201).json(saved);
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
    const space = req.query.space as string | undefined;
    const query = req.query.q as string | undefined;

    const links = await getLinks(userId, space, query);

    res.set('Cache-Control', 'no-store');
    res.json(links);
  } catch (err) {
    console.error("[LINKS] GET /api/links error:", (err as Error).message);
    res.status(500).json({ error: "Failed to fetch links", details: (err as Error).message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/links/search – semantic search via Pinecone
// ---------------------------------------------------------------------------
router.get("/links/search", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const query = req.query.q as string | undefined;

    if (!query || query.trim().length === 0) {
      res.status(400).json({ error: "Search query is required" });
      return;
    }

    console.log(`[LINKS] Semantic search for user ${userId}: "${query}"`);
    const vector = await embedTextWithNvidia(query);
    const results = await searchSimilarLinks(userId, vector, 20);

    // Map Pinecone metadata to match a lightweight SavedLinkWithId structure
    const mapped = results.map(r => ({
      id: r.id,
      title: r.metadata.title,
      url: r.metadata.url,
      space: r.metadata.space,
      createdAt: r.metadata.createdAt,
      score: r.score
    }));

    res.json(mapped);
  } catch (err) {
    console.error("[LINKS] GET /api/links/search error:", (err as Error).message);
    res.status(500).json({ error: "Semantic search failed", details: (err as Error).message });
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
    const linkId = req.params.id as string;

    if (!linkId) {
      res.status(400).json({ error: "Link ID is required" });
      return;
    }

    await deleteLink(userId, linkId);
    
    // Also delete from vector db
    try {
      await deleteLinkVector(linkId);
    } catch (e) {
      console.error("[LINKS] Failed to delete link from Pinecone:", e);
    }

    console.log(`[LINKS] User ${userId} deleted link ${linkId}`);
    res.json({ success: true, message: "Link deleted successfully" });
  } catch (err) {
    console.error("[LINKS] DELETE /api/links/:id error:", (err as Error).message);
    res.status(500).json({ error: "Failed to delete link", details: (err as Error).message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/links/:id – update a saved link's space
// ---------------------------------------------------------------------------
router.patch("/links/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  console.log(`[LINKS] PATCH request received for link: ${req.params.id}, space: ${req.body.space}`);
  try {
    const userId = req.userId!;
    const linkId = req.params.id as string;
    const { space } = req.body as { space?: string };

    if (!linkId) {
      res.status(400).json({ error: "Link ID is required" });
      return;
    }

    if (!space || typeof space !== "string" || space.trim().length === 0) {
      res.status(400).json({ error: "A valid space name is required" });
      return;
    }

    const validSpaces = [
      "Career", "Study", "Fashion", "Fitness", "Tech",
      "Tools", "Web links", "Entertainment", "Life", "Other",
    ];

    const normalizedSpace = validSpaces.find(
      (s) => s.toLowerCase() === space.trim().toLowerCase()
    );

    if (!normalizedSpace) {
      res.status(400).json({
        error: `Invalid space. Must be one of: ${validSpaces.join(", ")}`,
      });
      return;
    }

    await updateLinkSpace(userId, linkId, normalizedSpace);
    
    // Also update Pinecone metadata
    try {
      const pc = await import("../services/vectorDb").then(m => m.initPinecone());
      if (pc) {
        const index = pc.Index(process.env.PINECONE_INDEX_NAME || "sortai-links");
        // Pinecone update allows partial metadata updates
        await index.update({
          id: linkId,
          metadata: { space: normalizedSpace }
        });
      }
    } catch (e) {
      console.error("[LINKS] Failed to update pinecone metadata:", e);
    }

    console.log(`[LINKS] User ${userId} moved link ${linkId} to space "${normalizedSpace}"`);
    res.json({ success: true, message: `Link moved to ${normalizedSpace}`, space: normalizedSpace });
  } catch (err) {
    console.error("[LINKS] PATCH /api/links/:id error:", (err as Error).message);
    res.status(500).json({ error: "Failed to update link", details: (err as Error).message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/chat – answer questions using saved links (RAG)
// ---------------------------------------------------------------------------
router.post("/chat", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message } = req.body;
    const userId = req.userId!;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    console.log(`[CHAT] Query for user ${userId}: ${message}`);

    // 1. Embed the query
    const queryVector = await embedTextWithNvidia(message);

    // 2. Search Pinecone for top 5 links
    const relevantLinks = await searchSimilarLinks(userId, queryVector, 5);

    // 3. Format context
    const contextTexts = relevantLinks.map(match => {
      const meta = match.metadata;
      return `Title: ${meta.title}\nURL: ${meta.url}\nSpace: ${meta.space}\nTags: ${Array.isArray(meta.tags) ? meta.tags.join(", ") : meta.tags || ""}\nSummary: ${meta.shortDescription || ""}`;
    });

    // 4. Generate AI response
    const { generateChatResponse } = await import("../services/gemini");
    const answer = await generateChatResponse(message, contextTexts);

    // 5. Return response + used references
    res.json({
      answer,
      references: relevantLinks.map(l => l.metadata)
    });
  } catch (error) {
    console.error("[CHAT] Error handling chat query:", error);
    res.status(500).json({ error: "Failed to process chat query" });
  }
});

export default router;
