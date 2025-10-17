"use strict";

const { createClient } = require("redis");

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379/0";
const REDIS_CONNECT_TIMEOUT = 2000; // 2 seconds timeout

let client;
let didLogReady = false;
let isConnecting = false;
let lastConnectionAttempt = 0;
const CONNECTION_RETRY_DELAY = 5000; // 5 seconds

function getRedisClient() {
  if (client) return client;

  client = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: REDIS_CONNECT_TIMEOUT,
      reconnectStrategy: (retries) => {
        if (retries > 3) {
          console.error("Redis: Max reconnection attempts reached");
          return false; // Stop reconnecting
        }
        return Math.min(retries * 100, 3000);
      },
    },
  });

  client.on("error", (err) => {
    console.error("Redis Client Error:", err.code || err.message);
  });

  client.on("connect", () => {
    console.log(`Redis connecting to ${redisUrl}`);
  });

  client.on("ready", () => {
    if (!didLogReady) {
      didLogReady = true;
      console.log("Redis connected and ready");
    }
    isConnecting = false;
  });

  return client;
}

async function ensureConnected() {
  const c = getRedisClient();

  // If already connected, return immediately
  if (c.isOpen && c.isReady) {
    return c;
  }

  // Prevent multiple simultaneous connection attempts
  const now = Date.now();
  if (isConnecting || now - lastConnectionAttempt < CONNECTION_RETRY_DELAY) {
    throw new Error("Redis connection unavailable");
  }

  isConnecting = true;
  lastConnectionAttempt = now;

  try {
    // Set a timeout for connection attempt
    const connectPromise = c.isOpen ? Promise.resolve(c) : c.connect();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Redis connection timeout")),
        REDIS_CONNECT_TIMEOUT
      )
    );

    await Promise.race([connectPromise, timeoutPromise]);
    isConnecting = false;
    return c;
  } catch (error) {
    isConnecting = false;
    console.error("Redis connection failed:", error.message);
    throw error;
  }
}

module.exports = { getRedisClient, ensureConnected };
