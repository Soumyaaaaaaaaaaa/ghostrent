/**
 * ANALYZE CONTROLLER
 *
 * Orchestrates the full Hybrid Analysis Pipeline:
 *
 *  Pipeline A — Logic (existing)
 *  ─────────────────────────────
 *  1. Validate input
 *  2. Run all logic services in parallel
 *  3. Calculate weighted logic score (scoringEngine)
 *
 *  Pipeline B — AI (new)
 *  ─────────────────────
 *  4. Build logic flags summary
 *  5. Call AI analysis service
 *
 *  Merge
 *  ─────
 *  6. Merge logic + AI results (mergeEngine)
 *  7. Format final response (responseFormatter)
 *  8. Save to memory store
 *  9. Return response
 */

require("dotenv").config();

const { analyzeImages }       = require("../services/imageService");
const { analyzePrice }        = require("../services/priceService");
const { analyzeText }         = require("../services/textService");
const { analyzeDuplicates }   = require("../services/duplicateService");
const { analyzeSeller }       = require("../services/sellerService");
const { analyzeConversation } = require("../services/conversationService");
const { calculateFinalScore } = require("../services/scoringEngine");
const { saveScan, getHistory, getStats } = require("../services/memoryStore");

// ── NEW: Hybrid pipeline additions ──
const { runAIAnalysis }       = require("../services/aiAnalysis");
const { mergeResults }        = require("../services/mergeEngine");
const { formatFinalResponse } = require("../utils/responseFormatter");

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generate natural-language seller insights based on collected signals.
 */
const buildSellerInsights = (sellerResult, scamType, imageResult, duplicateResult) => {
  const insights = [];

  if (sellerResult.details?.fingerprint?.occurrences > 0) {
    insights.push(`This contact has appeared in ${sellerResult.details.fingerprint.occurrences} previous listing scan(s).`);
  }

  if (scamType?.type && scamType.type !== "unknown") {
    const typeNames = {
      advance_payment_scam: "Advance Payment Scam",
      fake_broker_scam:     "Fake Broker Scam",
      military_scam:        "Military/Overseas Scam"
    };
    insights.push(`Listing pattern matches a known scam type: ${typeNames[scamType.type] || scamType.type}.`);
  }

  if (imageResult.details?.reusedImages?.length > 0) {
    insights.push("Images from this listing have appeared in other scanned listings.");
  }

  if (duplicateResult.details?.closestMatch) {
    insights.push(
      `A similar listing was scanned on ${new Date(duplicateResult.details.closestMatch.scannedAt).toLocaleDateString()}.`
    );
  }

  if (insights.length === 0) {
    insights.push("No cross-listing connections found for this seller.");
  }

  return insights;
};

/**
 * Build a compact logic-flags object to feed into the AI prompt.
 * This summarises what the logic pipeline found so the AI has context.
 */
const buildLogicFlags = (textResult, priceResult, imageResult, duplicateResult, sellerResult, conversationResult) => {
  return {
    scamKeywordsFound:   textResult.details?.keywordCount > 0,
    keywordsDetected:    textResult.details?.keywordsFound?.slice(0, 5) || [],
    scamTypeLogic:       textResult.scamType?.type || "unknown",
    priceVeryLow:        priceResult.score >= 60,
    priceScore:          priceResult.score,
    imagesReused:        imageResult.details?.reusedImages?.length > 0,
    imageScore:          imageResult.score,
    duplicateFound:      duplicateResult.score > 30,
    sellerSuspicious:    sellerResult.score > 40,
    conversationRed:     conversationResult.score > 40,
    conversationFlags:   conversationResult.details?.flagsFound || []
  };
};

// ─── Main Analyze Handler ────────────────────────────────────────────────────

/**
 * POST /analyze
 * Main analysis endpoint — runs the full hybrid pipeline.
 */
