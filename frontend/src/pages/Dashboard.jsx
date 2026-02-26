import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import useHistoryStore from '../stores/historyStore'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const { history, fetchHistory } = useHistoryStore()

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    fetchHistory().catch(() => {})
  }, [isAuthenticated, navigate, fetchHistory])

  const features = [
    {
      id: 'ocr',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
          <path d="M7 8h10M7 12h6M7 16h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="18" cy="18" r="4" fill="#3B82F6" stroke="white" strokeWidth="1.5"/>
          <path d="M16.5 18l1 1 2-2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: 'OCR Recognition',
      description: 'Extract text from images, screenshots, and scanned documents with AI-powered optical character recognition.',
      badge: 'Free',
      badgeColor: 'success',
      action: () => navigate('/editor?mode=ocr'),
      color: '#3B82F6',
      bgColor: '#DBEAFE',
      stats: 'Backend OCR'
    },
    {
      id: 'grammar',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: 'Grammar Check',
      description: 'Detect and fix grammar errors, spelling mistakes, and punctuation issues with intelligent suggestions.',
      badge: 'Smart',
      badgeColor: 'primary',
      action: () => navigate('/editor?mode=grammar'),
      color: '#10B981',
      bgColor: '#D1FAE5',
      stats: 'Local Grammar Engine'
    },
    {
      id: 'paraphrase',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: 'Paraphrase',
      description: 'Rewrite and improve your text with multiple styles: normal, formal, or casual tone.',
      badge: 'AI',
      badgeColor: 'warning',
      action: () => navigate('/editor?mode=paraphrase'),
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      stats: 'Local Paraphrase Engine'
    },
    {
      id: 'translate',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M3 5h12M9 3v2m-3.232 13.232l2.828-2.829m0 0l3.536 3.536M8.596 17.403L12 14M2 21l4.5-4.5M21 15l-3-3-3 3M18 12v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: 'Translation',
      description: 'Translate text between 28+ languages with high accuracy and automatic language detection.',
      badge: '28+ langs',
      badgeColor: 'primary',
      action: () => navigate('/editor?mode=translate'),
      color: '#8B5CF6',
      bgColor: '#EDE9FE',
      stats: 'Local Translation Engine'
    },
    {
      id: 'reader',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M3 5a2 2 0 012-2h5a3 3 0 013 3v13a3 3 0 00-3-3H5a2 2 0 01-2-2V5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M21 5a2 2 0 00-2-2h-5a3 3 0 00-3 3v13a3 3 0 013-3h5a2 2 0 002-2V5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: 'Universal Reader',
      description: 'Open PDF/DOCX/DOC/TXT with format-specific providers for native rendering, keyboard navigation, fullscreen page controls, and bookmarks.',
      badge: 'New',
      badgeColor: 'primary',
      action: () => navigate('/universal-reader'),
      color: '#1E40AF',
      bgColor: '#DBEAFE',
      stats: 'Provider-based Native Viewer'
    }
  ]

  const recentItems = history.slice(0, 5)

  const typeConfig = {
    ocr: { label: 'OCR', color: '#3B82F6', bg: '#DBEAFE' },
    grammar: { label: 'Grammar', color: '#10B981', bg: '#D1FAE5' },
    paraphrase: { label: 'Paraphrase', color: '#F59E0B', bg: '#FEF3C7' },
    translate: { label: 'Translate', color: '#8B5CF6', bg: '#EDE9FE' },
  }

  const stats = [
    { label: 'Documents Processed', value: history.length || 0, icon: '📄' },
    { label: 'Languages Supported', value: '28+', icon: '🌐' },
    { label: 'OCR Accuracy', value: '99%', icon: '🎯' },
    { label: 'Processing Speed', value: '<3s', icon: '⚡' },
  ]

  return (
    <div className="dashboard">
      {/* Hero Section */}
      <section className="dashboard-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot"></span>
            AI-Powered Text Processing
          </div>
          <h1 className="hero-title">
            Welcome back,{' '}
            <span className="hero-name">{user?.username || 'User'}</span>
          </h1>
          <p className="hero-subtitle">
            Your professional workspace for OCR, grammar checking, paraphrasing, and multilingual translation.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/editor')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              Start Processing
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => navigate('/history')}>
              View History
            </button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-card-stack">
            <div className="hero-card hero-card-1">
              <div className="hc-icon">🔍</div>
              <div className="hc-text">
                <span className="hc-label">OCR Extracted</span>
                <span className="hc-value">2,847 chars</span>
              </div>
              <span className="hc-badge success">✓ Done</span>
            </div>
            <div className="hero-card hero-card-2">
              <div className="hc-icon">✨</div>
              <div className="hc-text">
                <span className="hc-label">Paraphrased</span>
                <span className="hc-value">3 variants</span>
              </div>
              <span className="hc-badge primary">AI</span>
            </div>
            <div className="hero-card hero-card-3">
              <div className="hc-icon">🌐</div>
              <div className="hc-text">
                <span className="hc-label">Translated to</span>
                <span className="hc-value">Vietnamese</span>
              </div>
              <span className="hc-badge purple">New</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="stats-bar">
        {stats.map((stat, idx) => (
          <div key={idx} className="stat-item">
            <span className="stat-icon">{stat.icon}</span>
            <div className="stat-content">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Powerful Tools</h2>
            <p className="section-subtitle">Everything you need for professional text processing</p>
          </div>
          <Link to="/editor" className="btn btn-outline btn-sm">
            Open Editor →
          </Link>
        </div>

        <div className="features-grid">
          {features.map(feature => (
            <div
              key={feature.id}
              className="feature-card"
              onClick={feature.action}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && feature.action()}
            >
              <div className="feature-card-top">
                <div
                  className="feature-icon-wrap"
                  style={{ background: feature.bgColor, color: feature.color }}
                >
                  {feature.icon}
                </div>
                <span
                  className={`badge badge-${feature.badgeColor}`}
                >
                  {feature.badge}
                </span>
              </div>

              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-desc">{feature.description}</p>

              <div className="feature-footer">
                <span className="feature-stats">{feature.stats}</span>
                <button
                  className="feature-cta"
                  style={{ color: feature.color }}
                  onClick={(e) => { e.stopPropagation(); feature.action(); }}
                >
                  Use Now →
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      {recentItems.length > 0 && (
        <section className="recent-section">
          <div className="section-header">
            <div>
              <h2 className="section-title">Recent Activity</h2>
              <p className="section-subtitle">Your latest processing history</p>
            </div>
            <Link to="/history" className="btn btn-outline btn-sm">
              View All →
            </Link>
          </div>

          <div className="recent-list">
            {recentItems.map(item => {
              const config = typeConfig[item.type] || typeConfig.ocr
              return (
                <div key={item.id} className="recent-item">
                  <div
                    className="recent-type-badge"
                    style={{ background: config.bg, color: config.color }}
                  >
                    {config.label}
                  </div>
                  <div className="recent-content">
                    <p className="recent-text">
                      {item.input_text?.substring(0, 80)}
                      {item.input_text?.length > 80 ? '...' : ''}
                    </p>
                    <span className="recent-date">
                      {new Date(item.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </span>
                  </div>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => navigate(`/editor?history=${item.id}`)}
                  >
                    View
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <div className="cta-icon">🚀</div>
          <h2>Ready to Process Your Text?</h2>
          <p>Upload an image for OCR, check grammar, paraphrase, or translate — all in one place.</p>
          <div className="cta-actions">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/editor')}>
              Open Editor
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => navigate('/history')}>
              View History
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Dashboard
