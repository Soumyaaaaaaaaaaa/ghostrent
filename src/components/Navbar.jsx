import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

const NAV_LINKS = [
  { to: '/',        label: 'Home' },
  { to: '/analyze', label: 'Analyze' },
  { to: '/history', label: 'History' },
]

export default function Navbar() {
  const { theme, toggle } = useTheme()
  const { pathname } = useLocation()

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        <div className="nav-brand-icon">🛡️</div>
        <div>
          <div className="nav-brand-name">GhostRent</div>
          <div className="nav-brand-sub">Rental Scam Detector</div>
        </div>
      </Link>

      <div className="nav-links">
        {NAV_LINKS.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`nav-link${pathname === to ? ' active' : ''}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <button
        className="theme-toggle"
        onClick={toggle}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        id="theme-toggle-btn"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </nav>
  )
}
