import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'

const API = 'http://localhost:3000'
const RISK_CLASS = { Low: 'low', Medium: 'medium', High: 'high' }
const RISK_EMOJI = { Low: '🟢', Medium: '🟡', High: '🔴' }
const SCAM_LABELS = {
  advance_payment_scam: '💸 Advance Payment',
  fake_broker_scam:     '👤 Fake Broker',
  military_scam:        '🎖️ Military',
  unknown:              '❓ Unknown',
}

export default function HistoryPage() {
  const [history, setHistory]   = useState([])
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [filter, setFilter]     = useState('all')
  const [search, setSearch]     = useState('')
  const [cleared, setCleared]   = useState(false)
  const { token, logout }       = useAuth()

  const fetchHistory = async () => {
    setLoading(true); setError(null)
    try {
      const r = await fetch(`${API}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (r.status === 401) { logout(); return; }
      const d = await r.json()
      if (d.success) {
        setHistory(d.data)
        setStats(d.stats)
      } else {
        setError('Failed to load history.')
      }
    } catch {
      setError('Cannot connect to backend. Make sure it is running on port 3000.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchHistory() }, [])

  const filtered = history.filter(item => {
    const matchRisk   = filter === 'all' || item.riskLevel?.toLowerCase() === filter
    const matchSearch = !search || (item.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.location || '').toLowerCase().includes(search.toLowerCase())
    return matchRisk && matchSearch
  })

  return (
    <div className="page-shell">
      <Navbar />
      <div className="history-page-content">

        {/* Page Header */}
        <div className="history-page-header">
          <div>
            <h1 className="history-page-title">📋 Scan History</h1>
            <p className="history-page-sub">All listings analyzed this session (resets on server restart)</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn-secondary" onClick={fetchHistory} id="refresh-history-btn">🔄 Refresh</button>
            <Link to="/analyze" className="btn-primary" id="new-scan-btn" style={{ padding: '9px 18px', fontSize: 13, width: 'auto' }}>
              + New Scan
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="history-stats-row">
            <div className="hist-stat-card">
              <div className="hist-stat-val">{stats.totalScans}</div>
              <div className="hist-stat-lbl">Total Scans</div>
            </div>
            <div className="hist-stat-card danger">
              <div className="hist-stat-val" style={{ color: 'var(--red)' }}>{stats.highRiskScans}</div>
              <div className="hist-stat-lbl">High Risk</div>
            </div>
            <div className="hist-stat-card warn">
              <div className="hist-stat-val" style={{ color: 'var(--yellow)' }}>{stats.mediumRiskScans}</div>
              <div className="hist-stat-lbl">Medium Risk</div>
            </div>
            <div className="hist-stat-card safe">
              <div className="hist-stat-val" style={{ color: 'var(--green)' }}>{stats.lowRiskScans}</div>
              <div className="hist-stat-lbl">Low Risk</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="history-filters">
          <input
            className="history-search"
            placeholder="🔍 Search by title or location…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            id="history-search"
          />
          <div className="filter-pills">
            {['all', 'high', 'medium', 'low'].map(f => (
              <button
                key={f}
                id={`filter-${f}`}
                className={`filter-pill${filter === f ? ' active' : ''} ${f}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="loading-state" style={{ minHeight: 200 }}>
            <div className="spinner" />
            <p>Loading scan history…</p>
          </div>
        )}
        {error && <div className="error-banner">{error}</div>}

        {/* Empty State */}
        {!loading && !error && filtered.length === 0 && (
          <div className="welcome-state" style={{ minHeight: 300 }}>
            <div className="welcome-icon">{search || filter !== 'all' ? '🔍' : '📭'}</div>
            <h2>{search || filter !== 'all' ? 'No results found' : 'No scans yet'}</h2>
            <p>
              {search || filter !== 'all'
                ? 'Try clearing your search or filter.'
                : 'Analyze your first listing to see results here.'}
            </p>
            {!search && filter === 'all' && (
              <Link to="/analyze" className="btn-primary" style={{ maxWidth: 200 }} id="empty-state-analyze-btn">
                🔍 Analyze a Listing
              </Link>
            )}
          </div>
        )}

        {/* Table */}
        {!loading && !error && filtered.length > 0 && (
          <div className="history-table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Listing Title</th>
                  <th>Location</th>
                  <th>Scam Type</th>
                  <th>Score</th>
                  <th>Risk</th>
                  <th>Scanned At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => {
                  const cls = RISK_CLASS[item.riskLevel] || 'low'
                  return (
                    <tr key={item.id} className="history-row">
                      <td className="row-num">{idx + 1}</td>
                      <td className="row-title">
                        <span className={`row-dot ${cls}`} />
                        {item.title || 'Untitled'}
                      </td>
                      <td className="row-loc">{item.location || '—'}</td>
                      <td>{SCAM_LABELS[item.scamType] || '❓'}</td>
                      <td>
                        <span className="row-score" style={{
                          color: cls === 'high' ? 'var(--red)' : cls === 'medium' ? 'var(--yellow)' : 'var(--green)'
                        }}>
                          {item.scamScore}
                        </span>
                      </td>
                      <td>
                        <span className={`risk-badge ${cls}`}>
                          {RISK_EMOJI[item.riskLevel]} {item.riskLevel}
                        </span>
                      </td>
                      <td className="row-time">
                        {new Date(item.scannedAt).toLocaleString()}
                      </td>
                      <td>
                        <Link
                          to={`/analyze`}
                          className="btn-secondary"
                          style={{ padding: '4px 12px', fontSize: 12 }}
                          id={`re-analyze-${item.id}`}
                        >
                          Re-scan
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="table-footer">
              Showing {filtered.length} of {history.length} scan{history.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
