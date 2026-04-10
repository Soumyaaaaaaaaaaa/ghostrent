/**
 * TEXT RISK SERVICE
 *
 * Scans the listing title and description for:
 *  - Scam keywords (urgency, military, payment pressure, etc.)
 *  - Sentiment of desperation or manipulation
 *  - Suspicious writing patterns (ALL CAPS, excessive punctuation)
 *  - Missing details (very short descriptions)
 *
 * Also classifies the scam type based on keyword clusters.
 */

const { SCAM_KEYWORDS, PRESSURE_TACTICS, ADVANCE_PAYMENT_PHRASES, FAKE_BROKER_PHRASES } = require("../data/areaPrices");
const { countKeywordMatches, normalizeText, clamp } = require("../utils/helpers");

/**
 * Detect which scam type is most likely based on keyword clusters.
 */
const detectScamType = (text = "") => {
  const lower = normalizeText(text);

  const advancePaymentMatches = ADVANCE_PAYMENT_PHRASES.filter((p) => lower.includes(normalizeText(p)));
  const fakeBrokerMatches = FAKE_BROKER_PHRASES.filter((p) => lower.includes(normalizeText(p)));
  const militaryMatches = ["army", "military", "navy", "deployed", "overseas", "abroad"].filter((p) =>
    lower.includes(p)
  );

  const scores = {
    "advance_payment_scam": advancePaymentMatches.length * 3,
    "fake_broker_scam": fakeBrokerMatches.length * 3,
    "military_scam": militaryMatches.length * 4,
    "unknown": 0
  };

  const topType = Object.entries(scores).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  return {
    type: topType,
    confidence: Math.min((scores[topType] / 12) * 100, 95),
    matchedPhrases: { advancePaymentMatches, fakeBrokerMatches, militaryMatches }
  };
};

/**
 * Analyze title + description text for scam indicators.
 * @param {string} title
 * @param {string} description
 * @returns {{ score: number, explanations: string[], scamType: object, details: object }}
 */
const analyzeText = (title = "", description = "") => {
  const combined = `${title} ${description}`;
  const explanations = [];
  let riskScore = 0;

  // --- Scam keyword matches ---
  const { count: kwCount, matched: kwMatched } = countKeywordMatches(combined, SCAM_KEYWORDS);

  if (kwCount >= 5) {
    riskScore += 65;
    explanations.push(`🚨 Found ${kwCount} scam keywords: "${kwMatched.slice(0, 5).join('", "')}..."`);
  } else if (kwCount >= 3) {
    riskScore += 40;
    explanations.push(`⚠️ Found ${kwCount} suspicious keywords: "${kwMatched.join('", "')}"`);
  } else if (kwCount >= 1) {
    riskScore += 15;
    explanations.push(`💡 Found ${kwCount} mild red-flag word(s): "${kwMatched.join('", "')}"`);
  } else {
    explanations.push("✅ No scam-related keywords detected in the listing text.");
  }

  // --- ALL CAPS abuse ---
  const capsWordsRatio =
    (combined.match(/\b[A-Z]{3,}\b/g) || []).length / Math.max(combined.split(" ").length, 1);
  if (capsWordsRatio > 0.25) {
    riskScore += 15;
    explanations.push("⚠️ Excessive CAPS LOCK usage — a common tactic to create urgency.");
  }

  // --- Excessive exclamation or question marks ---
  const exclamationCount = (combined.match(/!/g) || []).length;
  if (exclamationCount > 5) {
    riskScore += 10;
    explanations.push(`⚠️ ${exclamationCount} exclamation marks detected — unusual for a professional listing.`);
  }

  // --- Very short description ---
  if (description.trim().length < 30) {
    riskScore += 20;
    explanations.push("⚠️ Description is very short — legitimate listings usually provide detailed information.");
  }

  // --- Missing title ---
  if (!title.trim()) {
    riskScore += 15;
    explanations.push("❌ No listing title provided.");
  }

  const scamType = detectScamType(combined);

  return {
    score: clamp(riskScore),
    explanations,
    scamType,
    details: {
      keywordsFound: kwMatched,
      keywordCount: kwCount,
      descriptionLength: description.length,
      capsRatio: capsWordsRatio.toFixed(2)
    }
  };
};

module.exports = { analyzeText, detectScamType };
