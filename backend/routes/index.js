/**
 * API ROUTES — /api/*
 *
 * All routes are prefixed with /api in server.js.
 * Analysis and history routes require JWT authentication.
 */

const express        = require("express");
const router         = express.Router();
const { analyze, history } = require("../controllers/analyzeController");
const authMiddleware = require("../middleware/authMiddleware");

// ─── Input Validation Middleware ──────────────────────────────────────────────

const validateAnalyzeInput = (req, res, next) => {
  const { url, description, price } = req.body;

  if (!url && !description) {
    return res.status(400).json({
      success: false,
      error:   "Validation failed",
      message: "At least a listing title (url) or description is required.",
    });
  }

  // Coerce price to number
  if (req.body.price !== undefined) {
    req.body.price = Number(req.body.price) || 0;
    if (isNaN(req.body.price)) {
      return res.status(400).json({
        success: false,
        error:   "Validation failed",
        message: "'price' must be a numeric value.",
      });
    }
  }

  next();
};

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * POST /api/analyze
 * Analyzes a rental listing and returns a scam risk report.
 *
 * Body: { url, description, chat, price, location, contact }
 */
router.post("/analyze", authMiddleware, validateAnalyzeInput, analyze);

/**
 * GET /api/history
 * Returns the authenticated user's scan history (last 50).
 */
router.get("/history", authMiddleware, history);

/**
 * GET /api/health
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    success:   true,
    status:    "OK",
    service:   "GhostRent API",
    version:   "2.0.0",
    timestamp: new Date().toISOString(),
    uptime:    `${Math.floor(process.uptime())}s`,
  });
});

module.exports = router;
