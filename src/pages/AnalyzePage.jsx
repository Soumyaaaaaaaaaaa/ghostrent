import { useState, useCallback } from 'react'
import Navbar from '../components/Navbar'
import Gauge from '../components/Gauge'
import ScoreCard from '../components/ScoreCard'
import { useAuth } from '../context/AuthContext'

const API = 'http://localhost:3000'

const RISK_CLASS  = { Low: 'low', Medium: 'medium', High: 'high' }
const RISK_EMOJI  = { Low: '🟢', Medium: '🟡', High: '🔴' }
const SCAM_LABELS = {
  advance_payment_scam: '💸 Advance Payment Scam',
  fake_broker_scam:     '👤 Fake Broker Scam',
  military_scam:        '🎖️ Military / Overseas Scam',
  phishing_scam:        '🎣 Phishing Scam',
  unknown:              '❓ Unknown Type',
  None:                 '✅ No Scam Type Detected',
}

// ── Updated loading steps to include AI reasoning ──
const STEPS = [
  { label: 'Analyzing text & keywords…',    ms: 350  },
  { label: 'Checking price vs market…',      ms: 750  },
  { label: 'Evaluating images…',             ms: 1150 },
  { label: 'Running duplicate detection…',   ms: 1550 },
  { label: 'Verifying seller contact…',      ms: 1950 },
  { label: 'Analyzing conversation…',        ms: 2350 },
  { label: 'Running AI reasoning engine…',   ms: 2750 },
  { label: 'Merging & scoring results…',     ms: 3150 },
]

const CONF_LEVEL = (c) => c >= 70 ? 'High' : c >= 40 ? 'Medium' : 'Low'
const CONF_CLASS = (c) => c >= 70 ? 'high'  : c >= 40 ? 'medium'  : 'low'

