import { useState, useCallback } from 'react'

const API = 'http://localhost:3000'

const RISK_CLASS = { Low: 'low', Medium: 'medium', High: 'high' }
const RISK_EMOJI = { Low: '🟢', Medium: '🟡', High: '🔴' }

const SCAM_TYPE_LABELS = {
  advance_payment_scam: '💸 Advance Payment Scam',
  fake_broker_scam: '👤 Fake Broker Scam',
  military_scam: '🎖️ Military / Overseas Scam',
  unknown: '❓ Unknown Type'
}

// ── Score Gauge ───────────────────────────────────────
function Gauge({ score, riskLevel }) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(score, 100) / 100
  const offset = circumference - pct * circumference
  const cls = RISK_CLASS[riskLevel] || 'low'

  return (
    <div className="score-gauge">
      <div className="gauge-circle">
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle className="gauge-bg" cx="50" cy="50" r={radius} fill="none" strokeWidth="8" />
          <circle
            className={`gauge-fill ${cls}`}
            cx="50" cy="50" r={radius}
            fill="none" strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="gauge-text">
          <span className="gauge-score">{score}</span>
          <span className={`gauge-label ${cls}`}>{riskLevel}</span>
        </div>
      </div>
      <span className="confidence-tag">Scam Score</span>
    </div>
  )
}

// ── Score Card ────────────────────────────────────────
function ScoreCard({ label, icon, score, weight }) {
  const cls = score >= 65 ? 'high' : score >= 35 ? 'medium' : 'low'
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-label">{label}</span>
        <span className="card-icon">{icon}</span>
      </div>
      <div className="card-score">{score}</div>
      <div className="score-bar-track">
        <div className={`score-bar-fill ${cls}`} style={{ width: `${score}%` }} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>Weight: {(weight * 100).toFixed(0)}%</div>
    </div>
  )
}

