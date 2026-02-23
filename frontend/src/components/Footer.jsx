import './Footer.css'

function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="container footer-content">
        <div className="footer-section">
          <h4>TextAnalyzer</h4>
          <p>Professional text processing and analysis platform with OCR, grammar checking, and multi-language translation.</p>
        </div>

        <div className="footer-section">
          <h4>Features</h4>
          <ul>
            <li><a href="#ocr">OCR Recognition</a></li>
            <li><a href="#grammar">Grammar Check</a></li>
            <li><a href="#paraphrase">Paraphrasing</a></li>
            <li><a href="#translate">Translation</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Support</h4>
          <ul>
            <li><a href="#docs">Documentation</a></li>
            <li><a href="#contact">Contact Us</a></li>
            <li><a href="#privacy">Privacy Policy</a></li>
            <li><a href="#terms">Terms of Service</a></li>
          </ul>
        </div>

        <div className="footer-bottom">
          <p>&copy; {currentYear} TextAnalyzer. All rights reserved.</p>
          <p>Designed with ❤️ for professional text processing</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
