/**
 * ANALYSIS SERVICE — Hybrid Scam Detection Engine
 *
 * Architecture:
 *   Deterministic Engine (70% weight)
 *     ├── Text Risk      — scam keyword detection
 *     ├── Price Risk     — compare rent vs city averages
 *     ├── Duplicate Risk — repeated phrase / template detection
 *     └── Seller Risk    — suspicious contact patterns
 *
 *   AI Engine (30% weight)
 *     └── Groq / LLaMA 3 — natural-language scam reasoning
 *
 * Final Score:
 *   scamScore = (textRisk + priceRisk + duplicateRisk + sellerRisk) * 0.7
 *               + (aiConfidence * 100) * 0.3
 *
 * Risk Levels:
 *   0–30  → Low
 *   31–70 → Medium
 *   71–100→ High
 */

require("dotenv").config();

const { normalizeText, countKeywordMatches, validatePhone, validateEmail, jaccardSimilarity, clamp } =
  require("../utils/helpers");

// ─── Constants ────────────────────────────────────────────────────────────────

const SCAM_KEYWORDS = [
  "urgent", "urgently", "act now", "hurry", "limited time",
  "deposit", "advance payment", "pay first", "western union", "money gram",
  "army", "military", "navy", "deployed", "overseas", "abroad",
  "no visit", "cannot visit", "unable to show", "only online",
  "god fearing", "god bless", "trustworthy person",
  "mail the key", "send the keys", "post the keys",
  "guaranteed", "100% genuine", "100% legit",
  "whatsapp only", "email only", "contact via email",
];

const CITY_AVERAGES = {
  mumbai:     { avg: 35000, min: 12000, max: 120000 },
  delhi:      { avg: 22000, min: 8000,  max: 80000  },
  bangalore:  { avg: 25000, min: 8000,  max: 90000  },
  bengaluru:  { avg: 25000, min: 8000,  max: 90000  },
  hyderabad:  { avg: 18000, min: 6000,  max: 70000  },
  pune:       { avg: 18000, min: 6000,  max: 65000  },
  chennai:    { avg: 16000, min: 5000,  max: 60000  },
  kolkata:    { avg: 12000, min: 4000,  max: 45000  },
  ahmedabad:  { avg: 12000, min: 4000,  max: 40000  },
  gurgaon:    { avg: 28000, min: 10000, max: 90000  },
  noida:      { avg: 20000, min: 7000,  max: 70000  },
  default:    { avg: 15000, min: 4000,  max: 60000  },
};

// In-memory duplicate fingerprint store (supplement to DB history)
const recentDescriptions = [];
const MAX_RECENT = 200;

// ─── Risk Level Helper ────────────────────────────────────────────────────────

const getRiskLevel = (score) => {
  if (score >= 71) return "High";
  if (score >= 31) return "Medium";
  return "Low";
};

// ─── 1. TEXT RISK ─────────────────────────────────────────────────────────────

/**
 * Detect scam keywords and writing patterns in listing text.
 * Returns a 0–100 risk score.
 */
const analyzeTextRisk = (title = "", description = "", chat = "") => {
  const combined = `${title} ${description} ${chat}`;
  let score = 0;
  const flags = [];

  // Keyword matches
  const { count, matched } = countKeywordMatches(combined, SCAM_KEYWORDS);
  if (count >= 5) {
    score += 70;
    flags.push(`🚨 ${count} scam keywords detected: "${matched.slice(0, 5).join('", "')}"`);
  } else if (count >= 3) {
    score += 45;
    flags.push(`⚠️ ${count} suspicious keywords found: "${matched.join('", "')}"`);
  } else if (count >= 1) {
    score += 20;
    flags.push(`💡 ${count} mild red-flag keyword(s): "${matched.join('", "')}"`);
  } else {
    flags.push("✅ No scam keywords detected in listing text.");
  }

  // ALL CAPS abuse
  const words = combined.split(/\s+/).filter(Boolean);
  const capsRatio = words.filter((w) => /^[A-Z]{3,}$/.test(w)).length / Math.max(words.length, 1);
  if (capsRatio > 0.25) {
    score += 15;
    flags.push("⚠️ Excessive CAPS LOCK usage — common scam urgency tactic.");
  }

  // Excessive exclamation marks
  const exclamations = (combined.match(/!/g) || []).length;
  if (exclamations > 5) {
    score += 10;
    flags.push(`⚠️ ${exclamations} exclamation marks — unprofessional and pressuring tone.`);
  }

  // Very short description
  if (description.trim().length < 30 && description.trim().length > 0) {
    score += 15;
    flags.push("⚠️ Description is very short — legitimate listings provide full details.");
  }

  // Detect scam type
  const lower = normalizeText(combined);
  let scamType = "unknown";
  if (["army", "military", "navy", "deployed", "overseas"].some((w) => lower.includes(w))) {
    scamType = "military_scam";
  } else if (["advance", "deposit", "pay first", "western union"].some((w) => lower.includes(w))) {
    scamType = "advance_payment_scam";
  } else if (["broker", "agent", "commission", "referral fee"].some((w) => lower.includes(w))) {
    scamType = "fake_broker_scam";
  }

  return { score: clamp(score), flags, scamType, keywordsMatched: matched };
};

