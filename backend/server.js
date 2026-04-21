require("dotenv").config();

const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const morgan    = require("morgan");
const mongoose  = require("mongoose");
const apiRoutes = require("./routes/index");
const authRoutes = require("./routes/auth");

// ─── Crash Handlers ───────────────────────────────────────────────────────────

process.on("uncaughtException", (err) => {
  console.error("[CRITICAL] Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[CRITICAL] Unhandled Rejection:", reason);
});

// ─── App Setup ────────────────────────────────────────────────────────────────

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Security & Middleware ────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/auth", authRoutes);
app.use("/api",  apiRoutes);

// ─── Root Info ────────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.json({
    service:     "🏠 GhostRent — AI Rental Scam Detector",
    version:     "2.0.0",
    description: "Text-based hybrid scam detection API (logic + AI)",
    endpoints: {
      "POST /auth/signup":  "Register a new user",
      "POST /auth/login":   "Login and receive JWT",
      "GET  /auth/me":      "Get current user (JWT required)",
      "POST /api/analyze":  "Analyze a listing for scam risk (JWT required)",
      "GET  /api/history":  "Fetch scan history (JWT required)",
      "GET  /api/health":   "Health check",
    },
  });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error:   "Not Found",
    message: `Route ${req.method} ${req.path} does not exist.`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error("[Server Error]", err.stack);
  res.status(500).json({
    success: false,
    error:   "Internal Server Error",
    message: err.message || "Something went wrong.",
  });
});

// ─── Database + Listen ────────────────────────────────────────────────────────

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ghostrent";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("[MongoDB] Connected successfully");
    app.listen(PORT, () => {
      console.log("");
      console.log("╔══════════════════════════════════════════════════╗");
      console.log("║         🏠 GhostRent API is LIVE!                ║");
      console.log("╠══════════════════════════════════════════════════╣");
      console.log(`║  🚀 Server:  http://localhost:${PORT}                ║`);
      console.log("║  📡 Endpoints:                                    ║");
      console.log("║     POST  /auth/signup                           ║");
      console.log("║     POST  /auth/login                            ║");
      console.log("║     POST  /api/analyze  → Analyze listing        ║");
      console.log("║     GET   /api/history  → Scan history           ║");
      console.log("║     GET   /api/health   → Health check           ║");
      console.log("╚══════════════════════════════════════════════════╝");
      console.log("");
    });
  })
  .catch((err) => {
    console.error("[MongoDB] Connection error:", err.message);
    // Start server anyway — routes needing DB will return 500
    app.listen(PORT, () =>
      console.log(`[Server] Running without DB on port ${PORT}`)
    );
  });

module.exports = app;
