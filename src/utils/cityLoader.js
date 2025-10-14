"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Load Vietnam cities from CSV file
 * @returns {string[]} Array of city names
 */
function loadVietnamCities() {
  const csvPath = path.join(__dirname, "../../data/vietnam_cities.csv");
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n").map((line) => line.trim());
  // Skip header and empty lines
  const cities = lines.slice(1).filter((line) => line.length > 0);
  return cities;
}

module.exports = { loadVietnamCities };
