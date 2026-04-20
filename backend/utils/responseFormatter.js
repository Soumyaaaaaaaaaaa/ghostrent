/**
 * RESPONSE FORMATTER
 *
 * Combines logic-pipeline explanations with AI-generated reasons.
 * Removes near-duplicates and returns a clean, ordered list.
 */

/**
 * Normalize a string for deduplication comparison.
 * Lower-cases, strips punctuation/emoji, collapses whitespace.
 */
const normalizeForCompare = (str = "") =>
  str
    .toLowerCase()
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "") // remove emoji
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Check if two explanation strings are "near duplicates"
 * using simple word-overlap ratio.
 */
const areSimilar = (a, b, threshold = 0.6) => {
  const wordsA = new Set(normalizeForCompare(a).split(" ").filter(Boolean));
  const wordsB = new Set(normalizeForCompare(b).split(" ").filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return false;

  const intersection = [...wordsA].filter((w) => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  return intersection.length / union.size >= threshold;
};

/**
 * Merge and deduplicate two arrays of explanation strings.
 * Logic explanations come first (they are primary).
 * AI reasons are appended only if they add new information.
 *
 * @param {string[]} logicExplanations
 * @param {string[]} aiReasons
 * @returns {string[]} cleaned combined list
 */
const mergeExplanations = (logicExplanations = [], aiReasons = []) => {
  const combined = [...logicExplanations];

  for (const aiReason of aiReasons) {
    if (!aiReason || typeof aiReason !== "string") continue;

    // Skip if it's too similar to an already-included explanation
    const isDuplicate = combined.some((existing) =>
      areSimilar(existing, aiReason)
    );

    if (!isDuplicate) {
      // Prefix AI reasons with a brain emoji to distinguish source visually
      combined.push(`🤖 ${aiReason.trim()}`);
    }
  }

  return combined.filter(Boolean);
};

/**
 * Format the full API response object cleanly.
 * Strips undefined/null fields and ensures arrays are always arrays.
 *
 * @param {object} mergedData  - Output from mergeEngine
 * @returns {object}           - Clean response object
 */
const formatFinalResponse = (mergedData = {}) => {
  return {
    scamScore:     mergedData.scamScore     ?? 0,
    riskLevel:     mergedData.riskLevel     ?? "Low",
    confidence:    mergedData.confidence    ?? 0,
    breakdown:     mergedData.breakdown     ?? {},
    weights:       mergedData.weights       ?? {},
    explanations:  Array.isArray(mergedData.explanations)  ? mergedData.explanations  : [],
    predictions:   Array.isArray(mergedData.predictions)   ? mergedData.predictions   : [],
    scamType:      mergedData.scamType      ?? { type: "unknown", confidence: 0 },
    sellerInsights: Array.isArray(mergedData.sellerInsights) ? mergedData.sellerInsights : [],
    aiUsed:        mergedData.aiUsed        ?? false,
    aiInsights:    mergedData.aiInsights    ?? null
  };
};

module.exports = { mergeExplanations, formatFinalResponse, normalizeForCompare };
