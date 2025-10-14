"use strict";

const path = require("path");
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

const routes = require("./routes");

const app = express();

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, "../public")));

// View engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Home page
app.get("/", (req, res) => {
  res.render("index", { result: null, error: null });
});

// API routes
app.use(routes);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

module.exports = app;