// ─── 2. PRICE RISK ────────────────────────────────────────────────────────────

/**
 * Compare rent vs city-level market averages.
 * Returns a 0–100 risk score.
 */
const analyzePriceRisk = (price = 0, location = "") => {
  const flags = [];
  let score = 0;

  if (!price || isNaN(price) || price <= 0) {
    flags.push("❌ Price is missing or zero — a common bait tactic.");
    return { score: 50, flags };
  }

  const locLower = normalizeText(location);
  const cityKey = Object.keys(CITY_AVERAGES).find(
    (k) => k !== "default" && locLower.includes(k)
  ) || "default";

  const { avg, min, max } = CITY_AVERAGES[cityKey];
  const label = cityKey === "default" ? "Indian cities" : cityKey;

  if (price < min * 0.5) {
    score += 75;
    flags.push(`🚨 ₹${price.toLocaleString()} is extremely low for ${label} (min ₹${min.toLocaleString()}). Classic bait pricing.`);
  } else if (price < min) {
    score += 45;
    flags.push(`⚠️ ₹${price.toLocaleString()} is below market minimum for ${label} (avg ₹${avg.toLocaleString()}).`);
  } else if (price < avg * 0.6) {
    score += 20;
    flags.push(`💡 ₹${price.toLocaleString()} is significantly below the ${label} average of ₹${avg.toLocaleString()}.`);
  } else if (price > max * 2) {
    score += 10;
    flags.push(`📈 ₹${price.toLocaleString()} seems unusually high for ${label}. Verify before contacting.`);
  } else {
    flags.push(`✅ ₹${price.toLocaleString()} is within expected range for ${label} (avg ₹${avg.toLocaleString()}).`);
  }

  return { score: clamp(score), flags };
};

// ─── 3. DUPLICATE RISK ───────────────────────────────────────────────────────

/**
 * Detect repeated phrases / template language across recent submissions.
 * Returns a 0–100 risk score.
 */
const analyzeDuplicateRisk = (title = "", description = "") => {
  const flags = [];
  let score = 0;
  const combined = `${title} ${description}`;

  if (recentDescriptions.length === 0) {
    flags.push("ℹ️ No previous submissions to compare — this is the first analysis.");
    return { score: 0, flags };
  }

  let maxSim = 0;
  for (const prev of recentDescriptions) {
    const sim = jaccardSimilarity(combined, prev);
    if (sim > maxSim) maxSim = sim;
  }

  if (maxSim > 0.85) {
    score += 75;
    flags.push(`🚨 Near-identical listing detected (${(maxSim * 100).toFixed(0)}% match) — repost scam pattern.`);
  } else if (maxSim > 0.65) {
    score += 50;
    flags.push(`⚠️ Very similar listing found (${(maxSim * 100).toFixed(0)}% match) — possible duplicate.`);
  } else if (maxSim > 0.45) {
    score += 20;
    flags.push(`💡 Moderate similarity (${(maxSim * 100).toFixed(0)}%) with a previous submission.`);
  } else {
    flags.push("✅ No suspiciously similar listings detected.");
  }

  // Store current for future comparison
  recentDescriptions.unshift(combined);
  if (recentDescriptions.length > MAX_RECENT) recentDescriptions.length = MAX_RECENT;

  return { score: clamp(score), flags };
};

// ─── 4. SELLER RISK ───────────────────────────────────────────────────────────

/**
 * Analyze seller contact patterns for suspicious signals.
 * Returns a 0–100 risk score.
 */
