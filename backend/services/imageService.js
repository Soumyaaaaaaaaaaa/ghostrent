/**
 * IMAGE RISK SERVICE
 *
 * In a real system, we'd download each image URL and compute a perceptual hash
 * (pHash) to detect reuse across different listings. Here we simulate that using
 * a deterministic hash of the image URL itself, then compare across scan history.
 *
 * Risk flags:
 *  - Image URL appears in previous scans (reuse detected)
 *  - Using a known stock photo domain
 *  - Very few or zero images (suspicious for a legit property listing)
 */

const { simpleHash } = require("../utils/helpers");
const store = require("./memoryStore");

// Stock photo / placeholder domains flagged as suspicious
const STOCK_PHOTO_DOMAINS = [
  "pexels.com", "unsplash.com", "pixabay.com", "shutterstock.com",
  "istockphoto.com", "gettyimages.com", "freepik.com", "placeholder.com",
  "placeimg.com", "lorempixel.com", "picsum.photos", "dummyimage.com"
];

/**
 * Analyze images for reuse and suspicious sources.
 * @param {string[]} images - Array of image URLs or identifiers
 * @returns {{ score: number, explanations: string[], details: object }}
 */
const analyzeImages = (images = []) => {
  const explanations = [];
  let riskScore = 0;

  // --- No images penalty ---
  if (!images || images.length === 0) {
    explanations.push("⚠️ No images provided — genuine listings almost always have photos.");
    riskScore += 35;
    return { score: Math.min(riskScore, 100), explanations, details: { imageCount: 0, reusedImages: [], stockImages: [] } };
  }

  const imageHashes = images.map((img) => simpleHash(String(img)));
  const reusedImages = [];
  const stockImages = [];

  // --- Check each image against scan history ---
  const history = store.getHistory();
  const knownHashes = {};
  history.forEach((scan) => {
    (scan.input?.images || []).forEach((img) => {
      const h = simpleHash(String(img));
      knownHashes[h] = (knownHashes[h] || 0) + 1;
    });
  });

  imageHashes.forEach((hash, i) => {
    if (knownHashes[hash]) {
      reusedImages.push(images[i]);
    }
  });

  // --- Check for stock photo domains ---
  images.forEach((img) => {
    const url = String(img).toLowerCase();
    if (STOCK_PHOTO_DOMAINS.some((d) => url.includes(d))) {
      stockImages.push(img);
    }
  });

  // --- Scoring ---
  if (reusedImages.length > 0) {
    riskScore += Math.min(reusedImages.length * 25, 60);
    explanations.push(`🔁 ${reusedImages.length} image(s) reused from previous listings — classic scam sign.`);
  }

  if (stockImages.length > 0) {
    riskScore += Math.min(stockImages.length * 20, 40);
    explanations.push(`📸 ${stockImages.length} image(s) from stock photo sites — scammers steal listing photos.`);
  }

  if (images.length === 1) {
    riskScore += 10;
    explanations.push("📷 Only 1 image provided — real listings usually show multiple rooms.");
  }

  if (riskScore === 0) {
    explanations.push("✅ Images appear original and not reused in previous scans.");
  }

  return {
    score: Math.min(riskScore, 100),
    explanations,
    details: {
      imageCount: images.length,
      imageHashes,
      reusedImages,
      stockImages
    }
  };
};

module.exports = { analyzeImages };
