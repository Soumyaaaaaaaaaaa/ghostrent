import { useState, useCallback } from 'react'
import axios from 'axios'
import Navbar from '../components/Navbar'
import Gauge from '../components/Gauge'
import ScoreCard from '../components/ScoreCard'
import { useAuth } from '../context/AuthContext'

// ── Constants ────────────────────────────────────────────────────────────────

const API = 'http://localhost:3000'

const RISK_CLASS  = { Low: 'low', Medium: 'medium', High: 'high' }
const RISK_EMOJI  = { Low: '🟢', Medium: '🟡', High: '🔴' }

const SCAM_LABELS = {
  advance_payment_scam: '💸 Advance Payment Scam',
  fake_broker_scam:     '👤 Fake Broker Scam',
  military_scam:        '🎖️ Military / Overseas Scam',
  phishing_scam:        '🎣 Phishing Scam',
  unknown:              '❓ Unknown Type',
  Unknown:              '❓ Unknown Type',
  None:                 '✅ No Scam Type Detected',
  none:                 '✅ No Scam Type Detected',
}

// Loading step sequence shown while the API call is in-flight
const LOADING_STEPS = [
  { label: 'Analyzing description…',     ms: 300  },
  { label: 'Checking pricing patterns…', ms: 800  },
  { label: 'Running duplicate check…',   ms: 1300 },
  { label: 'Evaluating seller contact…', ms: 1700 },
  { label: 'Running AI reasoning…',      ms: 2200 },
  { label: 'Merging & scoring results…', ms: 2700 },
]

const STEP_ICONS = ['🔍', '💰', '📋', '👤', '🤖', '⚡']

const CONF_LEVEL = (c) => c >= 70 ? 'High' : c >= 40 ? 'Medium' : 'Low'
const CONF_CLASS = (c) => c >= 70 ? 'high'  : c >= 40 ? 'medium'  : 'low'

// ── Component ────────────────────────────────────────────────────────────────

