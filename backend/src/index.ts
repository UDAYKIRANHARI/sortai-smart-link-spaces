// IMPORTANT: dotenv MUST be loaded before any other imports because db.ts and
// gemini.ts read process.env at module-initialisation time.  With ES-style
// `import` the statements below would be hoisted above `dotenv.config()`.
// Using require() ensures it executes synchronously first.
// eslint-disable-next-line @typescript-eslint/no-var-requires
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express from "express";
import cors from "cors";
import linkRoutes from "./routes/links";
import { globalRateLimit } from "./middleware/rateLimit";
import {
  requestContextMiddleware,
  requestTimeoutMiddleware,
  securityHeadersMiddleware,
  getMetricsSnapshot,
} from "./middleware/observability";
import { initializeFirebase, isFirebaseInitialized } from "./services/db";

const app = express();
const PORT = parseInt(process.env.PORT || "8080", 10);
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS
  || "http://localhost:5173,http://127.0.0.1:5173,https://sortai-c4f60.web.app,https://sortai-c4f60.firebaseapp.com")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

// ---------------------------------------------------------------------------
// CORS – allow the Vite dev server and production Firebase Hosting origins
// ---------------------------------------------------------------------------
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(new Error("CORS blocked"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(requestContextMiddleware);
app.use(requestTimeoutMiddleware);
app.use(securityHeadersMiddleware);
app.use(globalRateLimit);

// ---------------------------------------------------------------------------
// Health-check
// ---------------------------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "sortai-backend",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get("/ready", (_req, res) => {
  if (!isFirebaseInitialized()) {
    initializeFirebase();
  }
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
  const hasYouTubeKey = Boolean(process.env.YOUTUBE_API_KEY);
  const ready = hasGeminiKey && hasYouTubeKey;
  res.status(ready ? 200 : 503).json({
    ready,
    checks: {
      firebaseInitialized: isFirebaseInitialized(),
      geminiKeyConfigured: hasGeminiKey,
      youtubeKeyConfigured: hasYouTubeKey,
    },
  });
});

app.get("/metrics", (_req, res) => {
  res.json(getMetricsSnapshot());
});

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.use("/api", linkRoutes);

// ---------------------------------------------------------------------------
// 404 catch-all
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[ERROR]", err.message);
    console.error(err.stack);
    if (err.message === "CORS blocked") {
      res.status(403).json({ error: "Origin not allowed" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log(`  SortAi Backend running on http://localhost:${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`  Health check: http://localhost:${PORT}/health`);
  console.log(`  API base:     http://localhost:${PORT}/api`);
  console.log("=".repeat(50));
});

export default app;
