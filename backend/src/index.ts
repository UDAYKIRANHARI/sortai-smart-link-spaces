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
import adminRoutes from "./routes/admin";
import stripeRoutes from "./routes/stripe";
import notificationRoutes from "./routes/notifications";
import { initializeFirebase } from "./services/db";

// Now that env vars are loaded, we can safely initialize Firebase
initializeFirebase();

const app = express();
const PORT = parseInt(process.env.PORT || "8080", 10);

// ---------------------------------------------------------------------------
// CORS – allow the Vite dev server and production Firebase Hosting origins
// ---------------------------------------------------------------------------
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3000",
      "https://sortai-c4f60.web.app",
      "https://sortai-c4f60.firebaseapp.com",
      "https://sortai.dev",
      "https://www.sortai.dev",
      /\.run\.app$/,  // Allow any Cloud Run origin
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Also accept any origin in dev mode so mobile / other tools work
if (process.env.NODE_ENV !== "production") {
  app.use(cors());
}

// ---------------------------------------------------------------------------
// Stripe routes (must be mounted before express.json() because webhook needs raw body)
app.use("/stripe", stripeRoutes);

// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

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

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.use("/api", linkRoutes);
app.use("/api", adminRoutes);
app.use("/api", notificationRoutes);

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
