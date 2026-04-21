/**
 * ANALYZE CONTROLLER
 *
 * POST /api/analyze
 *   - Validates text-only input
 *   - Runs hybrid analysis (deterministic + AI)
 *   - Persists result to MongoDB
 *   - Returns structured JSON response
 *
 * GET /api/history
 *   - Returns scan history for the authenticated user
 */

const Scan        = require("../models/Scan");
const { runAnalysis } = require("../services/analysisService");

// ─── Analyze ──────────────────────────────────────────────────────────────────

/**
 * POST /api/analyze
 */
const analyze = async (req, res) => {
  try {
    const {
      url         = "",
      description = "",
      chat        = "",
      price       = 0,
      location    = "",
      contact     = "",
    } = req.body;

    // ── Input validation ─────────────────────────────────────────────────
    if (!url.trim() && !description.trim()) {
      return res.status(400).json({
        success: false,
        error:   "Validation failed",
        message: "Provide at least a listing title (url) or description.",
      });
    }

    if (description.trim().length > 0 && description.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error:   "Validation failed",
        message: "Description is too short to analyze reliably.",
      });
    }

    // ── Run hybrid analysis ───────────────────────────────────────────────
    const result = await runAnalysis({ url, description, chat, price, location, contact });

    // ── Persist to MongoDB ────────────────────────────────────────────────
    const scan = await Scan.create({
      input: { url, description, chat },
      scamScore:  result.scamScore,
      riskLevel:  result.riskLevel,
      confidence: result.confidence,
      breakdown:  result.breakdown,
      insights:   result.insights,
      userId:     req.userId,
      aiUsed:     result.aiUsed,
    });

    // ── Response ──────────────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      data: {
        scanId:     scan._id,
        scannedAt:  scan.createdAt,
        scamScore:  result.scamScore,
        riskLevel:  result.riskLevel,
        confidence: result.confidence,
        breakdown:  result.breakdown,
        insights:   result.insights,
        aiUsed:     result.aiUsed,
      },
    });

  } catch (err) {
    console.error("[analyze] Error:", err);
    return res.status(500).json({
      success: false,
      error:   "Analysis failed.",
      message: err.message,
    });
  }
};

// ─── History ──────────────────────────────────────────────────────────────────

/**
 * GET /api/history
 */
const history = async (req, res) => {
  try {
    const scans = await Scan.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("input.url scamScore riskLevel confidence insights.scamType aiUsed createdAt");

    const stats = {
      total:  scans.length,
      high:   scans.filter((s) => s.riskLevel === "High").length,
      medium: scans.filter((s) => s.riskLevel === "Medium").length,
      low:    scans.filter((s) => s.riskLevel === "Low").length,
    };

    return res.status(200).json({
      success: true,
      stats,
      count: scans.length,
      data: scans.map((s) => ({
        id:        s._id,
        scannedAt: s.createdAt,
        title:     s.input?.url || "Untitled",
        scamScore: s.scamScore,
        riskLevel: s.riskLevel,
        confidence: s.confidence,
        scamType:  s.insights?.scamType || "unknown",
        aiUsed:    s.aiUsed,
      })),
    });
  } catch (err) {
    console.error("[history] Error:", err);
    return res.status(500).json({
      success: false,
      error:   "Failed to fetch history.",
      message: err.message,
    });
  }
};

module.exports = { analyze, history };
