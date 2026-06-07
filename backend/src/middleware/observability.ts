import { NextFunction, Request, Response } from "express";
import crypto from "crypto";

type Metrics = {
  totalRequests: number;
  statusCounts: Record<string, number>;
  routeCounts: Record<string, number>;
  totalLatencyMs: number;
};

const metrics: Metrics = {
  totalRequests: 0,
  statusCounts: {},
  routeCounts: {},
  totalLatencyMs: 0,
};

export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.headers["x-request-id"]?.toString() || crypto.randomUUID();
  const start = Date.now();
  (req as Request & { requestId: string }).requestId = requestId;
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const latencyMs = Date.now() - start;
    metrics.totalRequests += 1;
    metrics.totalLatencyMs += latencyMs;
    metrics.statusCounts[res.statusCode] = (metrics.statusCounts[res.statusCode] || 0) + 1;
    const route = `${req.method} ${req.path}`;
    metrics.routeCounts[route] = (metrics.routeCounts[route] || 0) + 1;
    console.log(
      JSON.stringify({
        level: "info",
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        latencyMs,
        ip: req.ip,
      })
    );
  });

  next();
}

export function securityHeadersMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const csp = process.env.CSP_DIRECTIVES
    || "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
  res.setHeader("Content-Security-Policy", csp);
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.removeHeader("X-Powered-By");
  next();
}

export function requestTimeoutMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const timeoutMs = parseInt(process.env.REQUEST_TIMEOUT_MS || "20000", 10);
  req.setTimeout(timeoutMs);
  res.setTimeout(timeoutMs, () => {
    if (!res.headersSent) {
      res.status(408).json({ error: "Request timeout" });
    }
  });
  next();
}

export function getMetricsSnapshot(): Record<string, unknown> {
  return {
    ...metrics,
    averageLatencyMs:
      metrics.totalRequests > 0 ? Number((metrics.totalLatencyMs / metrics.totalRequests).toFixed(2)) : 0,
  };
}
