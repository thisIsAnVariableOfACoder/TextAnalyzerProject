import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import './Header.css'

function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
    setMenuOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    navigate('/login')
  }

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: '⊞' },
    { to: '/editor', label: 'Editor', icon: '✏️' },
    { to: '/history', label: 'History', icon: '🕐' },
  ]

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <header className={`header ${scrolled ? 'header-scrolled' : ''}`}>
      <div className="header-inner">
        {/* Logo */}
        <Link to="/" className="logo">
          <div className="logo-icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12h6M9 8h6M9 16h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="18" cy="18" r="4" fill="#3B82F6" stroke="white" strokeWidth="1.5"/>
              <path d="M16.5 18l1 1 2-2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="logo-text-wrap">
            <span className="logo-name">TextAnalyzer</span>
            <span className="logo-tagline">AI-Powered</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="nav-main">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link ${isActive(link.to) ? 'nav-link-active' : ''}`}
            >
              <span className="nav-icon">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        {/* Right Section */}
        <div className="header-right">
          {user ? (
            <div className="user-menu" ref={dropdownRef}>
              <button
                className={`user-button ${menuOpen ? 'user-button-active' : ''}`}
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                <div className="user-avatar">
                  {user.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="user-info">
                  <span className="user-name">{user.username}</span>
                  <span className="user-role">Member</span>
                </div>
                <svg
                  className={`dropdown-chevron ${menuOpen ? 'rotated' : ''}`}
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                >
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {menuOpen && (
                <div className="dropdown-menu animate-scaleIn">
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">
                      {user.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="dropdown-username">{user.username}</p>
                      <p className="dropdown-email">{user.email || 'member@textanalyzer.ai'}</p>
                    </div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <Link to="/account" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    My Account
                  </Link>
                  <Link to="/history" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M12 8v4l3 3M3.05 11a9 9 0 1 0 .5-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    History
                  </Link>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item dropdown-item-danger" onClick={handleLogout}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="mobile-nav animate-fadeIn">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`mobile-nav-link ${isActive(link.to) ? 'mobile-nav-link-active' : ''}`}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
          {user && (
            <>
              <div className="mobile-nav-divider"></div>
              <Link to="/account" className="mobile-nav-link">
                <span>👤</span>
                <span>My Account</span>
              </Link>
              <button className="mobile-nav-link mobile-nav-logout" onClick={handleLogout}>
                <span>🚪</span>
                <span>Sign Out</span>
              </button>
            </>
          )}
        </div>
      )}
    </header>
  )
}

export default Header
