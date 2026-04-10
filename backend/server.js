/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║              RENTAL SCAM DETECTOR — Express API Server               ║
 * ║                                                                       ║
 * ║  Start with:  npm install && npm start                                ║
 * ║  Server runs on: http://localhost:3000                                ║
 * ║                                                                       ║
 * ║  Endpoints:                                                           ║
 * ║    POST /analyze    → Analyze a rental listing                        ║
 * ║    GET  /history    → View all previous scans                         ║
 * ║    GET  /demo       → See sample real + scam listings                 ║
 * ║    GET  /health     → Server health check                             ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 */

const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const morgan  = require("morgan");
const routes  = require("./routes/index");

// ─── App Setup ──────────────────────────────────────────────────────────────

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Security & Utility Middleware ──────────────────────────────────────────

app.use(helmet());           // Sets security-related HTTP headers
app.use(cors());             // Enables Cross-Origin requests (needed for frontend)
app.use(morgan("dev"));      // HTTP request logger for development
app.use(express.json({ limit: "2mb" }));       // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// ─── API Routes ─────────────────────────────────────────────────────────────

app.use("/", routes);

// ─── Root Welcome Message ───────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.json({
    service:     "🏠 Rental Scam Detector API",
    version:     "1.0.0",
    description: "AI-powered backend to detect rental listing scams",
    endpoints: {
      "POST /analyze": "Submit a listing for scam analysis",
      "GET /history":  "View all previously scanned listings",
      "GET /demo":     "Get sample real + scam test listings",
      "GET /health":   "Server health check"
    },
    quickStart: {
      step1: "GET /demo  →  copy a sample input",
      step2: "POST /analyze  →  paste it in the body",
      step3: "Read the scam report in the response"
    }
  });
});

// ─── 404 Handler ────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Not Found",
    message: `Route ${req.method} ${req.path} does not exist.`,
    availableRoutes: ["POST /analyze", "GET /history", "GET /demo", "GET /health"]
  });
});

// ─── Global Error Handler ───────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error("[Server Error]", err.stack);
  res.status(500).json({
    success: false,
    error: "Internal Server Error",
    message: err.message || "Something went wrong."
  });
});

// ─── Start Server ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log("");
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║      🏠 Rental Scam Detector API is LIVE!        ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  🚀 Server:   http://localhost:${PORT}               ║`);
  console.log("║  📡 Endpoints:                                    ║");
  console.log("║     POST  /analyze   → Analyze a listing          ║");
  console.log("║     GET   /history   → View scan history           ║");
  console.log("║     GET   /demo      → Sample listings             ║");
  console.log("║     GET   /health    → Health check                ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("");
});

module.exports = app;
