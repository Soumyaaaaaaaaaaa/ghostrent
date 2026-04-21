<div align="center">

# 🏠 GhostRent
### AI-Powered Rental Scam Detector

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://mongodb.com)
[![Groq](https://img.shields.io/badge/AI-Groq%20%2F%20LLaMA3-FF6B35)](https://console.groq.com)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

**GhostRent analyzes rental listings using a hybrid engine (rule-based logic + AI) to detect scams before you become a victim.**

[Features](#-features) · [Tech Stack](#-tech-stack) · [Setup](#-setup-guide) · [API Reference](#-api-reference) · [How It Works](#-how-scam-detection-works)

</div>

---

## 📖 Project Overview

Rental scams cost victims thousands of dollars every year. Scammers post fake listings — with suspiciously low rents, stolen photos, military backstories, and advance-payment traps — to steal deposits from unsuspecting tenants.

**GhostRent** lets you paste a listing's title, description, price, location, contact info, and any seller conversation into a single form. Within seconds, it returns a **0–100 scam score**, a **risk level** (Low / Medium / High), a breakdown of exactly *why* the listing is suspicious, and AI-generated predictions of what the scammer will do next.

### The Problem It Solves

| Without GhostRent | With GhostRent |
|---|---|
| You rely on gut feeling | You get a data-driven risk score |
| You may miss subtle red flags | 40+ keyword patterns are checked instantly |
| AI is never consulted | LLaMA 3 provides independent assessment |
| No record of suspicious listings | Full scan history saved to your account |

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Auth System** | JWT-based signup / login. All scans are tied to your account |
| 🧠 **Hybrid Scam Detection** | Rule-based engine (70%) + Groq AI (30%) for accurate, explainable results |
| 📊 **Risk Scoring** | 0–100 scam score with Low / Medium / High classification |
| 🔍 **4-Factor Breakdown** | Text Risk · Price Risk · Duplicate Risk · Seller Risk |
| 🤖 **AI Insights** | LLaMA 3 explains *why* it flagged something and predicts scammer next steps |
| 📋 **History Dashboard** | Browse all your past scans with stats (total / high / medium / low) |
| 📄 **PDF Export** | Download any scan result as a report (via jsPDF) |
| 🌙 **Dark Mode** | Full dark/light theme support |
| ⚡ **Groq Fallback** | If AI is unavailable, the rule engine runs standalone at full accuracy |

---

## 🛠 Tech Stack

### Frontend
- **React 19** (Vite) — SPA with React Router v7
- **Axios** — API calls with JWT header injection
- **jsPDF + jspdf-autotable** — PDF report export
- **Vanilla CSS** — Custom design system with CSS variables

### Backend
- **Node.js + Express 4** — REST API server
- **Mongoose 9** — MongoDB ODM
- **bcryptjs** — Password hashing
- **jsonwebtoken** — JWT auth tokens
- **helmet + cors + morgan** — Security and logging

### Database
- **MongoDB Atlas** — Cloud-hosted database
- Indexed scan history for fast per-user queries

### AI
- **Groq API** (LLaMA 3.1 8B Instant) — Low-latency LLM inference
- 8-second timeout with graceful fallback to rule engine

---

## 📁 Project Structure

```
ghostrent/
├── backend/                    # Node.js + Express API
│   ├── controllers/
│   │   ├── analyzeController.js   # POST /api/analyze + GET /api/history
│   │   └── authController.js      # POST /auth/signup, /login, GET /auth/me
│   ├── routes/
│   │   ├── index.js               # /api/* routes
│   │   └── auth.js                # /auth/* routes
│   ├── services/
│   │   └── analysisService.js     # Hybrid engine: rule-based + AI merge
│   ├── models/
│   │   ├── Scan.js                # MongoDB scan schema
│   │   └── User.js                # MongoDB user schema + bcrypt hooks
│   ├── middleware/
│   │   └── authMiddleware.js      # JWT verification middleware
│   ├── utils/
│   │   └── helpers.js             # clamp, normalizeText, validators, Jaccard similarity
│   ├── data/
│   │   └── areaPrices.js          # City rent benchmarks + scam keyword lists
│   ├── .env.example               # Environment variable template
│   ├── package.json
│   └── server.js                  # App entry point
│
├── src/                        # React frontend (Vite root)
│   ├── pages/
│   │   ├── HomePage.jsx           # Landing page
│   │   ├── AuthPage.jsx           # Login / Signup
│   │   ├── AnalyzePage.jsx        # Main scan form + results
│   │   └── HistoryPage.jsx        # Scan history dashboard
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── Gauge.jsx              # Animated risk score gauge
│   │   ├── ScoreCard.jsx          # Score display card
│   │   └── ProtectedRoute.jsx     # Auth-guarded routes
│   ├── context/
│   │   ├── AuthContext.jsx        # Global auth state + token management
│   │   └── ThemeContext.jsx       # Dark/light mode toggle
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── index.html
├── vite.config.js
├── package.json                # Frontend dependencies
└── README.md
```

---

## ⚙️ Setup Guide

### Prerequisites

- **Node.js** v18 or later — [Download](https://nodejs.org)
- **npm** v8+ (comes with Node)
- **MongoDB Atlas** account (free tier works) — [Sign up](https://www.mongodb.com/cloud/atlas)
- **Groq API key** (free) — [Get key](https://console.groq.com)

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/Soumyaaaaaaaaaaa/ghostrent.git
cd ghostrent
```

---

### Step 2 — Install Backend Dependencies

```bash
cd backend
npm install
```

---

### Step 3 — Configure Backend Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Open `backend/.env` and set:

```env
PORT=3000
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?appName=Cluster0
JWT_SECRET=your_long_random_secret_here
JWT_EXPIRES_IN=7d
GROQ_API_KEY=gsk_your_groq_key_here
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_MODEL=llama-3.1-8b-instant
```

> **Where to get these values** — see the [Environment Variables](#-environment-variables) section below.

---

### Step 4 — Start the Backend

```bash
# From the backend/ directory
npm run dev
```

You should see:

```
[MongoDB] Connected successfully
╔══════════════════════════════════════════════════╗
║         🏠 GhostRent API is LIVE!                ║
╠══════════════════════════════════════════════════╣
║  🚀 Server:  http://localhost:3000               ║
```

---

### Step 5 — Install Frontend Dependencies

Open a **new terminal**, go back to the project root:

```bash
cd ..        # back to ghostrent/
npm install
```

---

### Step 6 — Start the Frontend

```bash
npm run dev
```

Visit **http://localhost:5173** in your browser.

---

## 🔑 Environment Variables

All variables live in `backend/.env`. Never commit this file — it's in `.gitignore`.

| Variable | Required | Description | Where to get |
|---|---|---|---|
| `PORT` | No | Port for the Express server. Defaults to `3000` | Set to any free port |
| `MONGO_URI` | ✅ Yes | MongoDB connection string | [MongoDB Atlas](https://cloud.mongodb.com) → Connect → Drivers → Copy URI |
| `JWT_SECRET` | ✅ Yes | Secret key for signing JWTs. Must be long and random | Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_EXPIRES_IN` | No | Token expiry duration. Defaults to `7d` | e.g. `1d`, `7d`, `30d` |
| `GROQ_API_KEY` | ✅ Yes | API key for Groq LLM inference | [console.groq.com](https://console.groq.com) → API Keys → Create |
| `GROQ_API_URL` | No | Groq endpoint. Defaults to the chat completions URL | Leave as shown in `.env.example` |
| `GROQ_MODEL` | No | Model to use. Defaults to `llama-3.1-8b-instant` | See [Groq model list](https://console.groq.com/docs/models) |

> **No GROQ_API_KEY?** The app still works — it falls back to the rule-based engine only. Scam scores will still be generated; the "AI Used" badge will show `false`.

---

## 📡 API Reference

### Authentication Routes

#### `POST /auth/signup`
Register a new user.

```json
// Request Body
{
  "name": "Priya Sharma",
  "email": "priya@example.com",
  "password": "mypassword123",
  "phone": "9876543210"   // optional
}
```

```json
// Response 201
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "name": "Priya Sharma", "email": "priya@example.com" }
}
```

---

#### `POST /auth/login`
Login and receive a JWT.

```json
// Request Body
{
  "email": "priya@example.com",
  "password": "mypassword123"
}
```

```json
// Response 200
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "name": "Priya Sharma", "email": "priya@example.com" }
}
```

---

### Protected Routes
All routes below require the header:
```
Authorization: Bearer <your_jwt_token>
```

---

#### `POST /api/analyze`
Analyze a rental listing and get a scam risk report.

```json
// Request Body (all fields optional except url OR description)
{
  "url": "2BHK in Bandra West — fully furnished, immediate possession",
  "description": "Beautiful flat, army officer going abroad, pay 2 months deposit via Western Union urgently!",
  "price": 5000,
  "location": "Mumbai",
  "contact": "9999999999 seller@mailinator.com",
  "chat": "Please pay first, I will send keys by post. God bless you."
}
```

```json
// Response 200
{
  "success": true,
  "data": {
    "scanId": "664f3a...",
    "scannedAt": "2026-04-21T14:00:00.000Z",
    "scamScore": 87,
    "riskLevel": "High",
    "confidence": 82,
    "breakdown": {
      "textRisk": 90,
      "priceRisk": 75,
      "duplicateRisk": 0,
      "sellerRisk": 70
    },
    "insights": {
      "explanations": ["🚨 5 scam keywords detected...", "🚨 Price is extremely low..."],
      "predictions": ["💸 They will ask for a token deposit before viewing."],
      "scamType": "military_scam",
      "sellerInsights": "Seller is evasive and creating urgency."
    },
    "aiUsed": true
  }
}
```

---

#### `GET /api/history`
Fetch the authenticated user's last 50 scans.

```json
// Response 200
{
  "success": true,
  "stats": { "total": 12, "high": 5, "medium": 4, "low": 3 },
  "count": 12,
  "data": [
    {
      "id": "664f3a...",
      "scannedAt": "2026-04-21T14:00:00.000Z",
      "title": "2BHK in Bandra West...",
      "scamScore": 87,
      "riskLevel": "High",
      "confidence": 82,
      "scamType": "military_scam",
      "aiUsed": true
    }
  ]
}
```

---

## 🧠 How Scam Detection Works

GhostRent uses a **Hybrid Detection Engine** combining deterministic rules with AI reasoning.

### Step 1 — Rule-Based Engine (70% weight)

Four independent analyzers each produce a **0–100 risk sub-score**:

| Analyzer | What It Checks |
|---|---|
| **Text Risk** | 40+ scam keywords (urgency, military, advance payment), ALL CAPS abuse, excessive punctuation, short descriptions |
| **Price Risk** | Listing price vs. city market average (12 Indian cities + 5 US cities). Prices >50% below minimum = red flag |
| **Duplicate Risk** | Jaccard similarity against recent submissions. >85% match = near-identical repost detected |
| **Seller Risk** | Phone format validity, disposable email domains (mailinator, tempmail, etc.), missing contact info |

The four sub-scores are averaged to get the **deterministic aggregate**.

### Step 2 — AI Engine (30% weight)

The listing is sent to **Groq's LLaMA 3.1** with a structured prompt requesting:
- Scam type classification
- Specific red-flag explanations
- Predicted "next steps" a scammer would take
- Seller behavior assessment
- Independent risk score (0–100)

The AI call has an **8-second timeout**. If it fails or the API key is missing, the system falls back to 100% rule engine weight — no crash, no partial results.

### Step 3 — Score Merge

```
Final Score = (Rule Aggregate × 0.70) + (AI Risk Score × 0.30)
```

| Score Range | Risk Level |
|---|---|
| 0 – 30 | 🟢 Low |
| 31 – 70 | 🟡 Medium |
| 71 – 100 | 🔴 High |

If the rule engine and AI disagree by more than 30 points, a **"Mixed Signals"** notice is added and manual review is recommended.

---

## 📝 Sample Inputs

### 🔴 High Risk — Military Advance Payment Scam

```json
{
  "url": "Spacious 3BHK fully furnished, all amenities, prime location Mumbai",
  "description": "I am an army officer currently deployed overseas. I cannot show the flat personally. Pay 2 months deposit via Western Union and I will mail you the keys. God fearing person. Act urgently as many are interested.",
  "price": 4000,
  "location": "Mumbai",
  "contact": "whatsapp only: +1-555-000-0000 owner@mailinator.com",
  "chat": "Please send the token money first. I promise you will not regret it. God bless."
}
```
Expected: **scamScore ~85–95**, riskLevel: **High**, scamType: **military_scam**

---

### 🟡 Medium Risk — Suspicious Price, No Contact

```json
{
  "url": "1BHK available in Koramangala Bangalore",
  "description": "Nice flat available immediately. Rent 4000 only. No brokerage.",
  "price": 4000,
  "location": "Bangalore",
  "contact": ""
}
```
Expected: **scamScore ~50–65**, riskLevel: **Medium** (price well below Bangalore min, no contact)

---

### 🟢 Low Risk — Legitimate Listing

```json
{
  "url": "2BHK semi-furnished in HSR Layout, Bangalore",
  "description": "Well-maintained 2BHK apartment on 3rd floor. 24/7 water, security, lift. Parking available. Preferred working professionals or small family. Available from May 1st.",
  "price": 22000,
  "location": "Bangalore",
  "contact": "9845012345 landlord@gmail.com"
}
```
Expected: **scamScore ~5–20**, riskLevel: **Low**

---

## 🔒 Security

| Measure | Implementation |
|---|---|
| **Password hashing** | bcryptjs with salt rounds = 10 (applied via Mongoose pre-save hook) |
| **JWT authentication** | Signed tokens, 7-day expiry, verified on every protected route |
| **HTTP hardening** | `helmet` sets secure response headers (XSS, HSTS, etc.) |
| **CORS control** | Configurable via `CLIENT_ORIGIN` env var; defaults to same-origin in production |
| **Input validation** | Requests validated in middleware before reaching controllers |
| **No secrets in frontend** | All API keys live server-side only in `backend/.env` |

---

## 🚀 Future Improvements

- [ ] **Refresh tokens** — Short-lived access tokens + long-lived refresh tokens for better session security
- [ ] **Real-time pricing API** — Replace static city benchmarks with live rental market data
- [ ] **Admin dashboard** — View all scans, flag repeat scammers, export reports
- [ ] **Browser extension** — Analyze listings directly on MagicBricks, 99acres, OLX, etc.
- [ ] **Phone number reputation API** — Cross-reference contacts with known scammer databases
- [ ] **Multi-language support** — Detect scam keywords in Hindi, Tamil, Telugu, etc.
- [ ] **Rate limiting** — Prevent API abuse with express-rate-limit

---

## 🎤 One-Line Interview Pitch

> *"GhostRent is a full-stack MERN application that protects tenants from rental scams using a hybrid detection engine — combining a 4-factor rule-based scoring system with Groq's LLaMA 3 AI — to produce explainable, real-time scam risk assessments with JWT-authenticated user accounts and persistent scan history."*

---

## 👥 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "feat: add my feature"`
4. Push and open a PR

---

## 📄 License

[MIT](LICENSE) — free for personal and commercial use.

---

<div align="center">
Built with ❤️ to make renting safer · <a href="https://github.com/Soumyaaaaaaaaaaa/ghostrent">GitHub</a>
</div>
