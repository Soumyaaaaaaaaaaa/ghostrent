/**
 * Static dataset of average monthly rental prices by city/area.
 * Used for Price Risk Analysis — comparing a listing's price
 * against known market benchmarks.
 */

const AREA_PRICES = {
  // Indian Metro Cities
  "mumbai":      { min: 15000, max: 80000, avg: 35000 },
  "delhi":       { min: 8000,  max: 60000, avg: 22000 },
  "bangalore":   { min: 10000, max: 55000, avg: 25000 },
  "hyderabad":   { min: 7000,  max: 40000, avg: 18000 },
  "pune":        { min: 8000,  max: 45000, avg: 20000 },
  "chennai":     { min: 7000,  max: 40000, avg: 17000 },
  "kolkata":     { min: 5000,  max: 35000, avg: 14000 },
  "ahmedabad":   { min: 5000,  max: 30000, avg: 12000 },
  "noida":       { min: 7000,  max: 35000, avg: 15000 },
  "gurgaon":     { min: 12000, max: 65000, avg: 28000 },
  "ghaziabad":   { min: 5000,  max: 25000, avg: 11000 },
  "faridabad":   { min: 4000,  max: 22000, avg: 10000 },

  // US Cities
  "new york":    { min: 150000, max: 500000, avg: 280000 }, // in INR equivalent (rough)
  "los angeles": { min: 120000, max: 400000, avg: 220000 },
  "chicago":     { min: 80000,  max: 250000, avg: 140000 },
  "san francisco":{ min: 180000,max: 600000, avg: 320000 },
  "seattle":     { min: 100000, max: 320000, avg: 180000 },

  // Generic fallback
  "default":     { min: 5000,  max: 100000, avg: 25000 }
};

const SCAM_KEYWORDS = [
  // Urgency / Pressure
  "urgent", "hurry", "limited time", "act now", "don't wait",
  "last chance", "immediately", "asap", "today only", "expire",

  // Trust manipulation
  "god bless", "god fearing", "honest person", "trustworthy",
  "missionary", "pastor", "minister", "diplomat",

  // Military / Travel scams
  "army", "military", "navy", "deployed", "stationed abroad",
  "currently in", "overseas", "out of country", "out of town",
  "traveling", "abroad",

  // Payment pressure
  "pay now", "send money", "wire transfer", "western union",
  "moneygram", "bitcoin", "crypto", "upfront", "advance payment",
  "security deposit first", "pay before viewing", "no refund",

  // No viewing tactics
  "no visit", "cannot show", "can't show", "not available to show",
  "viewing not possible", "send key", "mail key", "digital key",

  // Too good to be true
  "below market", "very cheap", "cheapest", "give away",
  "sacrifice price", "must sell", "relocation", "moving abroad",
  "going abroad", "job transfer",

  // Fake broker red flags
  "agent fee", "finder fee", "referral fee", "registration fee",
  "processing fee", "documentation fee",

  // Generic scam phrases
  "need serious tenant", "genuine inquiry only", "no time wasters",
  "photos available on request", "100% safe", "verified property"
];

const PRESSURE_TACTICS = [
  "pay first",
  "send deposit",
  "don't share",
  "keep it between us",
  "my agent will",
  "promise you",
  "trust me",
  "i'm a good person",
  "god willing",
  "verified",
  "legitimate",
  "not a scam",
  "you will not regret",
  "special offer",
  "only for you",
  "secret deal"
];

const ADVANCE_PAYMENT_PHRASES = [
  "pay advance", "advance rent", "token money", "booking amount",
  "reservation fee", "hold the property", "secure the flat",
  "send money", "transfer the amount", "payment link", "upi id",
  "google pay", "phonepay", "paytm first"
];

const FAKE_BROKER_PHRASES = [
  "i am broker", "i am agent", "contact my agent", "my representative",
  "send through agent", "agent will call", "brokerage applicable",
  "finder fee required", "registration required first"
];

module.exports = {
  AREA_PRICES,
  SCAM_KEYWORDS,
  PRESSURE_TACTICS,
  ADVANCE_PAYMENT_PHRASES,
  FAKE_BROKER_PHRASES
};
