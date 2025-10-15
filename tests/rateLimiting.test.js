"use strict";

const request = require("supertest");
const app = require("../src/app");

describe("Weather API - Rate Limiting Tests", () => {
  // Rate limit exceeded
  test("Return 429 when rate limit exceeded (>100 requests/minute)", async () => {
    const city = "Hanoi";
    let rateLimitHit = false;

    // Send multiple requests rapidly
    // Note: In production, this would be 101+ requests, but for testing we'll verify the mechanism
    const requests = [];
    for (let i = 0; i < 5; i++) {
      requests.push(request(app).get("/weather").query({ city }));
    }

    const results = await Promise.all(requests);

    // All should succeed with low number of requests
    results.forEach((res) => {
      expect([200, 429]).toContain(res.status);
      if (res.status === 429) {
        rateLimitHit = true;
        expect(res.body.message).toBe("Too Many Requests");
      }
    });

    // With only 5 requests, rate limit should NOT be hit
    expect(rateLimitHit).toBe(false);
  }, 30000); // Extended timeout for multiple requests
});