const analyzeSellerRisk = (contact = "") => {
  const flags = [];
  let score = 0;

  if (!contact || !contact.trim()) {
    flags.push("❌ No contact information — legitimate sellers always share details.");
    return { score: 50, flags };
  }

  // Extract phone and email from contact string
  const emailMatch = contact.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  const email = emailMatch?.[0] || "";
  const phone = contact.replace(email, "").trim();

  const phoneResult = validatePhone(phone);
  const emailResult = validateEmail(email);

  if (phone) {
    if (!phoneResult.valid) {
      score += 30;
      flags.push(`📵 Phone issue: ${phoneResult.reason}`);
    } else {
      flags.push("✅ Phone number looks valid.");
    }
  }

  if (email) {
    if (!emailResult.valid || emailResult.suspicious) {
      score += 35;
      flags.push(`📧 Email issue: ${emailResult.reason}`);
    } else {
      flags.push("✅ Email address looks valid.");
    }
  }

  if (!phone && !email) {
    score += 20;
    flags.push("⚠️ Contact format is unrecognized — could not extract phone or email.");
  }

  if (score === 0) {
    flags.push("✅ Seller contact appears credible with no red flags.");
  }

  return { score: clamp(score), flags };
};

// ─── 5. AI ENGINE ────────────────────────────────────────────────────────────

const AI_URL   = process.env.GROQ_API_URL || "https://api.groq.com/openai/v1/chat/completions";
const AI_KEY   = process.env.GROQ_API_KEY || "";
const AI_MODEL = process.env.GROQ_MODEL   || "llama3-8b-8192";

const AI_FALLBACK = {
  aiUsed: false,
  riskScore: null,
  scamType: "Unknown",
  explanations: [],
  predictions: [],
  confidence: 0,
  sellerInsights: "AI analysis unavailable.",
};

