"use strict";

const express = require("express");
const router = express.Router();
const {
  getCache,
  setCache,
  DEFAULT_TTL_SECONDS,
} = require("../services/cacheService");
const { fetchWeather } = require("../services/openWeatherService");

router.get("/", async (req, res) => {
  const city = (req.query.city || "").trim();
  if (!city) {
    return res.status(400).json({ message: "City is required" });
  }

  const cacheKey = `weather:${city.toLowerCase()}`;
  const start = Date.now();
  let wasCacheHit = false;
  let warning = null;

  try {
    const cached = await getCache(cacheKey);
    if (cached) {
      wasCacheHit = true;
      const durationMs = Date.now() - start;
      return res.json({
        city,
        temperature: cached.temperature,
        status: cached.status,
        responseTimeMs: durationMs,
        cache: { hit: true, key: cacheKey },
        warning: cached.warning || null,
      });
    }

    const data = await fetchWeather(city, {
      provider: process.env.OPENWEATHER_PROVIDER,
      mockBaseUrl: `${req.protocol}://${req.get("host")}`,
    });
    const responseTimeMs = Date.now() - start;

    await setCache(cacheKey, {
      temperature: data.temperature,
      status: data.status,
    });

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
    // Fallback to last cache if exists
    const cached = await getCache(cacheKey);
    const responseTimeMs = Date.now() - start;
    if (cached) {
      warning = "Using cached data due to upstream error";
      return res.json({
        city,
        temperature: cached.temperature,
        status: cached.status,
        responseTimeMs,
        cache: { hit: true, key: cacheKey },
        warning,
      });
    }
    return res.status(500).json({
      message: "Weather service unavailable",
    });
  }
});

module.exports = router;
