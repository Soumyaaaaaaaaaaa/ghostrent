/**
 * SCORING ENGINE
 *
 * Aggregates risk scores from all services into a final weighted scam score.
 *
 * Weight distribution:
 *   Image Risk      → 30%
 *   Price Risk      → 25%
 *   Text Risk       → 20%
 *   Duplicate Risk  → 15%
 *   Seller Risk     → 10%
 *
 * Conversation analysis is factored in as a bonus modifier on the final score.
 *
 * Final output:
 *   scamScore  (0–100)
 *   riskLevel  (Low / Medium / High)
 *   confidence (0–100)
 */

const WEIGHTS = {
  imageRisk:     0.30,
  priceRisk:     0.25,
  textRisk:      0.20,
  duplicateRisk: 0.15,
  sellerRisk:    0.10
};

/**
 * Map a numeric scam score to a human-readable risk level.
 */
const getRiskLevel = (score) => {
  if (score >= 65) return "High";
  if (score >= 35) return "Medium";
  return "Low";
};

/**
 * Calculate confidence in the result based on how much data was provided.
 * More data = higher confidence.
 */
const calculateConfidence = (input) => {
  let confidence = 40; // baseline

  if (input.images?.length > 0)  confidence += 15;
  if (input.price > 0)            confidence += 15;
  if (input.description?.length > 50) confidence += 10;
  if (input.contact?.trim())      confidence += 10;
  if (input.chatText?.length > 20) confidence += 10;
  if (input.location?.trim())     confidence += 10;
  if (input.title?.trim())        confidence += 5;

  // Bonus: if there's scan history to compare against
  return Math.min(confidence, 97);
};

/**
 * Aggregate all sub-scores into a final weighted score.
 * @param {{ imageRisk, priceRisk, textRisk, duplicateRisk, sellerRisk }} subScores
 * @param {number} conversationBonus - Extra risk from conversation analysis (0–100)
 * @param {object} input - Original listing input (for confidence calc)
 * @returns {{ scamScore, riskLevel, confidence, breakdown }}
 */
const calculateFinalScore = (subScores, conversationBonus = 0, input = {}) => {
  const weighted =
    subScores.imageRisk     * WEIGHTS.imageRisk +
    subScores.priceRisk     * WEIGHTS.priceRisk +
    subScores.textRisk      * WEIGHTS.textRisk +
    subScores.duplicateRisk * WEIGHTS.duplicateRisk +
    subScores.sellerRisk    * WEIGHTS.sellerRisk;

  // Conversation analysis acts as a 10% modifier on the weighted score
  const withConversation = weighted + (conversationBonus * 0.10);

  const scamScore = Math.min(Math.round(withConversation), 100);
  const riskLevel = getRiskLevel(scamScore);
  const confidence = calculateConfidence(input);

  return {
    scamScore,
    riskLevel,
    confidence,
    breakdown: {
      imageRisk:     Math.round(subScores.imageRisk),
      priceRisk:     Math.round(subScores.priceRisk),
      textRisk:      Math.round(subScores.textRisk),
      duplicateRisk: Math.round(subScores.duplicateRisk),
      sellerRisk:    Math.round(subScores.sellerRisk),
      conversationRisk: Math.round(conversationBonus)
    },
    weights: WEIGHTS
  };
};

module.exports = { calculateFinalScore, getRiskLevel, calculateConfidence };
