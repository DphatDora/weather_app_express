"use strict";

class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map(); // ip -> [timestamps]
  }

  check(ip) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this IP
    let timestamps = this.requests.get(ip) || [];

    // Filter out old requests outside the window
    timestamps = timestamps.filter((ts) => ts > windowStart);

    // Check if limit exceeded
    if (timestamps.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    timestamps.push(now);
    this.requests.set(ip, timestamps);

    // Cleanup old IPs periodically
    if (this.requests.size > 1000) {
      this.cleanup(windowStart);
    }

    return true;
  }

  cleanup(windowStart) {
    for (const [ip, timestamps] of this.requests.entries()) {
      const filtered = timestamps.filter((ts) => ts > windowStart);
      if (filtered.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, filtered);
      }
    }
  }
}

const limiter = new RateLimiter(100, 60000); // 100 requests per minute

function rateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || "unknown";

  if (!limiter.check(ip)) {
    return res.status(429).json({
      message: "Too Many Requests",
      error: "Rate limit exceeded. Maximum 100 requests per minute allowed.",
    });
  }

  next();
}

module.exports = { rateLimitMiddleware, RateLimiter };
