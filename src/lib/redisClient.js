"use strict";

const { createClient } = require("redis");

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379/0";

let client;
let didLogReady = false;

function getRedisClient() {
  if (client) return client;
  client = createClient({ url: redisUrl });
  client.on("error", (err) => {
    console.error("Redis Client Error", err);
  });
  client.on("connect", () => {
    console.log(`Redis connecting to ${redisUrl}`);
  });
  client.on("ready", () => {
    if (!didLogReady) {
      didLogReady = true;
      console.log("Redis connected and ready");
    }
  });
  return client;
}

async function ensureConnected() {
  const c = getRedisClient();
  if (!c.isOpen) {
    await c.connect();
  }
  return c;
}

module.exports = { getRedisClient, ensureConnected };
