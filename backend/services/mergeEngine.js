/**
 * MERGE ENGINE
 *
 * Combines the logic pipeline result with the AI analysis result
 * into a single, authoritative scam assessment.
 *
 * Weight policy:
 *   Logic score → 70%
 *   AI score    → 30%  (only when AI analysis succeeded)
 *
 * When AI is unavailable (fallback=true), 100% logic score is used
 * but confidence is reduced to indicate limited analysis.
 */

const { mergeExplanations } = require("../utils/responseFormatter");

// --- Risk level thresholds ---
const getRiskLevel = (score) => {
  if (score >= 71) return "High";
  if (score >= 31) return "Medium";
  return "Low";
};

/**
 * Calculate a combined confidence score.
 *
 * Starts from the logic-derived confidence (which already accounts for
 * how much data was provided), then adjusts based on AI participation
 * and agreement between AI and logic scores.
 *
 * @param {number} logicConfidence   - Confidence from scoringEngine (0-100)
 * @param {object} aiResult          - Full AI result object
 * @param {number} logicScore        - Final logic-weighted score
 * @returns {number}
 */
const calcMergedConfidence = (logicConfidence, aiResult, logicScore) => {
  let conf = logicConfidence;

  if (!aiResult.aiUsed) {
    // AI not available – reduce confidence by 15 points
    conf = Math.max(0, conf - 15);
    return Math.min(conf, 85); // cap at 85 when AI-less
  }

  // AI was used — boost by how well the two pipelines agree
  const scoreDiff = Math.abs(logicScore - (aiResult.riskScore ?? logicScore));
  const agreementBonus = scoreDiff <= 10 ? 8 : scoreDiff <= 25 ? 3 : -5;

  // Additional boost if AI itself is confident
  const aiConfBonus = aiResult.confidence >= 70 ? 5 : aiResult.confidence <= 30 ? -5 : 0;

  conf = conf + agreementBonus + aiConfBonus;

  return Math.min(97, Math.max(0, Math.round(conf)));
};

/**
 * Map an AI scamType string to the logic pipeline's scamType format.
 * The logic engine uses snake_case type keys; AI may return various formats.
 *
 * @param {string} aiType
 * @param {object} logicScamType  - { type, confidence, matchedPhrases }
 * @returns {object}              - Unified scamType object
 */
const resolveScamType = (aiType = "", logicScamType = {}) => {
  const lower = aiType.toLowerCase().replace(/\s+/g, "_");

  // If AI says "None" or empty → trust logic
  if (!aiType || aiType === "Unknown" || aiType === "None" || aiType === "none") {
    return logicScamType;
  }

  // If logic already identified a type, prefer logic type but blend confidence
  if (logicScamType?.type && logicScamType.type !== "unknown") {
    return {
      ...logicScamType,
      confidence: Math.min(95, Math.round((logicScamType.confidence + 70) / 2)), // boost
      aiConfirmed: true
    };
  }

  // Logic didn't catch it but AI did — return AI type mapped to known format
  const knownTypes = {
    advance_payment_scam: "advance_payment_scam",
    fake_broker_scam:     "fake_broker_scam",
    military_scam:        "military_scam",
    phishing_scam:        "phishing_scam"
  };

  return {
    type:       knownTypes[lower] || lower,
    confidence: 65,
    source:     "ai"
  };
};

/**
 * Merge logic and AI results into a single, final analysis object.
 *
 * @param {object} logicResult  - Output from calculateFinalScore + all explanations assembled in controller
 * @param {object} aiResult     - Output from runAIAnalysis
 * @returns {object}            - Final merged result
 */
const mergeResults = (logicResult = {}, aiResult = {}) => {
  const logicScore = logicResult.scamScore ?? 0;
  const aiScore    = aiResult.aiUsed ? (aiResult.riskScore ?? logicScore) : logicScore;

  // Weighted blend: 70% logic, 30% AI (or 100% logic if AI failed)
  const finalScore = aiResult.aiUsed
    ? Math.round(logicScore * 0.70 + aiScore * 0.30)
    : logicScore;

  const scamScore  = Math.min(100, Math.max(0, finalScore));
  const riskLevel  = getRiskLevel(scamScore);

  // Confidence
  const confidence = calcMergedConfidence(
    logicResult.confidence ?? 40,
    aiResult,
    logicScore
  );

  // Explanations: logic first, then non-duplicate AI reasons
  const explanations = mergeExplanations(
    logicResult.explanations || [],
    aiResult.reasons          || []
  );

  // Add edge-case notices
  if (aiResult.aiUsed && Math.abs(logicScore - aiScore) > 30) {
    explanations.push("⚖️ Mixed signals detected — logic and AI engines reached different conclusions. Manual review recommended.");
  }
  if (!aiResult.aiUsed && !aiResult.aiKey) {
    // Don't add noise when key simply not present
  }

  // Predictions: merge (AI predictions are richer when available)
  const predictions = aiResult.aiUsed && aiResult.predictions?.length > 0
    ? [...(logicResult.predictions || []), ...aiResult.predictions].filter(
        (v, i, a) => a.indexOf(v) === i  // deduplicate by exact match
      )
    : (logicResult.predictions || []);

  // Scam type resolution
  const scamType = resolveScamType(aiResult.scamType, logicResult.scamType);

  // Seller insights: keep logic insights + append AI sellerBehavior as an insight
  const sellerInsights = [...(logicResult.sellerInsights || [])];
  if (aiResult.aiUsed && aiResult.sellerBehavior && aiResult.sellerBehavior !== "Unavailable") {
    sellerInsights.push(`🤖 AI Assessment: ${aiResult.sellerBehavior}`);
  }

  // AI Insights block (new – exposed to frontend)
  const aiInsights = aiResult.aiUsed
    ? {
        scamType:      aiResult.scamType,
        sellerBehavior:aiResult.sellerBehavior,
        predictions:   aiResult.predictions,
        riskScore:     aiResult.riskScore,
        confidence:    aiResult.confidence
      }
    : null;

  return {
    scamScore,
    riskLevel,
    confidence,
    breakdown:     logicResult.breakdown     || {},
    weights:       logicResult.weights       || {},
    explanations,
    predictions,
    scamType,
    sellerInsights,
    aiUsed:        aiResult.aiUsed   ?? false,
    aiInsights
  };
};

module.exports = { mergeResults, getRiskLevel };
