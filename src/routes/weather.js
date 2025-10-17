"use strict";

const express = require("express");
const router = express.Router();
const {
  getCache,
  setCache,
  DEFAULT_TTL_SECONDS,
} = require("../services/cacheService");
const { fetchWeather } = require("../services/openWeatherService");
const {
  validateCityName,
  sanitizeInput,
  detectSQLInjection,
} = require("../middleware/validation");

router.get("/", async (req, res) => {
  const rawCity = req.query.city || "";

  // Empty city parameter
  if (!rawCity || typeof rawCity !== "string") {
    return res.status(400).json({ message: "Invalid city name" });
  }

  // SQL Injection detection
  if (detectSQLInjection(rawCity)) {
    return res.status(400).json({ message: "Invalid city name" });
  }

  // XSS prevention - sanitize input
  const sanitized = sanitizeInput(rawCity);

  // Validate city name (length, characters)
  const validation = validateCityName(sanitized);
  if (!validation.valid) {
    return res.status(400).json({ message: validation.error });
  }

  const city = validation.city;
  const cacheKey = `weather:${city.toLowerCase()}`;
  const start = Date.now();
  let wasCacheHit = false;
  let warning = null;

  try {
    // Cache hit
    const cached = await getCache(cacheKey);
    if (cached) {
      wasCacheHit = true;
      const durationMs = Date.now() - start;
      const cacheAge = cached.cachedAt
        ? Math.floor((Date.now() - cached.cachedAt) / 1000)
        : null;
      return res.json({
        city,
        temperature: cached.temperature,
        status: cached.status,
        responseTimeMs: durationMs,
        cache: {
          hit: true,
          key: cacheKey,
          ageSeconds: cacheAge,
        },
        warning: cached.warning || null,
      });
    }

    // Cache miss, fetch from API
    const data = await fetchWeather(city, {
      provider: process.env.OPENWEATHER_PROVIDER,
      mockBaseUrl: `${req.protocol}://${req.get("host")}`,
    });
    const responseTimeMs = Date.now() - start;

    // Validate API response data
    if (!data || typeof data.temperature !== "number") {
      throw new Error("Invalid API response schema");
    }

    const cacheData = {
      temperature: data.temperature,
      status: data.status,
      cachedAt: Date.now(),
    };
    await setCache(cacheKey, cacheData);

    return res.json({
      city,
      temperature: data.temperature,
      status: data.status,
      responseTimeMs,
      cache: { hit: wasCacheHit, key: cacheKey },
      providerDurationMs: data.providerDurationMs,
      warning,
    });
  } catch (err) {
    // Cache miss, API fail, stale cache exists - return stale data with warning
    // External API errors
    const cached = await getCache(cacheKey);
    const responseTimeMs = Date.now() - start;

    if (cached) {
      warning = "Using cached data due to upstream error";
      const cacheAge = cached.cachedAt
        ? Math.floor((Date.now() - cached.cachedAt) / 1000)
        : null;
      return res.json({
        city,
        temperature: cached.temperature,
        status: cached.status,
        responseTimeMs,
        cache: {
          hit: true,
          key: cacheKey,
          stale: true,
          ageSeconds: cacheAge,
        },
        warning,
      });
    }

    // Cache miss, API fail, no cache - return HTTP 503
    return res.status(503).json({
      message: "Weather service unavailable",
    });
  }
});

module.exports = router;
