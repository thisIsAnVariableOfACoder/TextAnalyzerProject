import { Link } from 'react-router-dom'
import AppSymbol from './AppSymbol'
import './Footer.css'

function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <div className="footer-logo-icon">
              <AppSymbol size={18} />
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
            <Link to="/universal-reader">Universal Reader</Link>
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
