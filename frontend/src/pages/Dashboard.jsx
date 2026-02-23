import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import useHistoryStore from '../stores/historyStore'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { history } = useHistoryStore()

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, navigate])

  const features = [
    {
      id: 'ocr',
      icon: '🔍',
      title: 'OCR Recognition',
      description: 'Extract text from images using advanced optical character recognition',
      action: () => navigate('/editor?mode=ocr')
    },
    {
      id: 'grammar',
      icon: '✓',
      title: 'Grammar Check',
      description: 'Check and improve grammar, spelling, and punctuation',
      action: () => navigate('/editor?mode=grammar')
    },
    {
      id: 'paraphrase',
      icon: '✨',
      title: 'Paraphrase',
      description: 'Rewrite and improve your text with intelligent paraphrasing',
      action: () => navigate('/editor?mode=paraphrase')
    },
    {
      id: 'translate',
      icon: '🌐',
      title: 'Translate',
      description: 'Translate text to 50+ languages with high accuracy',
      action: () => navigate('/editor?mode=translate')
    }
  ]

  const recentItems = history.slice(0, 5)

  return (
    <div className="dashboard">
      <div className="dashboard-hero">
        <h1>Welcome to TextAnalyzer</h1>
        <p>Your professional text processing and analysis platform</p>
      </div>

      <section className="features-section">
        <h2>Key Features</h2>
        <div className="features-grid">
          {features.map(feature => (
            <div key={feature.id} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <button
                className="btn btn-primary"
                onClick={feature.action}
              >
                Get Started
              </button>
            </div>
          ))}
        </div>
      </section>

      {recentItems.length > 0 && (
        <section className="recent-section">
          <div className="section-header">
            <h2>Recent Activity</h2>
            <a href="/history" className="view-all-link">
              View All →
            </a>
          </div>

          <div className="recent-list">
            {recentItems.map(item => (
              <div key={item.id} className="recent-item">
                <div className="item-type">
                  <span className={`type-badge type-${item.type}`}>
                    {item.type.toUpperCase()}
                  </span>
                </div>
                <div className="item-content">
                  <p className="item-text">
                    {item.input_text.substring(0, 100)}...
                  </p>
                  <span className="item-date">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => navigate(`/editor?history=${item.id}`)}
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="cta-section">
        <h2>Ready to Process Your Text?</h2>
        <p>Start with OCR, grammar checking, paraphrasing, or translation</p>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => navigate('/editor')}
        >
          Go to Editor
        </button>
      </section>
    </div>
  )
}

export default Dashboard
