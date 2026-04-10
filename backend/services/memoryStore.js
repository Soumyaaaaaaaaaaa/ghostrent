/**
 * IN-MEMORY STORE
 *
 * Acts as our "database" — a simple in-memory array of scan results.
 * All data is lost when the server restarts (by design — no DB required).
 *
 * Provides simple CRUD operations used by all services.
 */

const { v4: uuidv4 } = require("uuid");

// Internal store — lives in RAM
let scanHistory = [];

/**
 * Save a new scan result.
 * @param {{ input: object, result: object }} scanData
 * @returns {object} The saved entry with id and timestamp
 */
const saveScan = (scanData) => {
  const entry = {
    id: uuidv4(),
    scannedAt: new Date().toISOString(),
    ...scanData
  };
  scanHistory.unshift(entry); // newest first

  // Keep only the last 500 scans in memory
  if (scanHistory.length > 500) {
    scanHistory = scanHistory.slice(0, 500);
  }

  return entry;
};

/**
 * Get all scans (newest first).
 */
const getHistory = () => scanHistory;

/**
 * Get a single scan by ID.
 */
const getScanById = (id) => scanHistory.find((s) => s.id === id) || null;

/**
 * Clear all scans (useful for testing).
 */
const clearHistory = () => {
  scanHistory = [];
};

/**
 * Get summary stats about the store.
 */
const getStats = () => ({
  totalScans: scanHistory.length,
  highRiskScans: scanHistory.filter((s) => s.result?.riskLevel === "High").length,
  mediumRiskScans: scanHistory.filter((s) => s.result?.riskLevel === "Medium").length,
  lowRiskScans: scanHistory.filter((s) => s.result?.riskLevel === "Low").length
});

module.exports = { saveScan, getHistory, getScanById, clearHistory, getStats };
