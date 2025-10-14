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
  const resp = await axios.get(url, { params, timeout: 7000 });
  const durationMs = Date.now() - start;
  return normalizeOpenWeather(resp.data, durationMs);
}

async function fetchWeatherFromMock(city, baseUrl) {
  const url = `${baseUrl || ""}${mockBasePath}/weather`;
  const params = { q: city };
  const start = Date.now();
  const resp = await axios.get(url, { params, timeout: 5000 });
  const durationMs = Date.now() - start;
  return normalizeOpenWeather(resp.data, durationMs);
}

function normalizeOpenWeather(data, durationMs) {
  const temp = data?.main?.temp;
  const status = data?.weather?.[0]?.description || "unknown";
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