export default function AnalyzePage() {
  // ── Form State ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    title:       '',
    description: '',
    rent:        '',
    location:    '',
    contact:     '',
    chat:        '',
  })

  // ── UI State ───────────────────────────────────────────────────────────────
  const [result,       setResult]       = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [stepIdx,      setStepIdx]      = useState(-1)
  const [error,        setError]        = useState(null)
  const [history,      setHistory]      = useState([])
  const [showBreakdown, setShowBreakdown] = useState(false)

  const { token, logout } = useAuth()

  // ── Helpers ────────────────────────────────────────────────────────────────

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const authHeaders = () => ({
    'Content-Type':  'application/json',
    Authorization:   `Bearer ${token}`,
  })

  const fetchHistory = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/history`, { headers: authHeaders() })
      if (data.success) setHistory(data.data)
    } catch (err) {
      if (err.response?.status === 401) logout()
    }
  }, [token, logout])

  // ── Load Demo Listing ──────────────────────────────────────────────────────

  const loadDemo = () => {
    setForm({
      title:       'URGENT!!! Luxury 3BHK Flat in Mumbai - VERY CHEAP!!',
      description: 'I am currently deployed overseas (army). I need a trustworthy god-fearing person to take care of my property. Rent is only ₹5000/month which is way below market. No visits possible — I will mail the key after you pay the advance. Pay now via Western Union. Genuine inquiries only. God bless.',
      rent:        '5000',
      location:    'Bandra, Mumbai',
      contact:     '1234567890',
      chat:        'Please send the advance today. Another buyer is interested.\nI promise this is 100% legitimate.\nTrust me, send the deposit first and I will mail the keys.',
    })
    setResult(null)
    setError(null)
    setShowBreakdown(false)
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  const reset = () => {
    setForm({ title: '', description: '', rent: '', location: '', contact: '', chat: '' })
    setResult(null)
    setError(null)
    setShowBreakdown(false)
  }

  // ── Analyze ────────────────────────────────────────────────────────────────

  const analyze = async () => {
    if (!form.title.trim() && !form.description.trim()) {
      setError('Please provide at least a listing title or description.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setStepIdx(0)
    setShowBreakdown(false)

    // Animate loading steps
    LOADING_STEPS.forEach((step, i) => {
      setTimeout(() => setStepIdx(i), step.ms)
    })

    // Build payload per spec
    const payload = {
      url:         form.title,       // spec: url maps to title
      description: form.description,
      chat:        form.chat,
      price:       Number(form.rent) || 0,
      location:    form.location,
      contact:     form.contact,
    }

    try {
      const { data } = await axios.post(`${API}/api/analyze`, payload, {
        headers: authHeaders(),
        timeout: 10000, // 10 second timeout
      })

      // Let loading animation finish before showing results
      setTimeout(() => {
        if (data.success) {
          setResult(data.data)
          fetchHistory()
        } else {
          setError(data.message || data.error || 'Analysis failed.')
        }
        setLoading(false)
      }, 3100)
    } catch (err) {
      setTimeout(() => {
        if (err.response?.status === 401) {
          logout()
        } else {
          setError(
            err.response?.data?.message ||
            err.response?.data?.error ||
            'Cannot connect to backend. Run: cd backend && npm start'
          )
        }
        setLoading(false)
      }, 500)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="page-shell">
      <Navbar />
      <div className="app-shell">

        {/* ── Sidebar (Input Form) ── */}
        <aside className="sidebar">
          <div className="form-wrap">
            <div className="form-section-label">Listing Details</div>

            <div className="field">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                placeholder="e.g. 2BHK Flat in Bandra, Mumbai"
                value={form.title}
                onChange={set('title')}
              />
            </div>

            <div className="field">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                placeholder="Paste the full listing description here…"
                value={form.description}
                onChange={set('description')}
                style={{ minHeight: 100 }}
              />
            </div>

            <div className="field">
              <label htmlFor="rent">Monthly Rent (₹)</label>
              <input
                id="rent"
                type="number"
                placeholder="e.g. 25000"
                value={form.rent}
                onChange={set('rent')}
                min="0"
              />
            </div>

            <div className="field">
              <label htmlFor="location">Location</label>
              <input
                id="location"
                placeholder="e.g. Koramangala, Bangalore"
                value={form.location}
                onChange={set('location')}
              />
            </div>

            <div className="field">
              <label htmlFor="contact">Seller Contact (phone / email)</label>
              <input
                id="contact"
                placeholder="e.g. +91-9876543210"
                value={form.contact}
                onChange={set('contact')}
              />
            </div>

            <div className="form-section-label" style={{ marginTop: 4 }}>
              Conversation <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--text3)' }}>(optional)</span>
            </div>

            <div className="field">
              <label htmlFor="chat">Chat with Seller</label>
              <textarea
                id="chat"
                placeholder="Paste WhatsApp / email conversation to detect pressure tactics…"
                value={form.chat}
                onChange={set('chat')}
                style={{ minHeight: 80 }}
              />
            </div>

            <button
              id="analyze-btn"
              className="btn-primary"
              onClick={analyze}
              disabled={loading}
            >
              {loading ? '⏳ Analyzing…' : '🔍 Detect Scam'}
            </button>
          </div>

          <div className="btn-row">
            <button className="btn-secondary" style={{ flex: 1 }} onClick={loadDemo} id="demo-btn">
              📋 Load Demo
            </button>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={reset} id="reset-btn">
              ↩ Reset
            </button>
          </div>

          {/* ── Sidebar History Panel ── */}
          {history.length > 0 && (
            <div className="history-panel">
              <div className="history-header">
                <span className="history-title">Recent Scans ({history.length})</span>
              </div>
              <div className="history-items">
                {history.slice(0, 8).map((item) => {
                  const cls = RISK_CLASS[item.riskLevel] || 'low'
                  return (
                    <div key={item.id} className="history-item">
                      <div className={`history-dot ${cls}`} />
                      <span className="history-label">{item.title || 'Untitled'}</span>
                      <span className="history-score">{item.scamScore}</span>
                      {item.aiUsed && (
                        <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 2 }}>AI</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </aside>

        {/* ── Main Content ── */}
        <main className="main-content">

          {/* Error Banner */}
          {error && <div className="error-banner animate-in">⚠️ {error}</div>}

          {/* Welcome State */}
          {!loading && !result && (
            <div className="welcome-state">
              <div className="welcome-icon">🏠</div>
              <h2>Rental Scam Detector</h2>
              <p>
                Paste any rental listing into the form — we'll analyze it using{' '}
                <strong>text analysis + AI reasoning</strong> and give you an instant scam risk report.
              </p>
              <div className="feature-pills">
                {[
                  '💰 Price Check',
                  '🔍 Keyword Detection',
                  '📋 Duplicate Scan',
                  '👤 Seller Verify',
                  '💬 Chat Analysis',
                  '🤖 AI Reasoning',
                  '🔮 Scam Predictor',
                ].map((f) => (
                  <span key={f} className="pill">{f}</span>
                ))}
              </div>
              <button
                className="btn-primary"
                style={{ maxWidth: 220 }}
                onClick={loadDemo}
                id="welcome-demo-btn"
              >
                📋 Try a Demo Listing
              </button>
            </div>
          )}

          {/* Loading Steps */}
          {loading && (
            <div className="loading-state">
              <div className="loading-steps">
                {LOADING_STEPS.map((step, i) => (
                  <div
                    key={i}
                    className={`loading-step ${
                      i < stepIdx ? 'done' : i === stepIdx ? 'active' : 'pending'
                    }`}
                  >
                    <div className="loading-step-dot">
                      {i < stepIdx ? '✔' : STEP_ICONS[i]}
                    </div>
                    <span>{step.label}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 12, textAlign: 'center' }}>
                Running hybrid logic + AI analysis…
              </p>
            </div>
          )}

          {/* ── Results ── */}
          {result && !loading && (
            <div className="animate-in">

              {/* Result Header */}
              <div className="result-header">
                <div>
                  <div className="result-title">
                    Analysis Complete · {new Date(result.scannedAt).toLocaleTimeString()}
                    {result.aiUsed && (
                      <span style={{
                        marginLeft: 8, fontSize: 11, fontWeight: 600,
                        background: 'linear-gradient(135deg,#6d28d9,#2563eb)',
                        color: '#fff', borderRadius: 100, padding: '2px 10px',
                      }}>🤖 AI + Logic</span>
                    )}
                  </div>
                  <div className="result-listing-name">{form.title || 'Untitled Listing'}</div>

                  <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Risk Badge */}
                    <div className={`risk-badge ${RISK_CLASS[result.riskLevel]}`}>
                      {RISK_EMOJI[result.riskLevel]} {result.riskLevel} Risk
                    </div>

                    {/* Confidence Badge */}
                    <div
                      className={`risk-badge ${CONF_CLASS(result.confidence)}`}
                      title={`Analysis confidence: ${result.confidence}%`}
                    >
                      {result.confidence}% Confidence · {CONF_LEVEL(result.confidence)}
                    </div>
                  </div>
                </div>

                {/* Gauge */}
                <Gauge score={result.scamScore} riskLevel={result.riskLevel} />
              </div>

              {/* Scam Type Chip */}
              {result.insights?.scamType && (
                <div className={`scam-type-chip ${
                  result.insights.scamType === 'unknown' || result.insights.scamType === 'Unknown' ? 'unknown' : ''
                }`}>
                  {SCAM_LABELS[result.insights.scamType] || result.insights.scamType}
                </div>
              )}

              {/* AI Unavailable Notice */}
              {!result.aiUsed && (
                <div style={{
                  fontSize: 12, color: 'var(--text3)', borderRadius: 8,
                  background: 'var(--surface2)', padding: '10px 14px',
                  marginBottom: 16, border: '1px dashed var(--border)',
                }}>
                  ⚠️ AI analysis was unavailable — results are based on the logic engine only.
                </div>
              )}

              {/* AI Insights Section */}
              {result.aiUsed && result.insights && (
                <>
                  <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    🤖 AI Insights
                    <span style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
                      background: 'linear-gradient(135deg,#6d28d9,#2563eb)',
                      color: '#fff', borderRadius: 100, padding: '2px 8px',
                    }}>Powered by Groq LLaMA 3</span>
                  </div>

                  <div style={{
                    background: 'var(--surface2)', borderRadius: 12, padding: '16px 20px',
                    marginBottom: 24, border: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column', gap: 14,
                  }}>
                    {/* Scam Type + Confidence row */}
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 170 }}>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          AI Scam Type
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--heading)' }}>
                          {SCAM_LABELS[result.insights.scamType] || result.insights.scamType || '—'}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 170 }}>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Confidence
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--heading)' }}>
                          {result.confidence}%
                        </div>
                      </div>
                    </div>

                    {/* Seller Insights */}
                    {result.insights.sellerInsights && result.insights.sellerInsights !== 'AI insights unavailable.' && (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Seller Behavior
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                          👤 {result.insights.sellerInsights}
                        </div>
                      </div>
                    )}

                    {/* AI Predictions */}
                    {result.insights.predictions?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Predicted Scammer Next Steps
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {result.insights.predictions.map((p, i) => (
                            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                              <div style={{
                                minWidth: 22, height: 22, borderRadius: '50%',
                                background: 'linear-gradient(135deg,#6d28d9,#2563eb)',
                                color: '#fff', fontSize: 11, fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                              }}>{i + 1}</div>
                              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{p}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Breakdown Toggle */}
              <div style={{ marginBottom: 12 }}>
                <button
                  id="toggle-breakdown-btn"
                  className="btn-secondary"
                  style={{ fontSize: 12, padding: '6px 16px' }}
                  onClick={() => setShowBreakdown((v) => !v)}
                >
                  {showBreakdown ? '▲ Hide' : '▼ Show'} Score Breakdown
                </button>
              </div>

              {showBreakdown && (
                <div style={{
                  background: 'var(--surface2)', borderRadius: 12, padding: '16px 20px',
                  marginBottom: 24, border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>
                    Final score = <strong>Logic 70%</strong>{' '}
                    {result.aiUsed ? '+ AI 30%' : '(AI unavailable — 100% logic)'}
                  </div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>Text Risk</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--heading)' }}>
                        {result.breakdown?.textRisk ?? '—'}
                        <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 4 }}>/ 100</span>
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>Price Risk</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--heading)' }}>
                        {result.breakdown?.priceRisk ?? '—'}
                        <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 4 }}>/ 100</span>
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>Seller Risk</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--heading)' }}>
                        {result.breakdown?.sellerRisk ?? '—'}
                        <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 4 }}>/ 100</span>
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 140, borderLeft: '1px solid var(--border)', paddingLeft: 20 }}>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>Final Score</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--heading)' }}>
                        {result.scamScore}
                        <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 4 }}>/ 100</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                        Confidence: {result.confidence}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Risk Breakdown Cards ── */}
              <div className="section-title">Risk Breakdown</div>
              <div className="cards-grid" style={{ marginBottom: 28 }}>
                <ScoreCard label="Text Risk"      icon="📝" score={result.breakdown?.textRisk}      weight={0.25} />
                <ScoreCard label="Price Risk"     icon="💰" score={result.breakdown?.priceRisk}     weight={0.25} />
                <ScoreCard label="Duplicate Risk" icon="📋" score={result.breakdown?.duplicateRisk} weight={0.25} />
                <ScoreCard label="Seller Risk"    icon="👤" score={result.breakdown?.sellerRisk}    weight={0.25} />
              </div>

              {/* ── Findings (Explanations) ── */}
              <div className="section-title">Findings</div>
              <div className="explanation-list">
                {(result.insights?.explanations || []).map((ex, i) => (
                  <div key={i} className="explanation-item">{ex}</div>
                ))}
              </div>

              {/* ── Predicted Scam Flow ── */}
              {result.insights?.predictions?.length > 0 &&
                result.insights.predictions[0] !== '✅ No concerning patterns found to predict a scam flow.' && (
                <>
                  <div className="section-title">🔮 What Happens Next</div>
                  <div className="predictions-list">
                    {result.insights.predictions.map((p, i) => (
                      <div key={i} className="prediction-step">
                        <div className="step-num">{i + 1}</div>
                        <div className="prediction-text">{p}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── Seller Insights ── */}
              {result.insights?.sellerInsights &&
                result.insights.sellerInsights !== 'AI insights unavailable.' && (
                <>
                  <div className="section-title">Seller Insights</div>
                  <div className="insight-list">
                    <div className="insight-item">
                      🔎 {result.insights.sellerInsights}
                    </div>
                  </div>
                </>
              )}

              {/* Scan ID */}
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>
                Scan ID:{' '}
                <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{result.scanId}</span>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
