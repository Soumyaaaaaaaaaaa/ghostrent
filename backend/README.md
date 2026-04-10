# 🏠 Rental Scam Detector — Backend API

> AI-powered backend that acts like an **antivirus for rental listings**.  
> Paste a listing → get a full scam risk report instantly.

---

## ⚡ Quick Start (One Command)

```bash
cd backend
npm install && npm start
```

Server starts at → **http://localhost:3000**

---

## 📁 Project Structure

```
backend/
├── server.js                  ← Entry point (start here)
├── package.json
├── .env                       ← Optional: change PORT
│
├── routes/
│   └── index.js               ← All API route definitions + validation
│
├── controllers/
│   └── analyzeController.js   ← Orchestrates the full analysis pipeline
│
├── services/
│   ├── memoryStore.js         ← In-memory "database" (no SQL/MongoDB needed)
│   ├── imageService.js        ← Image reuse + stock photo detection
│   ├── priceService.js        ← Price vs area benchmark analysis
│   ├── textService.js         ← Scam keyword + writing pattern detection
│   ├── duplicateService.js    ← Duplicate listing detection (Jaccard similarity)
│   ├── sellerService.js       ← Phone/email validation + scammer fingerprint
│   ├── conversationService.js ← Chat pressure tactics + "What Happens Next" predictor
│   └── scoringEngine.js       ← Weighted score aggregation (final scam score)
│
├── utils/
│   └── helpers.js             ← Shared utilities (hashing, text normalization, etc.)
│
└── data/
    └── areaPrices.js          ← Hardcoded area price benchmarks + scam keyword lists
```

---

## 🔌 API Endpoints

| Method | Endpoint   | Description                              |
|--------|------------|------------------------------------------|
| POST   | /analyze   | Analyze a rental listing for scam risk   |
| GET    | /history   | View all previously scanned listings     |
| GET    | /demo      | Get sample real + scam test listings     |
| GET    | /health    | Server health check                      |

---

## 📨 Example: Analyze a Listing

**Request:**
```http
POST http://localhost:3000/analyze
Content-Type: application/json

{
  "title": "URGENT!!! Luxury 3BHK Flat in Mumbai - VERY CHEAP!!",
  "description": "I am currently deployed overseas (army). I need a trustworthy god-fearing person. Rent is only ₹5000/month. No visits possible — I will mail the key after you pay advance. Pay now via Western Union.",
  "price": 5000,
  "location": "Bandra, Mumbai",
  "contact": "1234567890",
  "images": ["https://unsplash.com/photo/apartment.jpg"],
  "chatText": "Please send the advance today. Another buyer is interested. Trust me, send the deposit first and I will mail the keys."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "scamScore": 87,
    "riskLevel": "High",
    "confidence": 92,
    "breakdown": {
      "imageRisk": 40,
      "priceRisk": 70,
      "textRisk": 65,
      "duplicateRisk": 0,
      "sellerRisk": 30,
      "conversationRisk": 85
    },
    "explanations": [
      "📸 1 image(s) from stock photo sites",
      "🚨 Price ₹5,000 is extremely low for mumbai (expected min ₹15,000). Classic bait scam.",
      "🚨 Found 6 scam keywords: \"urgent\", \"army\", \"overseas\", \"no visit\", \"pay now\", \"western union\"",
      "📵 Phone appears to be sequential/fake",
      "🚨 Advance payment request detected: \"send the deposit first\""
    ],
    "predictions": [
      "💸 They will ask for token/security deposit before you view.",
      "🔑 Once paid, they'll go silent or make excuses.",
      "❌ Eventually they'll stop responding — money gone."
    ],
    "scamType": {
      "type": "military_scam",
      "confidence": 85
    },
    "sellerInsights": [
      "Listing pattern matches a known scam type: Military/Overseas Scam.",
      "Images from this listing appeared in other scanned listings."
    ],
    "scanId": "abc123",
    "scannedAt": "2026-04-10T07:00:00.000Z"
  }
}
```

---

## 🧠 How Scoring Works

| Feature          | Weight |
|------------------|--------|
| Image Risk       | 30%    |
| Price Risk       | 25%    |
| Text Risk        | 20%    |
| Duplicate Risk   | 15%    |
| Seller Risk      | 10%    |
| Conversation     | +10% modifier |

**Risk Levels:**
- `Low` → 0–34
- `Medium` → 35–64
- `High` → 65–100

---

## 🧪 Test with Demo Listings

```bash
# 1. Get demo listings
GET http://localhost:3000/demo

# 2. Copy either the real or scam listing's `input` field
# 3. Send it to:
POST http://localhost:3000/analyze
```

---

## 🔧 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Storage**: In-memory (no database!)
- **Libraries**: `natural`, `string-similarity`, `uuid`, `helmet`, `cors`
