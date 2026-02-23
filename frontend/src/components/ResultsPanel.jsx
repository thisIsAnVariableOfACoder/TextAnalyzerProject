import './ResultsPanel.css'

function ResultsPanel({ results, processingType, loading = false }) {
  if (!results && !loading) {
    return null
  }

  return (
    <div className="results-panel">
      <div className="results-header">
        <h3>
          {processingType ? processingType.charAt(0).toUpperCase() + processingType.slice(1) : 'Results'}
        </h3>
      </div>

      {loading ? (
        <div className="results-loading">
          <div className="loading-spinner">
            <div></div><div></div><div></div><div></div>
          </div>
          <p>Processing your text...</p>
        </div>
      ) : results ? (
        <div className="results-content">
          {/* Grammar Check Results */}
          {processingType === 'grammar' && results.suggestions && (
            <div className="results-section">
              <div className="section-stat">
                <span className="stat-label">Issues Found:</span>
                <span className="stat-value">{results.issues_found}</span>
              </div>

              {results.suggestions.length > 0 ? (
                <div className="suggestions-list">
                  {results.suggestions.map((suggestion, idx) => (
                    <div key={idx} className="suggestion-item">
                      <div className="suggestion-message">
                        <strong>Issue:</strong> {suggestion.message}
                      </div>
                      {suggestion.replacements.length > 0 && (
                        <div className="suggestion-replacements">
                          <strong>Suggestions:</strong>
                          {suggestion.replacements.map((replacement, ridx) => (
                            <span key={ridx} className="replacement-tag">
                              {replacement}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-issues">
                  <p>✓ No grammar issues found!</p>
                </div>
              )}

              <div className="corrected-text-section">
                <label>Corrected Text:</label>
                <p className="corrected-text">{results.corrected_text}</p>
              </div>
            </div>
          )}

          {/* Paraphrase Results */}
          {processingType === 'paraphrase' && results.paraphrased_text && (
            <div className="results-section">
              <div className="paraphrased-main">
                <label>Paraphrased Text:</label>
                <p className="result-text">{results.paraphrased_text}</p>
              </div>

              {results.alternatives && results.alternatives.length > 0 && (
                <div className="alternatives-section">
                  <label>Alternative Versions:</label>
                  <div className="alternatives-list">
                    {results.alternatives.map((alt, idx) => (
                      <div key={idx} className="alternative-item">
                        <p>{alt}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Translation Results */}
          {processingType === 'translate' && results.translated_text && (
            <div className="results-section">
              <div className="translation-info">
                <div className="lang-badge">
                  <span className="lang-from">{results.source_language}</span>
                  <span className="lang-arrow">→</span>
                  <span className="lang-to">{results.target_language}</span>
                </div>
                {results.detected_language && results.detected_language !== 'unknown' && (
                  <p className="detected-lang">
                    Detected language: {results.detected_language}
                  </p>
                )}
              </div>

              <div className="translated-main">
                <label>Translated Text:</label>
                <p className="result-text">{results.translated_text}</p>
              </div>
            </div>
          )}

          {/* OCR Results */}
          {processingType === 'ocr' && results.extracted_text && (
            <div className="results-section">
              <div className="ocr-stats">
                <div className="stat-item">
                  <span className="stat-label">Confidence:</span>
                  <span className="stat-value">
                    {(results.confidence_score * 100).toFixed(1)}%
                  </span>
                </div>
                {results.image_dimensions && (
                  <div className="stat-item">
                    <span className="stat-label">Image Size:</span>
                    <span className="stat-value">
                      {results.image_dimensions.width} × {results.image_dimensions.height}px
                    </span>
                  </div>
                )}
              </div>

              <div className="extracted-main">
                <label>Extracted Text:</label>
                <p className="result-text">{results.extracted_text}</p>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default ResultsPanel
