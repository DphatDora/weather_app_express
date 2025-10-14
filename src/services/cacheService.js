"use strict";

const { ensureConnected } = require("../lib/redisClient");

const DEFAULT_TTL_SECONDS = 60;

async function getCache(key) {
  const client = await ensureConnected();
  const val = await client.get(key);
  if (!val) return null;
  try {
    return JSON.parse(val);
  } catch (_e) {
    return null;
  }
}

async function setCache(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const client = await ensureConnected();
  const payload = JSON.stringify(value);
  await client.set(key, payload, { EX: ttlSeconds });
}

module.exports = { getCache, setCache, DEFAULT_TTL_SECONDS };
