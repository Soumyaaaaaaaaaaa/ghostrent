/**
 * ANALYZE CONTROLLER
 *
 * Orchestrates the full scam analysis pipeline:
 *  1. Validate input
 *  2. Run all services in parallel
 *  3. Aggregate scores via the scoring engine
 *  4. Build the final structured response
 *  5. Save to memory store
 */

const { analyzeImages }       = require("../services/imageService");
const { analyzePrice }        = require("../services/priceService");
const { analyzeText }         = require("../services/textService");
const { analyzeDuplicates }   = require("../services/duplicateService");
const { analyzeSeller }       = require("../services/sellerService");
const { analyzeConversation } = require("../services/conversationService");
const { calculateFinalScore } = require("../services/scoringEngine");
const { saveScan, getHistory, getStats } = require("../services/memoryStore");

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
      fake_broker_scam: "Fake Broker Scam",
      military_scam: "Military/Overseas Scam"
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
 * POST /analyze
 * Main analysis endpoint.
 */
const analyze = async (req, res) => {
  try {
    const {
      title = "",
      description = "",
      price = 0,
      location = "",
      contact = "",
      images = [],
      chatText = ""
    } = req.body;

    // --- Run all analyses (parallel execution for speed) ---
    const [imageResult, priceResult, textResult, duplicateResult, sellerResult] = await Promise.all([
      Promise.resolve(analyzeImages(images)),
      Promise.resolve(analyzePrice(price, location)),
      Promise.resolve(analyzeText(title, description)),
      Promise.resolve(analyzeDuplicates(title, description)),
      Promise.resolve(analyzeSeller(contact))
    ]);

    const conversationResult = analyzeConversation(chatText, textResult.scamType?.type);

    // --- Calculate final weighted score ---
    const { scamScore, riskLevel, confidence, breakdown, weights } = calculateFinalScore(
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

    // --- Build explanations list ---
    const explanations = [
      ...imageResult.explanations,
      ...priceResult.explanations,
      ...textResult.explanations,
      ...duplicateResult.explanations,
      ...sellerResult.explanations,
      ...conversationResult.explanations
    ];

    // --- Build seller insights ---
    const sellerInsights = buildSellerInsights(sellerResult, textResult.scamType, imageResult, duplicateResult);

    // --- Compose final response ---
    const result = {
      scamScore,
      riskLevel,
      confidence,
      breakdown,
      weights,
      explanations,
      predictions: conversationResult.predictions,
      scamType: textResult.scamType,
      sellerInsights,
      details: {
        image:       imageResult.details,
        price:       priceResult.details,
        text:        textResult.details,
        duplicate:   duplicateResult.details,
        seller:      sellerResult.details,
        conversation: conversationResult.details
      }
    };

    // --- Save to memory store ---
    const saved = saveScan({ input: req.body, result });
    result.scanId = saved.id;
    result.scannedAt = saved.scannedAt;

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (err) {
    console.error("[analyze] Error:", err);
    res.status(500).json({
      success: false,
      error: "Analysis failed. Please check your input and try again.",
      message: err.message
    });
  }
};

/**
 * GET /history
 * Returns all previous scan results.
 */
const history = (req, res) => {
  const scans = getHistory();
  const stats = getStats();

  res.status(200).json({
    success: true,
    stats,
    count: scans.length,
    data: scans.map((s) => ({
      id: s.id,
      scannedAt: s.scannedAt,
      title: s.input?.title || "Untitled",
      location: s.input?.location || "Unknown",
      scamScore: s.result?.scamScore,
      riskLevel: s.result?.riskLevel,
      scamType: s.result?.scamType?.type || "unknown"
    }))
  });
};

/**
 * GET /demo
 * Returns two pre-built demo listings — one real, one scam — for testing.
 */
const demo = (req, res) => {
  const realListing = {
    id: "demo-real",
    label: "✅ Legitimate Listing Example",
    input: {
      title: "2BHK Apartment in Koramangala, Bangalore",
      description:
        "Spacious 2-bedroom apartment in a gated society. 24/7 security, parking, gym, and clubhouse access. Near Silk Board flyover. Fully furnished. Available from 1st of next month. Contact for viewing appointment.",
      price: 28000,
      location: "Koramangala, Bangalore",
      contact: "+91-9876543210",
      images: ["https://example.com/property/room1.jpg", "https://example.com/property/room2.jpg"],
      chatText: ""
    },
    expectedRisk: "Low"
  };

  const scamListing = {
    id: "demo-scam",
    label: "🚨 Scam Listing Example",
    input: {
      title: "URGENT!!! Luxury 3BHK Flat in Mumbai - VERY CHEAP!! ACT NOW!!",
      description:
        "I am currently deployed overseas (army). I need a trustworthy god-fearing person to take care of my property. Rent is only ₹5000/month which is way below market. No visits possible — I will mail the key after you pay the advance. Pay now via Western Union. Genuine inquiries only. God bless.",
      price: 5000,
      location: "Bandra, Mumbai",
      contact: "1234567890",
      images: ["https://unsplash.com/photo/apartment.jpg"],
      chatText:
        "Please send the advance today. Another buyer is interested.\nI promise this is 100% legitimate.\nTrust me, send the deposit first and I will mail the keys."
    },
    expectedRisk: "High"
  };

  res.status(200).json({
    success: true,
    message: "Send these to POST /analyze to see the detection in action.",
    demos: [realListing, scamListing],
    apiEndpoint: "POST /analyze"
  });
};

/**
 * POST /report
 * Accepts a user-submitted report. Stores it in memory and returns a confirmation.
 * In production, this would write to a DB / alert system.
 */
const reportStore = []; // simple in-memory list of user reports

const report = (req, res) => {
  const { scanId, reason, contact } = req.body;

  if (!scanId && !reason) {
    return res.status(400).json({
      success: false,
      error: "Provide at least a scanId or reason to file a report."
    });
  }

  const entry = {
    id: require("crypto").randomUUID(),
    scanId: scanId || null,
    reason: reason || "Not specified",
    contact: contact || "Anonymous",
    reportedAt: new Date().toISOString()
  };

  reportStore.push(entry);

  return res.status(200).json({
    success: true,
    message: "Thank you for your report. We've logged it for review.",
    reportId: entry.id,
    reportedAt: entry.reportedAt
  });
};

module.exports = { analyze, history, demo, report };
