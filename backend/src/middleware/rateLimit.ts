import { rateLimit } from "express-rate-limit";

const trustProxy = process.env.TRUST_PROXY === "true";

export const globalRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || "120", 10),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  validate: { trustProxy },
  message: { error: "Too many requests, please retry later." },
});

export const classifyRateLimit = rateLimit({
  windowMs: parseInt(process.env.CLASSIFY_RATE_LIMIT_WINDOW_MS || "60000", 10),
  max: parseInt(process.env.CLASSIFY_RATE_LIMIT_MAX || "20", 10),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy },
  message: { error: "Classification request limit exceeded. Try again shortly." },
});