function downloadPDF(result, formTitle) {
  const riskColor = { Low: '#22c55e', Medium: '#eab308', High: '#ef4444' }[result.riskLevel] || '#ccc'
  const html = `
    <html>
    <head>
      <title>GhostRent Scam Report – ${formTitle || 'Untitled'}</title>
      <style>
        body{font-family:sans-serif;padding:32px;color:#111;background:#fff}
        h1{font-size:22px;margin-bottom:4px}
        .sub{color:#666;font-size:13px;margin-bottom:24px}
        .score{font-size:48px;font-weight:800;color:${riskColor}}
        .risk{display:inline-block;background:${riskColor}22;color:${riskColor};border:1px solid ${riskColor}66;border-radius:100px;padding:3px 14px;font-size:13px;font-weight:600;margin-left:12px;vertical-align:middle}
        table{width:100%;border-collapse:collapse;margin:20px 0}
        td,th{text-align:left;padding:8px 12px;border:1px solid #e5e7eb;font-size:13px}
        th{background:#f9fafb;font-weight:600}
        ul{padding-left:20px}
        li{margin-bottom:6px;font-size:13px}
        .section{margin-top:24px}
        .section h2{font-size:15px;font-weight:700;margin-bottom:10px;color:#374151}
        .footer{margin-top:40px;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px}
        .ai-tag{background:#6d28d922;color:#6d28d9;border-radius:4px;padding:2px 7px;font-size:11px;font-weight:600}
      </style>
    </head>
    <body>
      <h1>🛡️ GhostRent Scam Report</h1>
      <div class="sub">Listing: ${formTitle || 'Untitled'} &nbsp;·&nbsp; Scan ID: ${result.scanId} &nbsp;·&nbsp; ${new Date(result.scannedAt).toLocaleString()} &nbsp;·&nbsp; ${result.aiUsed ? '<span class="ai-tag">AI + Logic</span>' : 'Logic Only'}</div>
      <div class="score">${result.scamScore}<span class="risk">${result.riskLevel} Risk</span></div>
      <p style="margin-top:8px;font-size:13px;color:#555">Confidence: <strong>${result.confidence}%</strong> &nbsp;·&nbsp; Scam Type: <strong>${SCAM_LABELS[result.scamType?.type] || result.scamType?.type || 'Unknown'}</strong></p>

      <div class="section">
        <h2>Risk Breakdown</h2>
        <table>
          <tr><th>Category</th><th>Score</th><th>Weight</th></tr>
          <tr><td>🖼️ Image Risk</td><td>${result.breakdown.imageRisk}</td><td>30%</td></tr>
          <tr><td>💰 Price Risk</td><td>${result.breakdown.priceRisk}</td><td>25%</td></tr>
          <tr><td>📝 Text Risk</td><td>${result.breakdown.textRisk}</td><td>20%</td></tr>
          <tr><td>📋 Duplicate Risk</td><td>${result.breakdown.duplicateRisk}</td><td>15%</td></tr>
          <tr><td>👤 Seller Risk</td><td>${result.breakdown.sellerRisk}</td><td>10%</td></tr>
          ${result.breakdown.conversationRisk > 0 ? `<tr><td>💬 Chat Risk</td><td>${result.breakdown.conversationRisk}</td><td>bonus</td></tr>` : ''}
        </table>
        ${result.aiUsed && result.aiInsights ? `<p style="font-size:12px;color:#6d28d9">🤖 AI contributed 30% to the final score (AI risk score: ${result.aiInsights.riskScore})</p>` : ''}
      </div>

      <div class="section">
        <h2>Findings</h2>
        <ul>${(result.explanations || []).map(e => `<li>${e}</li>`).join('')}</ul>
      </div>

      ${result.aiInsights ? `
      <div class="section">
        <h2>🤖 AI Insights</h2>
        <p><strong>Scam Type:</strong> ${result.aiInsights.scamType}</p>
        <p><strong>Seller Behaviour:</strong> ${result.aiInsights.sellerBehavior}</p>
        ${result.aiInsights.predictions?.length > 0 ? `<p><strong>Predicted Next Steps:</strong></p><ul>${result.aiInsights.predictions.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}
      </div>` : ''}

      ${result.predictions?.length > 0 ? `
      <div class="section">
        <h2>🔮 Predicted Scam Flow</h2>
        <ul>${result.predictions.map(p => `<li>${p}</li>`).join('')}</ul>
      </div>` : ''}

      ${result.sellerInsights?.length > 0 ? `
      <div class="section">
        <h2>Seller Insights</h2>
        <ul>${result.sellerInsights.map(s => `<li>${s}</li>`).join('')}</ul>
      </div>` : ''}

      <div class="footer">Generated by GhostRent · ghostrent.app · Report is based on heuristic + AI analysis. Always verify independently.</div>
    </body>
    </html>
  `
  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
  w.focus()
  w.print()
}

export default function AnalyzePage() {
  const [form, setForm] = useState({
    title: '', description: '', price: '', location: '',
    contact: '', images: '', chatText: ''
  })
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [stepIdx, setStepIdx]       = useState(-1)
  const [error, setError]           = useState(null)
  const [history, setHistory]       = useState([])
  const [showBreakdown, setShowBreakdown] = useState(false)  // breakdown toggle
  const { token, logout }           = useAuth()

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const fetchHistory = useCallback(async () => {
    try {
      const r = await fetch(`${API}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (r.status === 401) { logout(); return; }
      const d = await r.json()
      if (d.success) setHistory(d.data)
    } catch { /* ignore */ }
  }, [token, logout])

  const loadDemo = async () => {
    try {
      const r = await fetch(`${API}/demo`)
      const d = await r.json()
      if (d.success) {
        const scam = d.demos[1].input
        setForm({
          title:       scam.title,
          description: scam.description,
          price:       String(scam.price),
          location:    scam.location,
          contact:     scam.contact,
          images:      (scam.images || []).join(', '),
          chatText:    scam.chatText || ''
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
    setLoading(true); setError(null); setResult(null); setStepIdx(0); setShowBreakdown(false)

    STEPS.forEach((step, i) => {
      setTimeout(() => setStepIdx(i), step.ms)
    })

    try {
      const body = {
        title:       form.title,
        description: form.description,
        price:       Number(form.price) || 0,
        location:    form.location,
        contact:     form.contact,
        images:      form.images ? form.images.split(',').map(s => s.trim()).filter(Boolean) : [],
        chatText:    form.chatText
      }
      const r = await fetch(`${API}/analyze`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      })
      if (r.status === 401) { logout(); return; }
      const d = await r.json()
      if (d.success) {
        setTimeout(() => {
          setResult(d.data)
          setLoading(false)
          fetchHistory()
        }, 3600)
      } else {
        setError(d.message || d.error || 'Analysis failed.')
        setLoading(false)
      }
    } catch {
      setError('Cannot connect to backend. Run: cd backend && npm start')
      setLoading(false)
    }
  }

  const reset = () => {
    setForm({ title: '', description: '', price: '', location: '', contact: '', images: '', chatText: '' })
    setResult(null); setError(null); setShowBreakdown(false)
  }

  // Helper to get step icon
  const stepIcon = (i) => {
    const icons = ['🔍', '💰', '🖼️', '📋', '📞', '💬', '🤖', '⚡']
    return icons[i] || '•'
  }

  return (
    <div className="page-shell">
      <Navbar />
      <div className="app-shell">
        {/* ── Sidebar ── */}
        <aside className="sidebar">
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
            <button className="btn-secondary" style={{ flex: 1 }} onClick={reset}     id="reset-btn">↩ Reset</button>
          </div>

          {history.length > 0 && (
            <div className="history-panel">
              <div className="history-header">
                <span className="history-title">Recent Scans ({history.length})</span>
              </div>
              <div className="history-items">
                {history.slice(0, 8).map(item => {
                  const cls = RISK_CLASS[item.riskLevel] || 'low'
                  return (
                    <div key={item.id} className="history-item">
                      <div className={`history-dot ${cls}`} />
                      <span className="history-label">{item.title || 'Untitled'}</span>
                      <span className="history-score">{item.scamScore}</span>
                      {item.aiUsed && <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 4 }}>AI</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </aside>

        {/* ── Main ── */}
        <main className="main-content">
          {error && (
            <div className="error-banner animate-in">⚠️ {error}</div>
          )}

          {!loading && !result && (
            <div className="welcome-state">
              <div className="welcome-icon">🏠</div>
              <h2>Rental Scam Detector</h2>
              <p>Paste any rental listing into the form — we'll analyze it using <strong>logic + AI</strong> and give you an instant scam risk report.</p>
              <div className="feature-pills">
                {['🖼️ Image Reuse', '💰 Price Check', '🔍 Keywords', '📋 Duplicates', '📞 Seller Verify', '💬 Chat Analysis', '🤖 AI Reasoning', '🔮 Scam Predictor'].map(f => (
                  <span key={f} className="pill">{f}</span>
                ))}
              </div>
              <button className="btn-primary" style={{ maxWidth: 220 }} onClick={loadDemo} id="welcome-demo-btn">
                📋 Try a Demo Listing
              </button>
            </div>
          )}

          {/* ── Loading Steps UI ── */}
          {loading && (
            <div className="loading-state">
              <div className="loading-steps">
                {STEPS.map((step, i) => (
                  <div
                    key={i}
                    className={`loading-step ${i < stepIdx ? 'done' : i === stepIdx ? 'active' : 'pending'}`}
                  >
                    <div className="loading-step-dot">
                      {i < stepIdx ? '✔' : stepIcon(i)}
                    </div>
                    <span>{step.label}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 16, textAlign: 'center' }}>
                Running hybrid logic + AI analysis…
              </p>
            </div>
          )}

          {/* ── Results ── */}
          {result && !loading && (
            <div className="animate-in">
              {/* Header */}
              <div className="result-header">
                <div>
                  <div className="result-title">
                    Analysis Complete · {new Date(result.scannedAt).toLocaleTimeString()}
                    {result.aiUsed && (
                      <span style={{
                        marginLeft: 8, fontSize: 11, fontWeight: 600,
                        background: 'linear-gradient(135deg,#6d28d9,#2563eb)',
                        color: '#fff', borderRadius: 100, padding: '2px 10px'
                      }}>🤖 AI + Logic</span>
                    )}
                  </div>
                  <div className="result-listing-name">{form.title || 'Untitled Listing'}</div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className={`risk-badge ${RISK_CLASS[result.riskLevel]}`}>
                      {RISK_EMOJI[result.riskLevel]} {result.riskLevel} Risk
                    </div>

                    {/* ── Confidence Badge ── */}
                    <div className={`risk-badge ${CONF_CLASS(result.confidence)}`} title={`Analysis confidence: ${result.confidence}%`}>
                      {result.confidence}% Confidence · {CONF_LEVEL(result.confidence)}
                    </div>

                    <button
                      id="download-pdf-btn"
                      className="btn-secondary"
                      style={{ padding: '4px 14px', fontSize: 12 }}
                      onClick={() => downloadPDF(result, form.title)}
                    >
                      📄 Download PDF
                    </button>
                  </div>
                </div>
                <Gauge score={result.scamScore} riskLevel={result.riskLevel} />
              </div>

              {/* Scam Type */}
              {result.scamType?.type && (
                <div className={`scam-type-chip ${result.scamType.type === 'unknown' ? 'unknown' : ''}`}>
                  {SCAM_LABELS[result.scamType.type] || result.scamType.type}
                  {result.scamType.type !== 'unknown' && (
                    <span style={{ opacity: 0.7, fontWeight: 400 }}>
                      {' '}· {Math.round(result.scamType.confidence)}% match
                      {result.scamType.aiConfirmed && ' · ✓ AI confirmed'}
                    </span>
                  )}
                </div>
              )}

              {/* ── AI Insights Section ── */}
              {result.aiUsed && result.aiInsights && (
                <>
                  <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    🤖 AI Insights
                    <span style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
                      background: 'linear-gradient(135deg,#6d28d9,#2563eb)',
                      color: '#fff', borderRadius: 100, padding: '2px 8px'
                    }}>Powered by Groq LLaMA 3</span>
                  </div>
                  <div style={{
                    background: 'var(--surface2)', borderRadius: 12, padding: '16px 20px',
                    marginBottom: 24, border: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column', gap: 12
                  }}>
                    {/* Scam Type row */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Scam Type</div>
                        <div style={{ fontWeight: 600, color: 'var(--heading)' }}>
                          {SCAM_LABELS[result.aiInsights.scamType] || result.aiInsights.scamType || '—'}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Confidence</div>
                        <div style={{ fontWeight: 600, color: 'var(--heading)' }}>
                          {result.aiInsights.confidence}%
                        </div>
                      </div>
                    </div>

                    {/* Seller Behavior */}
                    {result.aiInsights.sellerBehavior && result.aiInsights.sellerBehavior !== 'Unavailable' && (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Seller Behavior Assessment</div>
                        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                          👤 {result.aiInsights.sellerBehavior}
                        </div>
                      </div>
                    )}

                    {/* AI Predictions */}
                    {result.aiInsights.predictions?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI-Predicted Next Steps by Scammer</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {result.aiInsights.predictions.map((p, i) => (
                            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                              <div style={{
                                minWidth: 22, height: 22, borderRadius: '50%',
                                background: 'linear-gradient(135deg,#6d28d9,#2563eb)',
                                color: '#fff', fontSize: 11, fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
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

              {!result.aiUsed && (
                <div style={{
                  fontSize: 12, color: 'var(--text3)', borderRadius: 8,
                  background: 'var(--surface2)', padding: '10px 14px',
                  marginBottom: 16, border: '1px dashed var(--border)'
                }}>
                  ⚠️ AI analysis was unavailable — results are based on logic engine only. Confidence is reduced.
                </div>
              )}

              {/* ── Analysis Breakdown Toggle ── */}
              <div style={{ marginBottom: 12 }}>
                <button
                  id="toggle-breakdown-btn"
                  className="btn-secondary"
                  style={{ fontSize: 12, padding: '6px 16px' }}
                  onClick={() => setShowBreakdown(v => !v)}
                >
                  {showBreakdown ? '▲ Hide' : '▼ Show'} Analysis Breakdown (Logic vs AI)
                </button>
              </div>

              {showBreakdown && (
                <div style={{
                  background: 'var(--surface2)', borderRadius: 12, padding: '16px 20px',
                  marginBottom: 24, border: '1px solid var(--border)'
                }}>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
                    Final score = <strong>Logic 70%</strong> {result.aiUsed ? '+ AI 30%' : '(AI unavailable, 100% logic)'}
                  </div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Logic Engine</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--heading)' }}>
                        {/* Logic score = final score before AI blend. Approximate by showing breakdown */}
                        {result.breakdown.textRisk || '—'}
                        <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 4 }}>text risk</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                        Image: {result.breakdown.imageRisk} · Price: {result.breakdown.priceRisk} · Seller: {result.breakdown.sellerRisk}
                      </div>
                    </div>
                    {result.aiUsed && result.aiInsights && (
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Engine</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#6d28d9' }}>
                          {result.aiInsights.riskScore}
                          <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 4 }}>AI score</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                          AI Confidence: {result.aiInsights.confidence}% · Model: LLaMA 3 (Groq)
                        </div>
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 140, borderLeft: '1px solid var(--border)', paddingLeft: 20 }}>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Final Score</div>
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

              {/* Findings */}
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
    </div>
  )
}