const safeParseJSON = (raw = "") => {
  try {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    if (typeof parsed !== "object" || parsed === null) return null;
    if (typeof parsed.riskScore !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
};

const buildPrompt = ({ title, description, chat, price, location }) => `You are an expert rental scam detection system for India.

Analyze the following rental listing carefully.

=== LISTING ===
Title: ${title || "Not provided"}
Description: ${description || "Not provided"}
Asking Rent: ₹${price || 0}/month
Location: ${location || "Not provided"}

=== SELLER CONVERSATION ===
${chat || "No conversation provided."}

=== TASK ===
1. Identify scam indicators in the text.
2. Classify the scam type: advance_payment_scam | fake_broker_scam | military_scam | phishing_scam | None
3. Predict what a scammer would do next (if applicable).
4. Summarize seller behavior in one sentence.
5. Give a risk score (0 = safe, 100 = definite scam).
6. Give your confidence in your assessment (0–100).

Return ONLY valid JSON — no markdown, no explanation:
{
  "riskScore": <number 0-100>,
  "scamType": "<string>",
  "explanations": ["<reason 1>", "<reason 2>"],
  "predictions": ["<next step 1>", "<next step 2>"],
  "sellerInsights": "<one sentence about seller behavior>",
  "confidence": <number 0-100>
}`;

const callAI = async (input) => {
  if (!AI_KEY) {
    console.warn("[AI] No GROQ_API_KEY — skipping AI analysis.");
    return { ...AI_FALLBACK, explanations: ["AI key not configured."] };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout

    const res = await fetch(AI_URL, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${AI_KEY}`,
      },
      body: JSON.stringify({
        model:           AI_MODEL,
        messages:        [{ role: "user", content: buildPrompt(input) }],
        temperature:     0.2,
        max_tokens:      600,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown");
      throw new Error(`Groq API ${res.status}: ${errText}`);
    }

    const data   = await res.json();
    const raw    = data?.choices?.[0]?.message?.content ?? "";
    const parsed = safeParseJSON(raw);

    if (!parsed) {
      console.warn("[AI] Could not parse response:", raw.slice(0, 200));
      return { ...AI_FALLBACK, explanations: ["AI response parsing failed."] };
    }

    return {
      aiUsed:         true,
      riskScore:      clamp(Math.round(parsed.riskScore ?? 50)),
      scamType:       typeof parsed.scamType === "string" ? parsed.scamType : "Unknown",
      explanations:   Array.isArray(parsed.explanations)  ? parsed.explanations  : [],
      predictions:    Array.isArray(parsed.predictions)   ? parsed.predictions   : [],
      sellerInsights: typeof parsed.sellerInsights === "string" ? parsed.sellerInsights : "No assessment.",
      confidence:     clamp(Math.round(parsed.confidence ?? 50)),
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error("[AI] API Request timed out after 8 seconds.");
      return { ...AI_FALLBACK, explanations: ["AI analysis timed out. Falling back to rules engine."] };
    }
    console.error("[AI] Call failed:", err.message);
    return { ...AI_FALLBACK, explanations: ["AI analysis failed. Falling back to rules engine."] };
  }
};

// ─── 6. HYBRID MERGE ─────────────────────────────────────────────────────────

/**
 * Merge deterministic + AI scores using the 70/30 weight policy.
 *
 * @param {object} det   - { textRisk, priceRisk, duplicateRisk, sellerRisk, allFlags, scamType }
 * @param {object} ai    - AI engine result
 * @returns {object}     - Final merged result
 */
const mergeScores = (det, ai) => {
  const { textRisk, priceRisk, duplicateRisk, sellerRisk } = det;

  // Deterministic aggregate (average of four sub-scores)
  const detAggregate = (textRisk + priceRisk + duplicateRisk + sellerRisk) / 4;

  // Final score: 70% logic + 30% AI (or 100% logic if AI failed)
  const finalScore = ai.aiUsed
    ? Math.round(detAggregate * 0.7 + (ai.riskScore) * 0.3)
    : Math.round(detAggregate);

  const scamScore = clamp(finalScore);
  const riskLevel = getRiskLevel(scamScore);

  // Merge explanations (logic first, then non-duplicate AI explanations)
  const explanations = [...det.allFlags];
  for (const aiExp of (ai.explanations || [])) {
    if (!aiExp || typeof aiExp !== "string") continue;
    const lower = aiExp.toLowerCase();
    const isDupe = explanations.some((e) =>
      e.toLowerCase().split(" ").filter((w) => w.length > 4).some((w) => lower.includes(w))
    );
    if (!isDupe) explanations.push(`🤖 ${aiExp.trim()}`);
  }

  // Mixed-signal notice
  if (ai.aiUsed && Math.abs(detAggregate - ai.riskScore) > 30) {
    explanations.push("⚖️ Logic and AI engines reached different conclusions — manual review recommended.");
  }

  // Resolve scam type (prefer logic, confirm with AI)
  let scamType = det.scamType || "unknown";
  if (ai.aiUsed && ai.scamType && ai.scamType !== "Unknown" && ai.scamType !== "None") {
    if (scamType === "unknown") scamType = ai.scamType.toLowerCase().replace(/\s+/g, "_");
  }

  // Confidence
  let confidence = 40;
  if (ai.aiUsed) confidence += 20 + Math.round(ai.confidence * 0.3);
  else confidence -= 10;
  confidence = clamp(confidence, 0, 97);

  return {
    scamScore,
    riskLevel,
    confidence,
    breakdown: {
      textRisk:      Math.round(textRisk),
      priceRisk:     Math.round(priceRisk),
      duplicateRisk: Math.round(duplicateRisk),
      sellerRisk:    Math.round(sellerRisk),
    },
    insights: {
      explanations,
      predictions:    ai.aiUsed ? (ai.predictions || []) : [],
      scamType,
      sellerInsights: ai.aiUsed ? (ai.sellerInsights || "") : "AI insights unavailable.",
    },
    aiUsed: ai.aiUsed ?? false,
  };
};

// ─── 7. MAIN EXPORTED FUNCTION ───────────────────────────────────────────────

/**
 * Run the full hybrid analysis pipeline on a text-based rental listing.
 *
 * @param {{ url, description, chat, price, location, contact }} input
 * @returns {Promise<object>} Structured analysis result
 */
const runAnalysis = async (input = {}) => {
  const {
    url         = "",
    description = "",
    chat        = "",
    price       = 0,
    location    = "",
    contact     = "",
  } = input;

  // Title / heading comes in as `url` (per spec mapping)
  const title = url;

  // ── Deterministic pipeline ────────────────────────────────────────────────
  const textResult      = analyzeTextRisk(title, description, chat);
  const priceResult     = analyzePriceRisk(Number(price) || 0, location);
  const duplicateResult = analyzeDuplicateRisk(title, description);
  const sellerResult    = analyzeSellerRisk(contact);

  const det = {
    textRisk:      textResult.score,
    priceRisk:     priceResult.score,
    duplicateRisk: duplicateResult.score,
    sellerRisk:    sellerResult.score,
    scamType:      textResult.scamType,
    allFlags: [
      ...textResult.flags,
      ...priceResult.flags,
      ...duplicateResult.flags,
      ...sellerResult.flags,
    ],
  };

  // ── AI pipeline ───────────────────────────────────────────────────────────
  const ai = await callAI({ title, description, chat, price: Number(price) || 0, location });

  // ── Merge ─────────────────────────────────────────────────────────────────
  return mergeScores(det, ai);
};

module.exports = { runAnalysis, getRiskLevel };
