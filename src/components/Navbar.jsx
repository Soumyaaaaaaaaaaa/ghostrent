import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

const NAV_LINKS = [
  { to: '/',        label: 'Home' },
  { to: '/analyze', label: 'Analyze' },
  { to: '/history', label: 'History' },
]

export default function Navbar() {
  const { theme, toggle } = useTheme()
  const { isAuthenticated, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/auth')
  }

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
        {isAuthenticated ? (
          <button onClick={handleLogout} className="nav-link" style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            Logout
          </button>
        ) : (
          <Link to="/auth" className="nav-link" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Login
          </Link>
        )}
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
