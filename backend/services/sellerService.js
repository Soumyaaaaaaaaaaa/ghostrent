/**
 * SELLER CREDIBILITY SERVICE
 *
 * Evaluates the credibility of the seller based on their contact information.
 *
 * Checks:
 *  - Phone number validity (format, suspicious patterns)
 *  - Email validity (format, disposable domains)
 *  - "Scammer fingerprint" — same contact used in multiple previous scans
 *    (a real scammer reuses the same phone/email across many fake listings)
 *
 * Risk flags:
 *  - Invalid phone or email format
 *  - Disposable email domain
 *  - Contact appears in multiple previous scans
 *  - No contact info at all
 */

const { validatePhone, validateEmail, normalizeText, clamp } = require("../utils/helpers");
const store = require("./memoryStore");

/**
 * Check if a contact (phone or email) appears in past scan history.
 * This is the "Scammer Fingerprint" feature.
 */
const checkFingerprint = (contact = "") => {
  if (!contact) return { seen: false, occurrences: 0 };

  const norm = normalizeText(contact);
  const history = store.getHistory();
  const occurrences = history.filter((scan) => {
    const prevContact = normalizeText(scan.input?.contact || "");
    return prevContact && prevContact.includes(norm);
  }).length;

  return { seen: occurrences > 0, occurrences };
};

/**
 * Analyze seller credibility from contact string.
 * @param {string} contact - Could be a phone number, email, or both
 * @returns {{ score: number, explanations: string[], details: object }}
 */
const analyzeSeller = (contact = "") => {
  const explanations = [];
  let riskScore = 0;

  if (!contact || !contact.trim()) {
    explanations.push("❌ No contact information provided — legitimate sellers always share contact details.");
    return { score: 50, explanations, details: { hasContact: false } };
  }

  // Split contact into possible phone and email components
  const emailMatch = contact.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  const phoneCandidate = contact.replace(emailMatch?.[0] || "", "").trim();

  const email = emailMatch?.[0] || "";
  const phone = phoneCandidate;

  const phoneResult = validatePhone(phone);
  const emailResult = validateEmail(email);

  // --- Phone analysis ---
  if (phone) {
    if (!phoneResult.valid) {
      riskScore += 30;
      explanations.push(`📵 Phone issue: ${phoneResult.reason}`);
    } else {
      explanations.push(`✅ Phone looks valid.`);
    }
  }

  // --- Email analysis ---
  if (email) {
    if (!emailResult.valid) {
      riskScore += 25;
      explanations.push(`📧 Email issue: ${emailResult.reason}`);
    } else if (emailResult.suspicious) {
      riskScore += 35;
      explanations.push(`🚨 Email issue: ${emailResult.reason}`);
    } else {
      explanations.push(`✅ Email looks valid.`);
    }
  }

  // --- Scammer Fingerprint check ---
  const fingerprint = checkFingerprint(contact);
  if (fingerprint.occurrences >= 3) {
    riskScore += 50;
    explanations.push(
      `🔴 SCAMMER FINGERPRINT: This contact appeared in ${fingerprint.occurrences} previous scam reports!`
    );
  } else if (fingerprint.occurrences >= 1) {
    riskScore += 25;
    explanations.push(
      `⚠️ This contact was seen in ${fingerprint.occurrences} previous listing scan(s). Could be a repeat poster.`
    );
  }

  if (riskScore === 0) {
    explanations.push("✅ Seller contact appears credible with no red flags.");
  }

  return {
    score: clamp(riskScore),
    explanations,
    details: {
      hasContact: true,
      phone: phone || null,
      email: email || null,
      phoneValid: phoneResult.valid,
      emailValid: emailResult.valid,
      fingerprint
    }
  };
};

module.exports = { analyzeSeller };
