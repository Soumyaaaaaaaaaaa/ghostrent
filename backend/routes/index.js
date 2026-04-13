/**
 * API ROUTES
 * Maps HTTP endpoints to controller functions.
 */

const express = require("express");
const router = express.Router();
const { analyze, history, demo } = require("../controllers/analyzeController");

// ─── Input Validation Middleware ────────────────────────────────────────────

/**
 * Validates the /analyze request body.
 * Ensures at least a title or description is present to analyze.
 */
const validateAnalyzeInput = (req, res, next) => {
  const { title, description } = req.body;

  // Must have at least some text to analyze
  if (!title && !description) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      message: "At least a 'title' or 'description' is required to analyze a listing."
    });
  }

  // Price must be a number if provided
  if (req.body.price !== undefined && isNaN(Number(req.body.price))) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      message: "'price' must be a numeric value."
    });
  }

  // Coerce price to number
  req.body.price = Number(req.body.price) || 0;

  // Images must be an array
  if (req.body.images && !Array.isArray(req.body.images)) {
    req.body.images = [req.body.images];
  }

  next();
};

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /analyze
 * Analyzes a rental listing and returns scam risk assessment.
 *
 * Body: { title, description, price, location, contact, images[], chatText }
 */
router.post("/analyze", validateAnalyzeInput, analyze);

/**
 * GET /history
 * Returns all previously scanned listings summary.
 */
router.get("/history", history);

/**
 * GET /demo
 * Returns sample real + scam listings for testing purposes.
 */
router.get("/demo", demo);

/**
 * POST /report
 * Store / acknowledge a user-flagged report. Returns a confirmation.
 * In production, this could trigger email alerts or write to a DB.
 */
const { report } = require("../controllers/analyzeController");
router.post("/report", report);

/**
 * GET /health
 * Quick health check endpoint.
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "OK",
    service: "Rental Scam Detector API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`
  });
});

module.exports = router;
