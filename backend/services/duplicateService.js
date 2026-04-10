/**
 * DUPLICATE DETECTION SERVICE
 *
 * Compares the incoming listing against all previous scans stored in memory.
 * Uses Jaccard similarity on title and description to detect copy-paste listings.
 *
 * Scammers frequently repost the same listing with minor changes to stay
 * under the radar — this catches them.
 *
 * Risk flags:
 *  - Title similarity > 85% with a previous scan → very high risk
 *  - Title + description combined average similarity > 70% → high risk
 *  - Moderate overlap (50–70%) → medium risk, flag for review
 */

const { jaccardSimilarity, clamp } = require("../utils/helpers");
const store = require("./memoryStore");

/**
 * Analyze a listing for duplicates against scan history.
 * @param {string} title
 * @param {string} description
 * @returns {{ score: number, explanations: string[], details: object }}
 */
const analyzeDuplicates = (title = "", description = "") => {
  const explanations = [];
  let riskScore = 0;

  const history = store.getHistory();

  if (history.length === 0) {
    explanations.push("ℹ️ No previous scans to compare against — this is the first listing.");
    return { score: 0, explanations, details: { duplicatesFound: 0 } };
  }

  let maxTitleSim = 0;
  let maxDescSim = 0;
  let closestMatch = null;

  for (const scan of history) {
    const prevTitle = scan.input?.title || "";
    const prevDesc = scan.input?.description || "";

    const titleSim = jaccardSimilarity(title, prevTitle);
    const descSim = jaccardSimilarity(description, prevDesc);

    if (titleSim > maxTitleSim) {
      maxTitleSim = titleSim;
      maxDescSim = descSim;
      closestMatch = {
        scanId: scan.id,
        scannedAt: scan.scannedAt,
        prevTitle
      };
    }
  }

  const combinedSim = (maxTitleSim * 0.6 + maxDescSim * 0.4);

  if (maxTitleSim > 0.85) {
    riskScore += 75;
    explanations.push(`🚨 Near-identical listing found (${(maxTitleSim * 100).toFixed(0)}% title match) — potential repost scam.`);
  } else if (combinedSim > 0.7) {
    riskScore += 55;
    explanations.push(`⚠️ Very similar listing found (${(combinedSim * 100).toFixed(0)}% overall match) — possible duplicate.`);
  } else if (combinedSim > 0.5) {
    riskScore += 25;
    explanations.push(`💡 Listing has moderate similarity (${(combinedSim * 100).toFixed(0)}%) with a previous scan.`);
  } else {
    explanations.push("✅ No suspiciously similar listings found in scan history.");
  }

  return {
    score: clamp(riskScore),
    explanations,
    details: {
      previousScansChecked: history.length,
      maxTitleSimilarity: (maxTitleSim * 100).toFixed(1) + "%",
      maxDescriptionSimilarity: (maxDescSim * 100).toFixed(1) + "%",
      combinedSimilarity: (combinedSim * 100).toFixed(1) + "%",
      closestMatch
    }
  };
};

module.exports = { analyzeDuplicates };
