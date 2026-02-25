import { Link } from 'react-router-dom'
import './Footer.css'

function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <div className="footer-logo-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 12h6M9 8h6M9 16h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span>TextAnalyzer</span>
          </Link>
          <p>AI-powered text processing platform for professionals.</p>
        </div>

        <div className="footer-links">
          <div className="footer-link-group">
            <h4>Features</h4>
            <Link to="/editor?mode=ocr">OCR Recognition</Link>
            <Link to="/editor?mode=grammar">Grammar Check</Link>
            <Link to="/editor?mode=paraphrase">Paraphrase</Link>
            <Link to="/editor?mode=translate">Translation</Link>
          </div>
          <div className="footer-link-group">
            <h4>Account</h4>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/history">History</Link>
            <Link to="/account">Profile</Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {currentYear} TextAnalyzer. Built with Mistral AI & LanguageTool.</p>
        <div className="footer-tech">
          <span className="tech-badge">React</span>
          <span className="tech-badge">FastAPI</span>
          <span className="tech-badge">Mistral AI</span>
          <span className="tech-badge">MongoDB</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
