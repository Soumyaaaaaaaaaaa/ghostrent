const RISK_CLASS = { Low: 'low', Medium: 'medium', High: 'high' }

export default function Gauge({ score, riskLevel }) {
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
