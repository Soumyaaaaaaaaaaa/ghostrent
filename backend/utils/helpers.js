/**
 * Utility helpers used across services.
 */

/**
 * Clamp a number between min and max.
 */
const clamp = (val, min = 0, max = 100) => Math.max(min, Math.min(max, val));

/**
 * Normalize text: lowercase, strip punctuation, trim.
 */
const normalizeText = (text = "") =>
  text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();

/**
 * Count how many keywords from a list appear in a given text.
 * Returns { count, matched: [] }
 */
const countKeywordMatches = (text = "", keywords = []) => {
  const lower = normalizeText(text);
  const matched = keywords.filter((kw) => lower.includes(normalizeText(kw)));
  return { count: matched.length, matched };
};

/**
 * Simple phone number validator.
 * Returns { valid: bool, suspicious: bool, reason: string }
 */
const validatePhone = (phone = "") => {
  const digits = phone.replace(/\D/g, "");

  if (!digits) return { valid: false, suspicious: true, reason: "No phone number provided" };
  if (digits.length < 7) return { valid: false, suspicious: true, reason: "Phone number too short" };
  if (digits.length > 15) return { valid: false, suspicious: true, reason: "Phone number too long" };

  // Suspicious patterns: all same digits, sequential
  const allSame = /^(\d)\1+$/.test(digits);
  const sequential = ["1234567890", "0987654321", "1111111111", "0000000000"].some(
    (p) => digits.includes(p.slice(0, 7))
  );

  if (allSame) return { valid: false, suspicious: true, reason: "Phone is all repeated digits" };
  if (sequential) return { valid: false, suspicious: true, reason: "Phone appears to be sequential/fake" };

  return { valid: true, suspicious: false, reason: "Phone looks valid" };
};

/**
 * Simple email validator.
 * Returns { valid: bool, suspicious: bool, reason: string }
 */
const validateEmail = (email = "") => {
  if (!email) return { valid: false, suspicious: false, reason: "No email provided" };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, suspicious: true, reason: "Invalid email format" };
  }

  // Known suspicious disposable/temp email domains
  const suspiciousDomains = [
    "mailinator.com", "tempmail.com", "guerrillamail.com", "10minutemail.com",
    "throwaway.email", "yopmail.com", "dispostable.com", "fakeinbox.com",
    "trashmail.com", "sharklasers.com"
  ];

  const domain = email.split("@")[1]?.toLowerCase();
  if (suspiciousDomains.includes(domain)) {
    return { valid: false, suspicious: true, reason: `Disposable email domain: ${domain}` };
  }

  return { valid: true, suspicious: false, reason: "Email looks valid" };
};

/**
 * Generate a simple hash from a string (for image reuse simulation).
 */
const simpleHash = (str = "") => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
};

/**
 * Compute Jaccard similarity between two strings (word-level).
 * Returns value between 0 (no overlap) and 1 (identical).
 */
const jaccardSimilarity = (a = "", b = "") => {
  const setA = new Set(normalizeText(a).split(/\s+/).filter(Boolean));
  const setB = new Set(normalizeText(b).split(/\s+/).filter(Boolean));
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
};

module.exports = {
  clamp,
  normalizeText,
  countKeywordMatches,
  validatePhone,
  validateEmail,
  simpleHash,
  jaccardSimilarity
};