// ── History Item ──────────────────────────────────────
function HistoryItem({ item, onClick }) {
  const cls = RISK_CLASS[item.riskLevel] || 'low'
  return (
    <div className="history-item" onClick={onClick} title={item.title}>
      <div className={`history-dot ${cls}`} />
      <span className="history-label">{item.title || 'Untitled'}</span>
      <span className="history-score">{item.scamScore}</span>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────
export default function App() {
  const [form, setForm] = useState({
    title: '', description: '', price: '', location: '',
    contact: '', images: '', chatText: ''
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const fetchHistory = useCallback(async () => {
    try {
      const r = await fetch(`${API}/history`)
      const d = await r.json()
      if (d.success) setHistory(d.data)
    } catch { /* ignore */ }
  }, [])

  const loadDemo = async () => {
    try {
      const r = await fetch(`${API}/demo`)
      const d = await r.json()
      if (d.success) {
        const scam = d.demos[1].input
        setForm({
          title: scam.title,
          description: scam.description,
          price: String(scam.price),
          location: scam.location,
          contact: scam.contact,
          images: (scam.images || []).join(', '),
          chatText: scam.chatText || ''
        })
        setResult(null); setError(null)
      }
    } catch {
      setError('Backend not reachable. Make sure the server is running on port 3000.')
    }
  }

  const analyze = async () => {
    if (!form.title && !form.description) {
      setError('Please provide at least a title or description.')
      return
    }
    setLoading(true); setError(null); setResult(null)
    try {
      const body = {
        title: form.title,
        description: form.description,
        price: Number(form.price) || 0,
        location: form.location,
        contact: form.contact,
        images: form.images ? form.images.split(',').map(s => s.trim()).filter(Boolean) : [],
        chatText: form.chatText
      }
      const r = await fetch(`${API}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const d = await r.json()
      if (d.success) {
        setResult(d.data)
        fetchHistory()
      } else {
        setError(d.message || 'Analysis failed.')
      }
    } catch {
      setError('Cannot connect to backend. Run: cd backend && npm start')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setForm({ title: '', description: '', price: '', location: '', contact: '', images: '', chatText: '' })
    setResult(null); setError(null)
  }

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">
            <div className="brand-icon">🛡️</div>
            <div>
              <div className="brand-name">GhostRent</div>
              <div className="brand-tagline">Rental Scam Detector</div>
            </div>
          </div>
        </div>

        <div className="form-wrap">
          <div className="form-section-label">Listing Details</div>

          <div className="field">
            <label htmlFor="title">Title</label>
            <input id="title" placeholder="e.g. 2BHK Flat in Bandra" value={form.title} onChange={set('title')} />
          </div>

          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea id="description" placeholder="Paste the full listing description…" value={form.description} onChange={set('description')} style={{ minHeight: 100 }} />
          </div>

          <div className="field">
            <label htmlFor="price">Monthly Rent (₹)</label>
            <input id="price" type="number" placeholder="e.g. 25000" value={form.price} onChange={set('price')} />
          </div>

          <div className="field">
            <label htmlFor="location">Location</label>
            <input id="location" placeholder="e.g. Koramangala, Bangalore" value={form.location} onChange={set('location')} />
          </div>

          <div className="field">
            <label htmlFor="contact">Seller Contact (phone / email)</label>
            <input id="contact" placeholder="e.g. +91-9876543210" value={form.contact} onChange={set('contact')} />
          </div>

          <div className="field">
            <label htmlFor="images">Image URLs <span style={{ fontWeight: 400, color: 'var(--text3)' }}>(comma-separated)</span></label>
            <input id="images" placeholder="https://…, https://…" value={form.images} onChange={set('images')} />
          </div>

          <div className="form-section-label" style={{ marginTop: 4 }}>Conversation (Optional)</div>

          <div className="field">
            <label htmlFor="chatText">Paste chat with seller</label>
            <textarea id="chatText" placeholder="Copy-paste the conversation to detect pressure tactics…" value={form.chatText} onChange={set('chatText')} />
          </div>

          <button id="analyze-btn" className="btn-primary" onClick={analyze} disabled={loading}>
            {loading ? '⏳ Analyzing…' : '🔍 Detect Scam'}
          </button>
        </div>

        <div className="btn-row">
          <button className="btn-secondary" style={{ flex: 1 }} onClick={loadDemo} id="demo-btn">📋 Load Demo</button>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={reset} id="reset-btn">↩ Reset</button>
        </div>

        {history.length > 0 && (
          <div className="history-panel">
            <div className="history-header">
              <span className="history-title">Recent Scans ({history.length})</span>
            </div>
            <div className="history-items">
              {history.slice(0, 8).map(item => (
                <HistoryItem key={item.id} item={item} onClick={() => {}} />
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        {error && (
          <div className="error-banner animate-in">
            ⚠️ {error}
          </div>
        )}

        {!loading && !result && (
          <div className="welcome-state">
            <div className="welcome-icon">🏠</div>
            <h2>Rental Scam Detector</h2>
            <p>Paste any rental listing into the form — we'll analyze it and give you an instant scam risk report.</p>
            <div className="feature-pills">
              {['🖼️ Image Reuse', '💰 Price Check', '🔍 Keywords', '📋 Duplicates', '📞 Seller Verify', '💬 Chat Analysis', '🔮 Scam Predictor'].map(f => (
                <span key={f} className="pill">{f}</span>
              ))}
            </div>
            <button className="btn-primary" style={{ maxWidth: 220 }} onClick={loadDemo} id="welcome-demo-btn">
              📋 Try a Demo Listing
            </button>
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>Analyzing listing for scam signals…</p>
          </div>
        )}

        {result && !loading && (
          <div className="animate-in">
            {/* Header */}
            <div className="result-header">
              <div>
                <div className="result-title">Analysis Complete • {new Date(result.scannedAt).toLocaleTimeString()}</div>
                <div className="result-listing-name">{form.title || 'Untitled Listing'}</div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div className={`risk-badge ${RISK_CLASS[result.riskLevel]}`}>
                    {RISK_EMOJI[result.riskLevel]} {result.riskLevel} Risk
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>
                    Confidence: <strong style={{ color: 'var(--heading)' }}>{result.confidence}%</strong>
                  </span>
                </div>
              </div>
              <Gauge score={result.scamScore} riskLevel={result.riskLevel} />
            </div>

            {/* Scam Type */}
            {result.scamType?.type && (
              <div className={`scam-type-chip ${result.scamType.type === 'unknown' ? 'unknown' : ''}`}>
                {SCAM_TYPE_LABELS[result.scamType.type] || result.scamType.type}
                {result.scamType.type !== 'unknown' && (
                  <span style={{ opacity: 0.7, fontWeight: 400 }}>
                    {' '}· {Math.round(result.scamType.confidence)}% match
                  </span>
                )}
              </div>
            )}

            {/* Score Breakdown */}
            <div className="section-title">Risk Breakdown</div>
            <div className="cards-grid" style={{ marginBottom: 28 }}>
              <ScoreCard label="Image Risk"     icon="🖼️" score={result.breakdown.imageRisk}     weight={result.weights?.imageRisk || 0.30} />
              <ScoreCard label="Price Risk"     icon="💰" score={result.breakdown.priceRisk}     weight={result.weights?.priceRisk || 0.25} />
              <ScoreCard label="Text Risk"      icon="📝" score={result.breakdown.textRisk}      weight={result.weights?.textRisk || 0.20} />
              <ScoreCard label="Duplicate Risk" icon="📋" score={result.breakdown.duplicateRisk} weight={result.weights?.duplicateRisk || 0.15} />
              <ScoreCard label="Seller Risk"    icon="👤" score={result.breakdown.sellerRisk}    weight={result.weights?.sellerRisk || 0.10} />
              {result.breakdown.conversationRisk > 0 && (
                <ScoreCard label="Chat Risk" icon="💬" score={result.breakdown.conversationRisk} weight={0.10} />
              )}
            </div>

            {/* Explanations */}
            <div className="section-title">Findings</div>
            <div className="explanation-list">
              {(result.explanations || []).map((ex, i) => (
                <div key={i} className="explanation-item">{ex}</div>
              ))}
            </div>

            {/* Predictions */}
            {result.predictions?.length > 0 && result.predictions[0] !== '✅ No concerning patterns found to predict a scam flow.' && (
              <>
                <div className="section-title">🔮 What Happens Next</div>
                <div className="predictions-list">
                  {result.predictions.map((p, i) => (
                    <div key={i} className="prediction-step">
                      <div className="step-num">{i + 1}</div>
                      <div className="prediction-text">{p}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Seller Insights */}
            {result.sellerInsights?.length > 0 && (
              <>
                <div className="section-title">Seller Insights</div>
                <div className="insight-list">
                  {result.sellerInsights.map((s, i) => (
                    <div key={i} className="insight-item">🔎 {s}</div>
                  ))}
                </div>
              </>
            )}

            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>
              Scan ID: <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{result.scanId}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
