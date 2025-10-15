// Mock Redis client for testing
jest.mock("../src/lib/redisClient", () => {
  const mockData = new Map();

  return {
    ensureConnected: jest.fn(async () => ({
      get: jest.fn(async (key) => mockData.get(key) || null),
      set: jest.fn(async (key, value, options) => {
        mockData.set(key, value);
        return "OK";
      }),
      isOpen: true,
    })),
    getRedisClient: jest.fn(() => ({
      get: jest.fn(async (key) => mockData.get(key) || null),
      set: jest.fn(async (key, value, options) => {
        mockData.set(key, value);
        return "OK";
      }),
      isOpen: true,
    })),
  };
});
