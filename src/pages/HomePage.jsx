import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'

const FEATURES = [
  { icon: '🖼️', title: 'Image Reuse Detection', desc: 'Finds recycled photos from old scam listings' },
  { icon: '💰', title: 'Price Risk Analysis', desc: 'Flags listings priced way below market value' },
  { icon: '🔍', title: 'Keyword Scanning', desc: 'Detects classic scam language patterns' },
  { icon: '📋', title: 'Duplicate Detection', desc: 'Catches copy-paste listings across the database' },
  { icon: '📞', title: 'Seller Verification', desc: 'Validates phone numbers and email formats' },
  { icon: '💬', title: 'Chat Analysis', desc: 'Spots pressure tactics in seller conversations' },
  { icon: '🔮', title: 'Scam Predictor', desc: 'Predicts what the scammer will try next' },
]

const SCAM_TYPES = [
  { icon: '💸', label: 'Advance Payment Scam', color: 'var(--red)' },
  { icon: '👤', label: 'Fake Broker Scam', color: 'var(--orange)' },
  { icon: '🎖️', label: 'Military/Overseas Scam', color: 'var(--yellow)' },
]

const STATS = [
  { value: '7', label: 'Detection Signals' },
  { value: '3', label: 'Scam Types Identified' },
  { value: '100%', label: 'Free Forever' },
  { value: '<1s', label: 'Analysis Time' },
]

export default function HomePage() {
  return (
    <div className="page-shell">
      <Navbar />

      {/* ── Hero ──────────────────────────────────── */}
      <section className="hero">
        <div className="hero-badge">🛡️ AI-Powered Protection</div>
        <h1 className="hero-title">
          Never Fall for a<br />
          <span className="hero-gradient">Rental Scam</span> Again
        </h1>
        <p className="hero-sub">
          Paste any rental listing — GhostRent runs 7 parallel checks and gives you
          an instant, detailed scam risk report in under a second.
        </p>
        <div className="hero-cta">
          <Link to="/analyze" id="hero-cta-btn" className="btn-primary btn-lg">
            🔍 Analyze a Listing Free
          </Link>
          <Link to="/history" id="hero-history-btn" className="btn-secondary btn-lg">
            📋 View Scan History
          </Link>
        </div>

        {/* Stats row */}
        <div className="stats-row">
          {STATS.map(s => (
            <div key={s.label} className="stat-item">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────── */}
      <section className="features-section">
        <div className="section-header">
          <h2>How GhostRent Detects Scams</h2>
          <p>Seven independent checks, all run in parallel</p>
        </div>
        <div className="features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Scam Types ────────────────────────────── */}
      <section className="scam-types-section">
        <div className="section-header">
          <h2>Scam Types We Identify</h2>
          <p>Pattern-matched against known scam playbooks</p>
        </div>
        <div className="scam-types-grid">
          {SCAM_TYPES.map(t => (
            <div key={t.label} className="scam-type-card" style={{ borderColor: t.color + '44' }}>
              <div className="scam-type-icon">{t.icon}</div>
              <div className="scam-type-label" style={{ color: t.color }}>{t.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────── */}
      <section className="home-cta-section">
        <div className="home-cta-card">
          <h2>Found a Suspicious Listing?</h2>
          <p>Don't risk your money. Run a free scan in under 1 second.</p>
          <Link to="/analyze" className="btn-primary btn-lg" id="bottom-cta-btn" style={{ maxWidth: 260 }}>
            🔍 Start Analyzing
          </Link>
        </div>
      </section>

      <footer className="home-footer">
        <span>🛡️ GhostRent · Rental Scam Detector · Free & Open Source</span>
      </footer>
    </div>
  )
}
