/**
 * PROMPT BUILDER
 *
 * Builds a structured prompt for the AI fraud-detection model.
 * Input is listing data + logic-derived flags.
 * Output is a string prompt that forces JSON-only AI response.
 */

/**
 * Build the AI analysis prompt.
 *
 * @param {object} data
 * @param {string} data.description   - Listing description text
 * @param {string} data.title         - Listing title
 * @param {string} data.chat          - Chat/conversation text with seller
 * @param {number} data.price         - Asking rent in INR
 * @param {string} data.location      - Location string
 * @param {object} data.logicFlags    - Key signals detected by logic pipeline
 * @returns {string} The full prompt string to send to the LLM
 */
const buildAIPrompt = (data = {}) => {
  const {
    description = "",
    title = "",
    chat = "",
    price = 0,
    location = "",
    logicFlags = {}
  } = data;

  // Summarise logic flags into readable bullet points for context
  const flagLines = Object.entries(logicFlags)
    .map(([key, val]) => `  - ${key}: ${JSON.stringify(val)}`)
    .join("\n");

  const prompt = `You are an expert fraud detection system specialising in rental scam analysis in India.

Analyse the following rental listing and provide a detailed scam risk assessment.

=== LISTING DETAILS ===
Title: ${title || "Not provided"}
Description: ${description || "Not provided"}
Asking Rent: ₹${price || 0}/month
Location: ${location || "Not provided"}

=== SELLER CONVERSATION ===
${chat ? chat : "No chat messages provided."}

=== SIGNALS DETECTED BY LOGIC ENGINE ===
${flagLines || "  No logic flags available."}

=== YOUR TASK ===
1. Detect scam patterns in the listing text and conversation.
2. Classify the scam type (e.g. advance_payment_scam, fake_broker_scam, military_scam, phishing_scam, or "None" if legitimate).
3. Predict the next steps a scammer would likely take if this is a scam.
4. Evaluate the seller's communication behaviour (e.g. pressuring, evasive, professional, etc.).
5. Provide a risk score from 0 (definitely safe) to 100 (definitely a scam).
6. Provide a confidence score for your own assessment from 0 to 100.

Return ONLY valid JSON. No explanation, no markdown, no extra text. Use exactly this structure:

{
  "riskScore": <number 0-100>,
  "scamType": "<string: scam type or None>",
  "reasons": ["<string reason 1>", "<string reason 2>"],
  "predictions": ["<string predicted next step 1>", "<string predicted next step 2>"],
  "sellerBehavior": "<string: one paragraph describing seller communication style>",
  "confidence": <number 0-100>
}`;

  return prompt;
};

module.exports = { buildAIPrompt };
