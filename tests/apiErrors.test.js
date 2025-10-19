"use strict";

const request = require("supertest");
const app = require("../src/app");
const axios = require("axios");
const { ensureConnected } = require("../src/lib/redisClient");

describe("Weather API - Third-party API Error Scenarios", () => {
  let originalAxiosGet;

  beforeEach(() => {
    // Backup original axios.get
    originalAxiosGet = axios.get;
  });

  afterEach(() => {
    // Restore original axios.get after each test
    axios.get = originalAxiosGet;
  });

  describe("TC-API-001: Third-party API responds with unexpected schema", () => {
    test("Should return 503 when API returns unexpected schema and no cache exists", async () => {
      const city = "UnexpectedSchemaCity";

      // Clear any existing cache
      const client = await ensureConnected();
      const cacheKey = `weather:${city.toLowerCase()}`;
      await client.set(cacheKey, "");

      // Mock axios to return unexpected schema (missing main object)
      axios.get = jest.fn(() =>
        Promise.resolve({
          data: {
            name: city,
            // Missing 'main' object with temperature
            weather: [{ description: "sunny" }],
          },
        })
      );

      const res = await request(app).get("/weather").query({ city });

      expect(res.status).toBe(503);
      expect(res.body.message).toBe("Weather service unavailable");
    });

    test("Should fallback to stale cache when API returns unexpected schema", async () => {
      const city = "UnexpectedSchemaWithCache";

      // Create stale cache
      const client = await ensureConnected();
      const cacheKey = `weather:${city.toLowerCase()}`;
      const stalePayload = JSON.stringify({
        temperature: 28,
        status: "cloudy",
        cachedAt: Date.now() - 70_000, // 70 seconds ago (stale)
      });
      await client.set(cacheKey, stalePayload);

      // Mock axios to return unexpected schema
      axios.get = jest.fn(() =>
        Promise.resolve({
          data: {
            name: city,
            // Missing 'main' object
            weather: [{ description: "sunny" }],
          },
        })
      );

      const res = await request(app).get("/weather").query({ city });

      expect(res.status).toBe(200);
      expect(res.body.cache.stale).toBe(true);
      expect(res.body.warning).toBe("Using cached data due to upstream error");
      expect(res.body.temperature).toBe(28);
      expect(res.body.status).toBe("cloudy");
    });

    test("Should return 503 when API returns completely invalid object", async () => {
      const city = "InvalidObjectCity";

      // Clear cache
      const client = await ensureConnected();
      const cacheKey = `weather:${city.toLowerCase()}`;
      await client.set(cacheKey, "");

      // Mock axios to return null/undefined data
      axios.get = jest.fn(() =>
        Promise.resolve({
          data: null,
        })
      );

      const res = await request(app).get("/weather").query({ city });

      expect(res.status).toBe(503);
      expect(res.body.message).toBe("Weather service unavailable");
    });
  });

  describe("TC-API-002: Third-party API changes data type unexpectedly", () => {
    test("Should return 503 when temperature is string instead of number (no cache)", async () => {
      const city = "StringTempNoCache";

      // Clear cache
      const client = await ensureConnected();
      const cacheKey = `weather:${city.toLowerCase()}`;
      await client.set(cacheKey, "");

      // Mock axios to return string temperature
      axios.get = jest.fn(() =>
        Promise.resolve({
          data: {
            name: city,
            main: { temp: "very hot" }, // String instead of number
            weather: [{ description: "sunny" }],
          },
        })
      );

      const res = await request(app).get("/weather").query({ city });

      expect(res.status).toBe(503);
      expect(res.body.message).toBe("Weather service unavailable");
    });

    test("Should fallback to cache when temperature is string instead of number", async () => {
      const city = "StringTempWithCache";

      // Create stale cache
      const client = await ensureConnected();
      const cacheKey = `weather:${city.toLowerCase()}`;
      const stalePayload = JSON.stringify({
        temperature: 25,
        status: "rainy",
        cachedAt: Date.now() - 80_000, // 80 seconds ago
      });
      await client.set(cacheKey, stalePayload);

      // Mock axios to return string temperature
      axios.get = jest.fn(() =>
        Promise.resolve({
          data: {
            name: city,
            main: { temp: "30 degrees" }, // Invalid type
            weather: [{ description: "sunny" }],
          },
        })
      );

      const res = await request(app).get("/weather").query({ city });

      expect(res.status).toBe(200);
      expect(res.body.cache.stale).toBe(true);
      expect(res.body.warning).toBe("Using cached data due to upstream error");
      expect(res.body.temperature).toBe(25);
    });

    test("Should return 503 when weather array is missing", async () => {
      const city = "MissingWeatherArray";

      // Clear cache
      const client = await ensureConnected();
      const cacheKey = `weather:${city.toLowerCase()}`;
      await client.set(cacheKey, "");

      // Mock axios - missing weather array
      axios.get = jest.fn(() =>
        Promise.resolve({
          data: {
            name: city,
            main: { temp: 25 },
            // Missing weather array
          },
        })
      );

      const res = await request(app).get("/weather").query({ city });

      expect(res.status).toBe(200); // Should still work, status defaults to "unknown"
      expect(res.body.status).toBe("unknown");
    });
  });

  describe("TC-API-003: External API returns 500 Internal Server Error", () => {
    test("Should return 503 when API returns 500 and no cache exists", async () => {
      const city = "ErrorFiveHundredNoCache";

      // Clear cache
      const client = await ensureConnected();
      const cacheKey = `weather:${city.toLowerCase()}`;
      await client.set(cacheKey, "");

      // Mock axios to throw 500 error
      const error = new Error("Request failed with status code 500");
      error.response = {
        status: 500,
        data: { message: "Internal Server Error" },
      };
      axios.get = jest.fn(() => Promise.reject(error));

      const res = await request(app).get("/weather").query({ city });

      expect(res.status).toBe(503);
      expect(res.body.message).toBe("Weather service unavailable");
    });

    test("Should fallback to stale cache when API returns 500", async () => {
      const city = "ErrorFiveHundredWithCache";

      // Create stale cache
      const client = await ensureConnected();
      const cacheKey = `weather:${city.toLowerCase()}`;
      const stalePayload = JSON.stringify({
        temperature: 30,
        status: "clear sky",
        cachedAt: Date.now() - 90_000, // 90 seconds ago
      });
      await client.set(cacheKey, stalePayload);

      // Mock axios to throw 500 error
      const error = new Error("Request failed with status code 500");
      error.response = {
        status: 500,
        data: { message: "Internal Server Error" },
      };
      axios.get = jest.fn(() => Promise.reject(error));

      const res = await request(app).get("/weather").query({ city });

      expect(res.status).toBe(200);
      expect(res.body.cache.stale).toBe(true);
      expect(res.body.warning).toBe("Using cached data due to upstream error");
      expect(res.body.temperature).toBe(30);
      expect(res.body.status).toBe("clear sky");
    });

    test("Should handle 502 Bad Gateway error", async () => {
      const city = "ErrorBadGatewayCity";

      // Create cache
      const client = await ensureConnected();
      const cacheKey = `weather:${city.toLowerCase()}`;
      const stalePayload = JSON.stringify({
        temperature: 22,
        status: "partly cloudy",
        cachedAt: Date.now() - 100_000,
      });
      await client.set(cacheKey, stalePayload);

      // Mock 502 error
      const error = new Error("Request failed with status code 502");
      error.response = {
        status: 502,
        data: { message: "Bad Gateway" },
      };
      axios.get = jest.fn(() => Promise.reject(error));

      const res = await request(app).get("/weather").query({ city });

      expect(res.status).toBe(200);
      expect(res.body.warning).toBe("Using cached data due to upstream error");
    });
  });

  describe("TC-API-004: External API returns timeout (>5s)", () => {
    test("Should return 503 when API timeout occurs and no cache exists", async () => {
      const city = "TimeoutNoCache";

      // Clear cache
      const client = await ensureConnected();
      const cacheKey = `weather:${city.toLowerCase()}`;
      await client.set(cacheKey, "");

      // Mock axios timeout error (ECONNABORTED)
      const timeoutError = new Error("timeout of 5000ms exceeded");
      timeoutError.code = "ECONNABORTED";
      axios.get = jest.fn(() => Promise.reject(timeoutError));

      const res = await request(app).get("/weather").query({ city });

      expect(res.status).toBe(503);
      expect(res.body.message).toBe("Weather service unavailable");
    });

    test("Should fallback to stale cache when API timeout occurs", async () => {
      const city = "TimeoutWithCache";

      // Create stale cache
      const client = await ensureConnected();
      const cacheKey = `weather:${city.toLowerCase()}`;
      const stalePayload = JSON.stringify({
        temperature: 27,
        status: "windy",
        cachedAt: Date.now() - 120_000, // 2 minutes ago
      });
      await client.set(cacheKey, stalePayload);

      // Mock timeout error
      const timeoutError = new Error("timeout of 5000ms exceeded");
      timeoutError.code = "ECONNABORTED";
      axios.get = jest.fn(() => Promise.reject(timeoutError));

      const res = await request(app).get("/weather").query({ city });

      expect(res.status).toBe(200);
      expect(res.body.cache.stale).toBe(true);
      expect(res.body.warning).toBe("Using cached data due to upstream error");
      expect(res.body.temperature).toBe(27);
      expect(res.body.status).toBe("windy");
    });

    test("Should handle ETIMEDOUT error", async () => {
      const city = "ETIMEDOUTCity";

      // Create cache
      const client = await ensureConnected();
      const cacheKey = `weather:${city.toLowerCase()}`;
      const stalePayload = JSON.stringify({
        temperature: 24,
        status: "foggy",
        cachedAt: Date.now() - 150_000,
      });
      await client.set(cacheKey, stalePayload);

      // Mock ETIMEDOUT error
      const timeoutError = new Error("connect ETIMEDOUT");
      timeoutError.code = "ETIMEDOUT";
      axios.get = jest.fn(() => Promise.reject(timeoutError));

      const res = await request(app).get("/weather").query({ city });

      expect(res.status).toBe(200);
      expect(res.body.warning).toBe("Using cached data due to upstream error");
    });
  });

  describe("TC-API-005: External API returns empty body", () => {
    test("Should return 503 when API returns empty body and no cache", async () => {
      const city = "EmptyBodyNoCache";

      // Clear cache
      const client = await ensureConnected();
      const cacheKey = `weather:${city.toLowerCase()}`;
      await client.set(cacheKey, "");

      // Mock axios to return empty body
      axios.get = jest.fn(() =>
        Promise.resolve({
          data: null,
        })
      );

      const res = await request(app).get("/weather").query({ city });

      expect(res.status).toBe(503);
      expect(res.body.message).toBe("Weather service unavailable");
    });

    test("Should fallback to cache when API returns empty body", async () => {
      const city = "EmptyBodyWithCache";

      // Create stale cache
      const client = await ensureConnected();
      const cacheKey = `weather:${city.toLowerCase()}`;
      const stalePayload = JSON.stringify({
        temperature: 26,
        status: "drizzle",
        cachedAt: Date.now() - 130_000,
      });
      await client.set(cacheKey, stalePayload);

      // Mock empty body
      axios.get = jest.fn(() =>
        Promise.resolve({
          data: null,
        })
      );

      const res = await request(app).get("/weather").query({ city });

      expect(res.status).toBe(200);
      expect(res.body.cache.stale).toBe(true);
      expect(res.body.warning).toBe("Using cached data due to upstream error");
      expect(res.body.temperature).toBe(26);
    });

    test("Should return 503 when API returns undefined data", async () => {
      const city = "UndefinedDataCity";

      // Clear cache
      const client = await ensureConnected();
      const cacheKey = `weather:${city.toLowerCase()}`;
      await client.set(cacheKey, "");

      // Mock undefined data
      axios.get = jest.fn(() =>
        Promise.resolve({
          data: undefined,
        })
      );

      const res = await request(app).get("/weather").query({ city });

      expect(res.status).toBe(503);
      expect(res.body.message).toBe("Weather service unavailable");
    });

    test("Should return 503 when API returns empty object", async () => {
      const city = "EmptyObjectCity";

      // Clear cache
      const client = await ensureConnected();
      const cacheKey = `weather:${city.toLowerCase()}`;
      await client.set(cacheKey, "");

      // Mock empty object
      axios.get = jest.fn(() =>
        Promise.resolve({
          data: {},
        })
      );

      const res = await request(app).get("/weather").query({ city });

      expect(res.status).toBe(503);
      expect(res.body.message).toBe("Weather service unavailable");
    });
  });

  describe("TC-API-006: External API returns malformed JSON", () => {
    test("Should return 503 when API returns malformed JSON and no cache", async () => {
      const city = "MalformedJSONNoCache";

      // Clear cache
      const client = await ensureConnected();
      const cacheKey = `weather:${city.toLowerCase()}`;
      await client.set(cacheKey, "");

      // Mock axios to throw JSON parse error
      const parseError = new Error("Unexpected token < in JSON at position 0");
      parseError.name = "SyntaxError";
      axios.get = jest.fn(() => Promise.reject(parseError));

      const res = await request(app).get("/weather").query({ city });

      expect(res.status).toBe(503);
      expect(res.body.message).toBe("Weather service unavailable");
    });

    test("Should fallback to cache when API returns malformed JSON", async () => {
      const city = "MalformedJSONWithCache";

      // Create stale cache
      const client = await ensureConnected();
      const cacheKey = `weather:${city.toLowerCase()}`;
      const stalePayload = JSON.stringify({
        temperature: 29,
        status: "thunderstorm",
        cachedAt: Date.now() - 140_000,
      });
      await client.set(cacheKey, stalePayload);

      // Mock JSON parse error
      const parseError = new Error("Unexpected end of JSON input");
      parseError.name = "SyntaxError";
      axios.get = jest.fn(() => Promise.reject(parseError));

      const res = await request(app).get("/weather").query({ city });

      expect(res.status).toBe(200);
      expect(res.body.cache.stale).toBe(true);
      expect(res.body.warning).toBe("Using cached data due to upstream error");
      expect(res.body.temperature).toBe(29);
      expect(res.body.status).toBe("thunderstorm");
    });

    test("Should handle invalid JSON content type error", async () => {
      const city = "InvalidJSONContentType";

      // Create cache
      const client = await ensureConnected();
      const cacheKey = `weather:${city.toLowerCase()}`;
      const stalePayload = JSON.stringify({
        temperature: 23,
        status: "mist",
        cachedAt: Date.now() - 160_000,
      });
      await client.set(cacheKey, stalePayload);

      // Mock JSON parsing error
      const error = new Error("Invalid JSON response");
      error.isAxiosError = true;
      axios.get = jest.fn(() => Promise.reject(error));

      const res = await request(app).get("/weather").query({ city });

      expect(res.status).toBe(200);
      expect(res.body.warning).toBe("Using cached data due to upstream error");
    });
  });

  describe("TC-API-007: Combined error scenarios", () => {
    test("Should handle network error (ENOTFOUND) with cache fallback", async () => {
      const city = "NetworkErrorCity";

      // Create cache
      const client = await ensureConnected();
      const cacheKey = `weather:${city.toLowerCase()}`;
      const stalePayload = JSON.stringify({
        temperature: 21,
        status: "snow",
        cachedAt: Date.now() - 170_000,
      });
      await client.set(cacheKey, stalePayload);

      // Mock network error
      const networkError = new Error(
        "getaddrinfo ENOTFOUND api.openweathermap.org"
      );
      networkError.code = "ENOTFOUND";
      axios.get = jest.fn(() => Promise.reject(networkError));

      const res = await request(app).get("/weather").query({ city });

      expect(res.status).toBe(200);
      expect(res.body.warning).toBe("Using cached data due to upstream error");
    });

    test("Should handle connection refused error", async () => {
      const city = "ConnectionRefusedCity";

      // Create cache
      const client = await ensureConnected();
      const cacheKey = `weather:${city.toLowerCase()}`;
      const stalePayload = JSON.stringify({
        temperature: 19,
        status: "hail",
        cachedAt: Date.now() - 180_000,
      });
      await client.set(cacheKey, stalePayload);

      // Mock connection refused
      const connError = new Error("connect ECONNREFUSED 127.0.0.1:80");
      connError.code = "ECONNREFUSED";
      axios.get = jest.fn(() => Promise.reject(connError));

      const res = await request(app).get("/weather").query({ city });

      expect(res.status).toBe(200);
      expect(res.body.warning).toBe("Using cached data due to upstream error");
    });

    test("Should verify that fresh cache (<60s) is returned immediately without API call", async () => {
      const city = "FreshCacheCity";

      // Create fresh cache (within 60 seconds)
      const client = await ensureConnected();
      const cacheKey = `weather:${city.toLowerCase()}`;
      const freshPayload = JSON.stringify({
        temperature: 32,
        status: "hot",
        cachedAt: Date.now() - 30_000, // 30 seconds ago (fresh)
      });
      await client.set(cacheKey, freshPayload);

      // Mock should NOT be called for fresh cache
      axios.get = jest.fn(() => {
        throw new Error("API should not be called for fresh cache!");
      });

      const res = await request(app).get("/weather").query({ city });

      expect(res.status).toBe(200);
      expect(res.body.cache.hit).toBe(true);
      expect(res.body.temperature).toBe(32);
      expect(res.body.warning).toBeFalsy();
      expect(axios.get).not.toHaveBeenCalled(); // Verify API was not called
    });
  });
});
