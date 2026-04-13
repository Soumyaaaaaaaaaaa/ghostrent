export default function ScoreCard({ label, icon, score, weight }) {
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
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
        Weight: {(weight * 100).toFixed(0)}%
      </div>
    </div>
  )
}
