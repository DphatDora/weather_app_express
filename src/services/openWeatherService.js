"use strict";

const axios = require("axios");

const provider = (process.env.OPENWEATHER_PROVIDER || "real").toLowerCase();
const realBaseUrl =
  process.env.OPENWEATHER_BASE_URL || "https://api.openweathermap.org/data/2.5";
const apiKey = process.env.OPENWEATHER_API_KEY || "";
const mockBasePath =
  process.env.MOCK_OPENWEATHER_BASE_PATH || "/mock/openweather";

async function fetchWeatherFromReal(city) {
  const url = `${realBaseUrl}/weather`;
  const params = {
    q: city,
    appid: apiKey,
    units: "metric",
  };
  const start = Date.now();

  try {
    // API timeout > 5s
    const resp = await axios.get(url, { params, timeout: 5000 });
    const durationMs = Date.now() - start;

    // Empty body check
    if (!resp.data) {
      throw new Error("API returned empty body");
    }

    return normalizeOpenWeather(resp.data, durationMs);
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      throw new Error("API request timeout");
    }
    throw error;
  }
}

async function fetchWeatherFromMock(city, baseUrl) {
  const url = `${baseUrl || ""}${mockBasePath}/weather`;
  const params = { q: city };
  const start = Date.now();

  try {
    // Timeout check
    const resp = await axios.get(url, { params, timeout: 5000 });
    const durationMs = Date.now() - start;

    // Empty body check
    if (!resp.data) {
      throw new Error("Mock API returned empty body");
    }

    return normalizeOpenWeather(resp.data, durationMs);
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      throw new Error("Mock API request timeout");
    }
    throw error;
  }
}

function normalizeOpenWeather(data, durationMs) {
  // Validate schema and data types
  if (!data || typeof data !== "object") {
    throw new Error("Invalid API response format");
  }

  const temp = data?.main?.temp;
  const status = data?.weather?.[0]?.description || "unknown";

  // Check if temperature is a valid number
  if (temp !== undefined && typeof temp !== "number") {
    throw new Error("Invalid temperature data type");
  }

  return {
    temperature: typeof temp === "number" ? temp : null,
    status,
    providerDurationMs: durationMs,
    raw: data,
  };
}

async function fetchWeather(city, options = {}) {
  const useProvider = options.provider || provider;
  const mockBaseUrl = options.mockBaseUrl || "";
  if (useProvider === "mock") {
    return fetchWeatherFromMock(city, mockBaseUrl);
  }
  return fetchWeatherFromReal(city);
}

module.exports = { fetchWeather, normalizeOpenWeather };
