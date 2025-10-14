"use strict";

const express = require("express");
const weatherRouter = require("./weather");
const mockOpenWeatherRouter = require("./mockOpenWeather");
const { loadVietnamCities } = require("../utils/cityLoader");

const router = express.Router();

router.get("/api/cities", (req, res) => {
  try {
    const cities = loadVietnamCities();
    res.json({ cities });
  } catch (error) {
    res.status(500).json({ message: "Failed to load cities" });
  }
});
router.use("/weather", weatherRouter);
router.use("/mock/openweather", mockOpenWeatherRouter);

module.exports = router;
