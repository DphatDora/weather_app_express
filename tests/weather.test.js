"use strict";

const request = require("supertest");
const nock = require("nock");

process.env.OPENWEATHER_PROVIDER = "mock";
process.env.MOCK_DEFAULT_DELAY_MS = "0";

const app = require("../src/app");
const axios = require("axios");
const { ensureConnected } = require("../src/lib/redisClient");

describe("Weather API", () => {
  test("400 khi thiếu city", async () => {
    const res = await request(app).get("/weather");
    expect(res.status).toBe(400);
  });

  test("Miss cache lần 1, sau đó hit cache lần 2", async () => {
    const city = "Ho Chi Minh";

    // Lần 1 (miss, gọi mock nội bộ): không dùng nock, gọi route mock trực tiếp
    const res1 = await request(app).get("/weather").query({ city });

    expect(res1.status).toBe(200);
    expect(res1.body.cache.hit).toBe(false);
    expect(typeof res1.body.responseTimeMs).toBe("number");

    // Lần 2 (hit cache)
    const res2 = await request(app).get("/weather").query({ city });

    expect(res2.status).toBe(200);
    expect(res2.body.cache.hit).toBe(true);
    expect(typeof res2.body.responseTimeMs).toBe("number");
  });

  test("Fallback stale (>60s) khi API lỗi: trả cache cũ kèm warning", async () => {
    const city = "Da Nang";

    // Tạo cache cũ (stale) thủ công với cachedAt quá 60s
    const client = await ensureConnected();
    const cacheKey = `weather:${city.toLowerCase()}`;
    const stalePayload = JSON.stringify({
      temperature: 27,
      status: "clear sky",
      cachedAt: Date.now() - 61_000,
    });
    await client.set(cacheKey, stalePayload);

    // Mock API fail ở lần gọi kế tiếp
    const original = axios.get;
    axios.get = jest.fn(() => Promise.reject(new Error("API down")));

    const res = await request(app).get("/weather").query({ city });

    // Khôi phục mock axios
    axios.get = original;

    expect(res.status).toBe(200);
    expect(res.body.cache.stale).toBe(true);
    expect(res.body.warning).toBe("Using cached data due to upstream error");
    expect(res.body.city).toBe(city);
  });

  test("API lỗi và không có cache: trả 503", async () => {
    const city = "NoCacheCity"; // đảm bảo key mới, không cache trước đó

    // Đảm bảo xoá bất kỳ cache tồn tại (nếu có)
    const client = await ensureConnected();
    const cacheKey = `weather:${city.toLowerCase()}`;
    await client.set(cacheKey, ""); // set rỗng để getCache trả null

    // Mock API fail
    const original = axios.get;
    axios.get = jest.fn(() => Promise.reject(new Error("API down")));

    const res = await request(app).get("/weather").query({ city });

    axios.get = original;

    expect(res.status).toBe(503);
    expect(res.body.message).toBe("Weather service unavailable");
  });

  test("Cache hỏng (JSON lỗi): bỏ qua cache và lấy mới từ API", async () => {
    const city = "Hanoi";
    const client = await ensureConnected();
    const cacheKey = `weather:${city.toLowerCase()}`;
    await client.set(cacheKey, "invalid_json");

    const res = await request(app).get("/weather").query({ city });

    expect(res.status).toBe(200);
    expect(res.body.cache.hit).toBe(false);
    expect(res.body.city).toBe(city);
  });

  test("Redis lỗi (ensureConnected ném lỗi): hệ thống vẫn trả về 200 từ API", async () => {
    const city = "Tokyo";

    // Tạm thời mock ensureConnected để ném lỗi
    const redisModule = require("../src/lib/redisClient");
    const originalEnsure = redisModule.ensureConnected;
    redisModule.ensureConnected = jest.fn(async () => {
      throw new Error("Redis connection unavailable");
    });

    const res = await request(app).get("/weather").query({ city });

    // Khôi phục
    redisModule.ensureConnected = originalEnsure;

    expect(res.status).toBe(200);
    expect(res.body.city).toBe(city);
  });
});
