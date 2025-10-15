// Mock Redis client for testing
const mockCache = new Map();

jest.mock("../src/lib/redisClient", () => {
  return {
    ensureConnected: jest.fn(async () => ({
      get: jest.fn(async (key) => {
        const data = mockCache.get(key);
        return data || null;
      }),
      set: jest.fn(async (key, value, options) => {
        mockCache.set(key, value);
        return "OK";
      }),
      isOpen: true,
    })),
    getRedisClient: jest.fn(() => ({
      get: jest.fn(async (key) => {
        const data = mockCache.get(key);
        return data || null;
      }),
      set: jest.fn(async (key, value, options) => {
        mockCache.set(key, value);
        return "OK";
      }),
      isOpen: true,
    })),
  };
});

// Mock axios for OpenWeather API calls
jest.mock("axios");
const axios = require("axios");

axios.get = jest.fn((url, config) => {
  // Mock successful response for any city
  return Promise.resolve({
    data: {
      name: config?.params?.q || "TestCity",
      main: { temp: 25 },
      weather: [{ description: "clear sky", main: "Clear", icon: "01d" }],
    },
    status: 200,
  });
});
