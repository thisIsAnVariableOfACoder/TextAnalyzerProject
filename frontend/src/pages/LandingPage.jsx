import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import './LandingPage.css'

function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()

  const ctaLink = useMemo(() => (isAuthenticated ? '/dashboard' : '/login'), [isAuthenticated])

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-content">
          <span className="landing-badge">Professional OCR + Text AI Suite</span>
          <h1>Transform your text workflow with confidence</h1>
          <p>
            Extract text from images, correct grammar in-place, paraphrase with multiple options,
            and translate accurately across languages in one streamlined editor.
          </p>

          <div className="landing-actions">
            <Link to={ctaLink} className="btn btn-primary btn-lg">
              {isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
            </Link>
            <Link to="/editor" className="btn btn-secondary btn-lg">
              Open Editor
            </Link>
          </div>

          <div className="landing-meta">
            <div><strong>Navy Blue</strong> professional UI</div>
            <div><strong>OCR + Grammar + Paraphrase + Translate</strong> in one place</div>
            <div><strong>History + Export</strong> for production workflow</div>
          </div>
        </div>

        <div className="landing-hero-card">
          <h3>Workspace Preview</h3>
          <ul>
            <li>✓ OCR extraction with robust fallback</li>
            <li>✓ Grammar suggestions applied to original text</li>
            <li>✓ Multi-option paraphrase selection</li>
            <li>✓ Better multilingual translation quality</li>
          </ul>
          <div className="landing-hero-user">
            {isAuthenticated ? `Signed in as ${user?.username || 'user'}` : 'Not signed in'}
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/dashboard')}>
            Dashboard
          </button>
        </div>
      </section>
    </div>
  )
}

export default LandingPage

