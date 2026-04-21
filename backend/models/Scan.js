const mongoose = require("mongoose");

/**
 * SCAN MODEL
 *
 * Persists each rental listing analysis to MongoDB.
 * Strictly text-based — no image fields.
 */
const scanSchema = new mongoose.Schema(
  {
    // ── Input ──────────────────────────────────────────────────────────────
    input: {
      url:         { type: String, default: "" },  // listing URL or title used as key
      description: { type: String, default: "" },
      chat:        { type: String, default: "" },
    },

    // ── Result ─────────────────────────────────────────────────────────────
    scamScore:  { type: Number, required: true, min: 0, max: 100 },
    riskLevel:  { type: String, enum: ["Low", "Medium", "High"], required: true },
    confidence: { type: Number, min: 0, max: 100, default: 0 },

    // ── Breakdown ──────────────────────────────────────────────────────────
    breakdown: {
      textRisk:      { type: Number, default: 0 },
      priceRisk:     { type: Number, default: 0 },
      duplicateRisk: { type: Number, default: 0 },
      sellerRisk:    { type: Number, default: 0 },
    },

    // ── Insights ───────────────────────────────────────────────────────────
    insights: {
      explanations:  [{ type: String }],
      predictions:   [{ type: String }],
      scamType:      { type: String, default: "unknown" },
      sellerInsights: { type: String, default: "" },
    },

    // ── Meta ───────────────────────────────────────────────────────────────
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    aiUsed:  { type: Boolean, default: false },
  },
  {
    timestamps: true, // createdAt + updatedAt
  }
);

// Index for fast per-user history queries
scanSchema.index({ userId: 1, createdAt: -1 });

const Scan = mongoose.model("Scan", scanSchema);

module.exports = Scan;
