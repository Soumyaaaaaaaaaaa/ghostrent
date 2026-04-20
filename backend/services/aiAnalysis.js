/**
 * AI ANALYSIS SERVICE
 *
 * Calls the Groq LLM API with a structured prompt built from listing data.
 * Always returns a safe, predictable object — even if the API fails.
 *
 * Pipeline:
 *  1. Build prompt  (promptBuilder)
 *  2. Call Groq API (fetch)
 *  3. Parse JSON safely
 *  4. Return structured result or fallback
 */

const { buildAIPrompt } = require("../utils/promptBuilder");

// Load env vars (dotenv should already be initialised in server.js)
const API_URL = process.env.GROQ_API_URL || "https://api.groq.com/openai/v1/chat/completions";
const API_KEY = process.env.GROQ_API_KEY || "";
const MODEL   = process.env.GROQ_MODEL   || "llama3-8b-8192";

/**
 * The fallback object returned whenever AI analysis cannot be completed.
 */
const AI_FALLBACK = {
  aiUsed:        false,
  fallback:      true,
  riskScore:     null,
  scamType:      "Unknown",
  reasons:       [],
  predictions:   [],
  sellerBehavior:"Unavailable",
  confidence:    0
};

/**
 * Safely parse JSON from an AI response string.
 * Handles cases where the model wraps JSON in markdown code fences.
 *
 * @param {string} rawText - Raw string returned by the AI
 * @returns {object|null}  - Parsed object or null on failure
 */
const safeParseJSON = (rawText = "") => {
  try {
    // Strip markdown code fences if present  (```json ... ```)
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    // Basic shape validation
    if (typeof parsed !== "object" || parsed === null)  return null;
    if (typeof parsed.riskScore !== "number")           return null;

    return parsed;
  } catch {
    return null;
  }
};

/**
 * Call the Groq LLM API.
 *
 * @param {string} prompt  - The full prompt string
 * @returns {string}       - Raw response text from the model
 */
const callGroqAPI = async (prompt) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model:       MODEL,
      messages:    [{ role: "user", content: prompt }],
      temperature: 0.2,         // low temp → more deterministic, less hallucination
      max_tokens:  600,
      response_format: { type: "json_object" }  // Groq supports this for JSON mode
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "unknown error");
    throw new Error(`Groq API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? "";
};

/**
 * Run AI analysis on a listing.
 *
 * @param {object} input
 * @param {string} input.description
 * @param {string} input.title
 * @param {string} input.chat
 * @param {number} input.price
 * @param {string} input.location
 * @param {object} input.logicFlags   - Already detected signals from logic pipeline
 * @returns {object} Structured AI result or fallback
 */
const runAIAnalysis = async (input = {}) => {
  // If no API key is configured, skip AI and use fallback immediately
  if (!API_KEY) {
    console.warn("[aiAnalysis] No GROQ_API_KEY set — skipping AI analysis.");
    return { ...AI_FALLBACK, reasons: ["AI key not configured."] };
  }

  try {
    const prompt  = buildAIPrompt(input);
    const rawText = await callGroqAPI(prompt);
    const parsed  = safeParseJSON(rawText);

    if (!parsed) {
      console.warn("[aiAnalysis] Could not parse AI response as JSON:", rawText?.slice(0, 200));
      return { ...AI_FALLBACK };
    }

    // Normalise and clamp numeric fields so downstream code can trust them
    return {
      aiUsed:        true,
      fallback:      false,
      riskScore:     Math.min(100, Math.max(0, Math.round(parsed.riskScore  ?? 50))),
      scamType:      typeof parsed.scamType       === "string" ? parsed.scamType       : "Unknown",
      reasons:       Array.isArray(parsed.reasons)             ? parsed.reasons        : [],
      predictions:   Array.isArray(parsed.predictions)         ? parsed.predictions    : [],
      sellerBehavior:typeof parsed.sellerBehavior === "string" ? parsed.sellerBehavior : "No assessment available.",
      confidence:    Math.min(100, Math.max(0, Math.round(parsed.confidence ?? 50)))
    };

  } catch (err) {
    console.error("[aiAnalysis] API call failed:", err.message);
    return { ...AI_FALLBACK };
  }
};

module.exports = { runAIAnalysis };