const analyze = async (req, res) => {
  try {
    const {
      title       = "",
      description = "",
      price       = 0,
      location    = "",
      contact     = "",
      images      = [],
      chatText    = ""
    } = req.body;

    // ── Edge Case: Empty Input ─────────────────────────────────────────────
    const hasContent =
      title.trim() || description.trim() || price > 0 || chatText.trim() || images.length > 0;

    if (!hasContent) {
      return res.status(400).json({
        success: false,
        error:   "At least one input required (title, description, price, images, or chatText)."
      });
    }

    // ── PIPELINE A: Logic Analysis ─────────────────────────────────────────

    const [imageResult, priceResult, textResult, duplicateResult, sellerResult] = await Promise.all([
      Promise.resolve(analyzeImages(images)),
      Promise.resolve(analyzePrice(price, location)),
      Promise.resolve(analyzeText(title, description)),
      Promise.resolve(analyzeDuplicates(title, description)),
      Promise.resolve(analyzeSeller(contact))
    ]);

    const conversationResult = analyzeConversation(chatText, textResult.scamType?.type);

    // Aggregate logic score
    const { scamScore: logicScore, riskLevel: logicRisk, confidence: logicConf, breakdown, weights } =
      calculateFinalScore(
        {
          imageRisk:     imageResult.score,
          priceRisk:     priceResult.score,
          textRisk:      textResult.score,
          duplicateRisk: duplicateResult.score,
          sellerRisk:    sellerResult.score
        },
        conversationResult.score,
        req.body
      );

    // Build explanations from logic pipeline
    const logicExplanations = [
      ...imageResult.explanations,
      ...priceResult.explanations,
      ...textResult.explanations,
      ...duplicateResult.explanations,
      ...sellerResult.explanations,
      ...conversationResult.explanations
    ];

    // ── Edge Case: Minimal data – reduce confidence notice ─────────────────
    const descTooShort  = description.trim().length > 0 && description.trim().length < 30;
    const chatTooShort  = chatText.trim().length > 0 && chatText.trim().length < 20;
    if (descTooShort || chatTooShort) {
      logicExplanations.push("⚠️ Insufficient data — analysis confidence is reduced due to very short input.");
    }

    // ── Edge Case: Extreme price (< 30% of expected market) ───────────────
    //  priceService already handles this, but we double-check for forced high risk
    const extremePrice = priceResult.score >= 80;
    const effectiveLogicScore = extremePrice ? Math.max(logicScore, 75) : logicScore;

    const sellerInsights = buildSellerInsights(
      sellerResult, textResult.scamType, imageResult, duplicateResult
    );

    // Compact logic-pipeline object to pass to controller-merge logic
    const logicPipelineResult = {
      scamScore:      effectiveLogicScore,
      riskLevel:      logicRisk,
      confidence:     logicConf,
      breakdown,
      weights,
      explanations:   logicExplanations,
      predictions:    conversationResult.predictions,
      scamType:       textResult.scamType,
      sellerInsights
    };

    // ── PIPELINE B: AI Analysis ────────────────────────────────────────────

    const logicFlags = buildLogicFlags(
      textResult, priceResult, imageResult, duplicateResult, sellerResult, conversationResult
    );

    const aiResult = await runAIAnalysis({
      title,
      description,
      chat:     chatText,
      price,
      location,
      logicFlags
    });

    // ── MERGE ──────────────────────────────────────────────────────────────

    const merged = mergeResults(logicPipelineResult, aiResult);

    // ── Edge Case: Image analysis note ────────────────────────────────────
    if (!merged.explanations.some(e => e.includes("simulated"))) {
      merged.explanations.push("🖼️ Image analysis is simulated — real reverse-image lookup not available.");
    }

    // Format final clean response
    const finalResult = formatFinalResponse(merged);

    // ── Save to memory store ───────────────────────────────────────────────
    const saved = saveScan({ input: req.body, result: finalResult });
    finalResult.scanId    = saved.id;
    finalResult.scannedAt = saved.scannedAt;

    return res.status(200).json({
      success: true,
      data:    finalResult
    });

  } catch (err) {
    console.error("[analyze] Error:", err);
    return res.status(500).json({
      success: false,
      error:   "Analysis failed. Please check your input and try again.",
      message: err.message
    });
  }
};

// ─── History Handler ──────────────────────────────────────────────────────────

/**
 * GET /history
 */
const history = (req, res) => {
  const scans = getHistory();
  const stats = getStats();

  res.status(200).json({
    success: true,
    stats,
    count: scans.length,
    data: scans.map((s) => ({
      id:        s.id,
      scannedAt: s.scannedAt,
      title:     s.input?.title  || "Untitled",
      location:  s.input?.location || "Unknown",
      scamScore: s.result?.scamScore,
      riskLevel: s.result?.riskLevel,
      scamType:  s.result?.scamType?.type || "unknown",
      aiUsed:    s.result?.aiUsed ?? false
    }))
  });
};

// ─── Demo Handler ─────────────────────────────────────────────────────────────

/**
 * GET /demo
 */
const demo = (req, res) => {
  const realListing = {
    id:    "demo-real",
    label: "✅ Legitimate Listing Example",
    input: {
      title:       "2BHK Apartment in Koramangala, Bangalore",
      description: "Spacious 2-bedroom apartment in a gated society. 24/7 security, parking, gym, and clubhouse access. Near Silk Board flyover. Fully furnished. Available from 1st of next month. Contact for viewing appointment.",
      price:       28000,
      location:    "Koramangala, Bangalore",
      contact:     "+91-9876543210",
      images:      ["https://example.com/property/room1.jpg", "https://example.com/property/room2.jpg"],
      chatText:    ""
    },
    expectedRisk: "Low"
  };

  const scamListing = {
    id:    "demo-scam",
    label: "🚨 Scam Listing Example",
    input: {
      title:       "URGENT!!! Luxury 3BHK Flat in Mumbai - VERY CHEAP!! ACT NOW!!",
      description: "I am currently deployed overseas (army). I need a trustworthy god-fearing person to take care of my property. Rent is only ₹5000/month which is way below market. No visits possible — I will mail the key after you pay the advance. Pay now via Western Union. Genuine inquiries only. God bless.",
      price:       5000,
      location:    "Bandra, Mumbai",
      contact:     "1234567890",
      images:      ["https://unsplash.com/photo/apartment.jpg"],
      chatText:    "Please send the advance today. Another buyer is interested.\nI promise this is 100% legitimate.\nTrust me, send the deposit first and I will mail the keys."
    },
    expectedRisk: "High"
  };

  res.status(200).json({
    success:     true,
    message:     "Send these to POST /analyze to see the detection in action.",
    demos:       [realListing, scamListing],
    apiEndpoint: "POST /analyze"
  });
};

// ─── Report Handler ───────────────────────────────────────────────────────────

const reportStore = [];

const report = (req, res) => {
  const { scanId, reason, contact } = req.body;

  if (!scanId && !reason) {
    return res.status(400).json({
      success: false,
      error:   "Provide at least a scanId or reason to file a report."
    });
  }

  const entry = {
    id:         require("crypto").randomUUID(),
    scanId:     scanId  || null,
    reason:     reason  || "Not specified",
    contact:    contact || "Anonymous",
    reportedAt: new Date().toISOString()
  };

  reportStore.push(entry);

  return res.status(200).json({
    success:    true,
    message:    "Thank you for your report. We've logged it for review.",
    reportId:   entry.id,
    reportedAt: entry.reportedAt
  });
};

module.exports = { analyze, history, demo, report };
