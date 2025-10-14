"use strict";

const express = require("express");
const router = express.Router();

router.get("/weather", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.status(400).json({ message: "Missing q" });

  const delayMs =
    Number(req.query.delayMs ?? process.env.MOCK_DEFAULT_DELAY_MS ?? 0) || 0;
  const status = req.query.status || "clear sky";
  const temp = Number(req.query.temp ?? 30);
  const shouldFail = String(req.query.fail || "false") === "true";

  await new Promise((r) => setTimeout(r, delayMs));
  if (shouldFail) {
    return res.status(500).json({ message: "Mock upstream failure" });
  }

  return res.json({
    name: q,
    main: { temp },
    weather: [{ description: status }],
  });
});

module.exports = router;
