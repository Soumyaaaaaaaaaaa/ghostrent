/**
 * PRICE RISK SERVICE
 *
 * Checks whether the listing price is suspicious by comparing it
 * against hardcoded market benchmarks for known cities/areas.
 *
 * Risk flags:
 *  - Price is more than 50% below area average (too cheap = bait)
 *  - Price is 0 or negative (invalid entry)
 *  - Location not found in dataset (can't validate)
 *  - Price is astronomically high (could be typo, but flag lightly)
 */

const { AREA_PRICES } = require("../data/areaPrices");
const { normalizeText, clamp } = require("../utils/helpers");

/**
 * Detect the city/area from a location string.
 * Returns the matched key from AREA_PRICES or "default".
 */
const detectArea = (location = "") => {
  const lower = normalizeText(location);
  for (const city of Object.keys(AREA_PRICES)) {
    if (city !== "default" && lower.includes(city)) {
      return city;
    }
  }
  return "default";
};

/**
 * Analyze price risk.
 * @param {number} price - Monthly rent in INR (or local currency)
 * @param {string} location - Location string from listing
 * @returns {{ score: number, explanations: string[], details: object }}
 */
const analyzePrice = (price, location = "") => {
  const explanations = [];
  let riskScore = 0;

  // --- Invalid price ---
  if (!price || typeof price !== "number" || price <= 0) {
    explanations.push("❌ Price is missing or invalid — this is a red flag.");
    return { score: 50, explanations, details: { price, area: "unknown" } };
  }

  const area = detectArea(location);
  const benchmark = AREA_PRICES[area];

  const details = {
    price,
    area,
    benchmark,
    percentBelowAvg: null,
    percentAboveAvg: null
  };

  if (area === "default") {
    explanations.push(`📍 Location "${location}" not in our database. Price validation limited.`);
    riskScore += 10;
  }

  const percentOfAvg = (price / benchmark.avg) * 100;
  details.percentBelowAvg = Math.max(0, 100 - percentOfAvg).toFixed(1);
  details.percentAboveAvg = Math.max(0, percentOfAvg - 100).toFixed(1);

  // --- Too cheap (bait pricing) ---
  if (price < benchmark.min * 0.5) {
    riskScore += 70;
    explanations.push(
      `🚨 Price ₹${price.toLocaleString()} is extremely low for ${area} (expected min ₹${benchmark.min.toLocaleString()}). Classic bait scam.`
    );
  } else if (price < benchmark.min) {
    riskScore += 40;
    explanations.push(
      `⚠️ Price ₹${price.toLocaleString()} is below market minimum for ${area} (avg ₹${benchmark.avg.toLocaleString()}). Too good to be true?`
    );
  } else if (price < benchmark.avg * 0.6) {
    riskScore += 20;
    explanations.push(
      `💡 Price ₹${price.toLocaleString()} is significantly below the ${area} average of ₹${benchmark.avg.toLocaleString()}.`
    );
  } else if (price > benchmark.max * 2) {
    // Extremely high — possible typo or joke listing
    riskScore += 15;
    explanations.push(
      `📈 Price ₹${price.toLocaleString()} seems unusually high for ${area}. Verify before contacting.`
    );
  } else {
    explanations.push(
      `✅ Price ₹${price.toLocaleString()} is within the expected range for ${area} (avg ₹${benchmark.avg.toLocaleString()}).`
    );
  }

  return { score: clamp(riskScore), explanations, details };
};

module.exports = { analyzePrice, detectArea };
