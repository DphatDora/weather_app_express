"use strict";

const { ensureConnected } = require("../lib/redisClient");

const DEFAULT_TTL_SECONDS = 60;

async function getCache(key) {
  try {
    // Redis cache failure during lookup with timeout
    const client = await ensureConnected();

    // Add timeout to get operation
    const getPromise = client.get(key);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Cache get timeout")), 1000)
    );

    const val = await Promise.race([getPromise, timeoutPromise]);
    if (!val) return null;

    try {
      // Redis returns corrupted/invalid data
      const parsed = JSON.parse(val);

      // Validate parsed data structure
      if (!parsed || typeof parsed !== "object") {
        console.error(`Invalid cache data structure for key: ${key}`);
        return null;
      }

      return parsed;
    } catch (parseError) {
      // Corrupted JSON in cache
      console.error(
        `Failed to parse cache data for key ${key}:`,
        parseError.message
      );
      return null;
    }
  } catch (error) {
    // Redis connection or operation failure - log and return null quickly
    console.error("Redis cache lookup error:", error.message);
    return null; // Fail gracefully, don't block the request
  }
}

async function setCache(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
  try {
    const client = await ensureConnected();
    const payload = JSON.stringify(value);

    // Add timeout to set operation (1 second)
    const setPromise = client.set(key, payload, { EX: ttlSeconds });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Cache set timeout")), 1000)
    );

    await Promise.race([setPromise, timeoutPromise]);
  } catch (error) {
    console.error("Redis cache set error:", error.message);
  }
}

module.exports = { getCache, setCache, DEFAULT_TTL_SECONDS };
