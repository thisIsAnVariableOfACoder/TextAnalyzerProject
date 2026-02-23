import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import './Header.css'

function Header() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    navigate('/login')
  }

  return (
    <header className="header">
      <div className="container header-content">
        <Link to="/" className="logo">
          <span className="logo-icon">📄</span>
          <span className="logo-text">TextAnalyzer</span>
        </Link>

        <nav className="nav-main">
          <Link to="/" className="nav-link">
            Dashboard
          </Link>
          <Link to="/editor" className="nav-link">
            Editor
          </Link>
          <Link to="/history" className="nav-link">
            History
          </Link>
        </nav>

        <div className="header-right">
          {user && (
            <div className="user-menu">
              <button
                className="user-button"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <span className="user-avatar">{user.username?.[0].toUpperCase()}</span>
                <span className="user-name">{user.username}</span>
                <span className="dropdown-icon">▼</span>
              </button>

              {menuOpen && (
                <div className="dropdown-menu">
                  <Link
                    to="/account"
                    className="dropdown-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    My Account
                  </Link>
                  <hr className="dropdown-divider" />
                  <button
                    className="dropdown-item logout"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
