/**
 * CONVERSATION ANALYZER SERVICE
 *
 * Analyzes the chatText field — a copy of the conversation with the "seller".
 * Detects pressure tactics, urgency manipulation, and advance payment requests.
 *
 * Also runs the "What Happens Next" Predictor — returning a predicted scam
 * flow based on what red flags were found.
 */

const { PRESSURE_TACTICS, ADVANCE_PAYMENT_PHRASES } = require("../data/areaPrices");
const { countKeywordMatches, clamp } = require("../utils/helpers");

/**
 * Predict the next steps in the scam based on current red flags.
 * @param {boolean} hasPressureTactics
 * @param {boolean} hasAdvancePayment
 * @param {string} scamType
 */
const predictScamFlow = (hasPressureTactics, hasAdvancePayment, scamType = "unknown") => {
  const predictions = [];

  if (scamType === "advance_payment_scam" || hasAdvancePayment) {
    predictions.push("💸 They will ask for a token/security deposit before you view the property.");
    predictions.push("🔑 Once paid, they'll go silent or make excuses to delay the visit.");
    predictions.push("❌ Eventually, they'll stop responding — your money is gone.");
    predictions.push("🔄 They may re-list the same property under a new name/number.");
  }

  if (scamType === "military_scam") {
    predictions.push("🎖️ They'll claim to be deployed abroad and can't show the property in person.");
    predictions.push("📦 They'll offer to 'courier the keys' after receiving rent in advance.");
    predictions.push("💸 After payment, all contact will stop.");
  }

  if (scamType === "fake_broker_scam") {
    predictions.push("👤 A 'broker' will contact you demanding a fee to arrange a viewing.");
    predictions.push("💰 They'll collect the fee and either disappear or introduce another demand.");
    predictions.push("🏠 The property may not exist or belongs to someone else entirely.");
  }

  if (hasPressureTactics && predictions.length === 0) {
    predictions.push("⏰ Expect increasing urgency messages: 'Another buyer is interested!'");
    predictions.push("💸 Will soon ask for money to 'hold' the property.");
    predictions.push("🚫 If you hesitate, they'll accuse you of wasting their time.");
  }

  if (predictions.length === 0) {
    predictions.push("✅ No concerning patterns found to predict a scam flow.");
  }

  return predictions;
};

/**
 * Analyze chatText for pressure tactics and suspicious conversation patterns.
 * @param {string} chatText
 * @param {string} scamType
 * @returns {{ score: number, explanations: string[], predictions: string[], details: object }}
 */
const analyzeConversation = (chatText = "", scamType = "unknown") => {
  const explanations = [];
  let riskScore = 0;

  if (!chatText || chatText.trim().length < 10) {
    return {
      score: 0,
      explanations: ["ℹ️ No conversation text provided — skipping chat analysis."],
      predictions: predictScamFlow(false, false, scamType),
      details: { analyzed: false }
    };
  }

  // --- Pressure tactics ---
  const { count: ptCount, matched: ptMatched } = countKeywordMatches(chatText, PRESSURE_TACTICS);
  const hasPressureTactics = ptCount > 0;

  if (ptCount >= 3) {
    riskScore += 55;
    explanations.push(`🚨 Heavy pressure tactics detected: "${ptMatched.slice(0, 3).join('", "')}"`);
  } else if (ptCount >= 1) {
    riskScore += 25;
    explanations.push(`⚠️ Pressure tactic(s) detected: "${ptMatched.join('", "')}"`);
  } else {
    explanations.push("✅ No pressure tactics found in conversation.");
  }

  // --- Advance payment requests ---
  const { count: apCount, matched: apMatched } = countKeywordMatches(chatText, ADVANCE_PAYMENT_PHRASES);
  const hasAdvancePayment = apCount > 0;

  if (apCount >= 2) {
    riskScore += 60;
    explanations.push(`🚨 Advance payment request detected: "${apMatched.join('", "')}"`);
  } else if (apCount === 1) {
    riskScore += 30;
    explanations.push(`⚠️ Payment before viewing mentioned: "${apMatched[0]}"`);
  }

  // --- Suspicious short replies (less than 20 chars average) ---
  const messages = chatText.split(/\n+/).filter((m) => m.trim().length > 0);
  if (messages.length > 3) {
    const avgLen = messages.reduce((sum, m) => sum + m.length, 0) / messages.length;
    if (avgLen < 20) {
      riskScore += 10;
      explanations.push("💡 Very short message responses — may indicate scripted/bot-like interaction.");
    }
  }

  // --- Predictions ---
  const predictions = predictScamFlow(hasPressureTactics, hasAdvancePayment, scamType);

  return {
    score: clamp(riskScore),
    explanations,
    predictions,
    details: {
      analyzed: true,
      pressureTacticsFound: ptMatched,
      advancePaymentKeywordsFound: apMatched,
      messageCount: messages.length
    }
  };
};

module.exports = { analyzeConversation, predictScamFlow };
