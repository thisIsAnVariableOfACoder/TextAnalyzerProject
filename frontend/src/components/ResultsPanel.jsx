import { useState } from 'react'
import toast from 'react-hot-toast'
import './ResultsPanel.css'

function ResultsPanel({
  results,
  processingType,
  onUseText,
  onApplyGrammarSuggestion,
  onIgnoreGrammarSuggestion,
  onFocusGrammarIssue,
  selectedParaphraseOption = 0,
  onSelectParaphraseOption
}) {
  const [copiedIndex, setCopiedIndex] = useState(null)

  if (!results) return null

  const copyToClipboard = async (text, index = 'main') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      toast.success('Copied to clipboard!')
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const typeConfig = {
    grammar: { label: 'Grammar Check', color: '#2563EB', bg: '#DBEAFE', icon: '✓' },
    paraphrase: { label: 'Paraphrase', color: '#D97706', bg: '#FEF3C7', icon: '✨' },
    translate: { label: 'Translation', color: '#7C3AED', bg: '#EDE9FE', icon: '🌐' },
    ocr: { label: 'OCR Result', color: '#059669', bg: '#D1FAE5', icon: '🔍' },
  }

  const config = typeConfig[processingType] || typeConfig.ocr

  const processingTime = results.processing_time_ms
    ? `${(results.processing_time_ms / 1000).toFixed(2)}s`
    : null

  return (
    <div className="results-panel animate-fadeIn">
      {/* Header */}
      <div className="results-header">
        <div className="results-type-badge" style={{ background: config.bg, color: config.color }}>
          <span>{config.icon}</span>
          <span>{config.label}</span>
        </div>
        {processingTime && (
          <span className="results-time">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {processingTime}
          </span>
        )}
      </div>

      <div className="results-body">
        {/* ===== Grammar Results ===== */}
        {processingType === 'grammar' && (
          <div className="results-section">
            {/* Stats */}
            <div className="results-stats">
              <div className={`stat-card ${results.issues_found === 0 ? 'stat-success' : 'stat-warning'}`}>
                <span className="stat-number">{results.issues_found}</span>
                <span className="stat-label">
                  {results.issues_found === 0 ? 'No issues found' : `Issue${results.issues_found > 1 ? 's' : ''} found`}
                </span>
              </div>
            </div>

            {/* Issues List */}
            {results.suggestions && results.suggestions.length > 0 ? (
              <div className="issues-list">
                <p className="issues-title">Grammar Issues:</p>
                {results.suggestions.map((suggestion, idx) => (
                  <div key={idx} className="issue-item">
                    <div className="issue-header">
                      <span className="issue-number">#{idx + 1}</span>
                      <div className="issue-header-content">
                        <p className="issue-message">{suggestion.message}</p>
                        {suggestion.original && (
                          <p className="issue-fragment">
                            Error: <mark>{suggestion.original}</mark>
                          </p>
                        )}
                      </div>
                      <div className="issue-actions">
                        {onFocusGrammarIssue && (
                          <button
                            className="issue-action-btn"
                            onClick={() => onFocusGrammarIssue(suggestion)}
                            title="Locate this issue in editor"
                          >
                            Highlight
                          </button>
                        )}
                        {onIgnoreGrammarSuggestion && (
                          <button
                            className="issue-action-btn issue-action-muted"
                            onClick={() => onIgnoreGrammarSuggestion(idx)}
                            title="Ignore this issue"
                          >
                            Ignore
                          </button>
                        )}
                      </div>
                    </div>
                    {suggestion.replacements && suggestion.replacements.length > 0 && (
                      <div className="issue-suggestions">
                        <span className="suggestions-label">Suggestions:</span>
                        <div className="suggestion-tags">
                          {suggestion.replacements.map((r, ridx) => (
                            <button
                              key={ridx}
                              className="suggestion-tag"
                              onClick={() => {
                                if (onApplyGrammarSuggestion) {
                                  onApplyGrammarSuggestion(suggestion, r, idx)
                                } else if (onUseText) {
                                  onUseText(r)
                                }
                              }}
                              title="Click to use this suggestion"
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-issues">
                <div className="no-issues-icon">✓</div>
                <p>Your text looks great!</p>
                <span>No grammar issues detected</span>
              </div>
            )}

            {/* Corrected Text */}
            {results.corrected_text && (
              <div className="result-text-block">
                <div className="result-text-header">
                  <span>Corrected Text</span>
                  <div className="result-text-actions">
                    <button
                      className="result-action-btn"
                      onClick={() => copyToClipboard(results.corrected_text, 'corrected')}
                    >
                      {copiedIndex === 'corrected' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      Copy
                    </button>
                    {onUseText && (
                      <button
                        className="result-action-btn result-action-primary"
                        onClick={() => onUseText(results.corrected_text)}
                      >
                        Use Text
                      </button>
                    )}
                  </div>
                </div>
                <p className="result-text-content">{results.corrected_text}</p>
              </div>
            )}
          </div>
        )}

        {/* ===== Paraphrase Results ===== */}
        {processingType === 'paraphrase' && results.paraphrased_text && (
          <div className="results-section">
            {[
              results.paraphrased_text,
              ...(Array.isArray(results.alternatives) ? results.alternatives : [])
            ]
              .filter((item, index, arr) => item && arr.indexOf(item) === index)
              .map((option, idx) => {
                const isSelected = selectedParaphraseOption === idx
                const id = idx === 0 ? 'main' : `alt-${idx - 1}`

                return (
                  <div
                    key={id}
                    className={`result-text-block ${idx === 0 ? 'result-text-primary' : ''} ${isSelected ? 'result-text-selected' : ''}`}
                  >
                    <div className="result-text-header">
                      <span>{idx === 0 ? 'Paraphrased Text' : `Alternative ${idx}`}</span>
                      <div className="result-text-actions">
                        <button
                          className="result-action-btn"
                          onClick={() => copyToClipboard(option, id)}
                        >
                          {copiedIndex === id ? '✓ Copied' : 'Copy'}
                        </button>
                        {onSelectParaphraseOption && (
                          <button
                            className={`result-action-btn ${isSelected ? 'result-action-primary' : ''}`}
                            onClick={() => onSelectParaphraseOption(option, idx)}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                        )}
                        {onUseText && (
                          <button
                            className="result-action-btn result-action-primary"
                            onClick={() => onUseText(option)}
                          >
                            Use Text
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="result-text-content">{option}</p>
                  </div>
                )
              })}
          </div>
        )}

        {/* ===== Translation Results ===== */}
        {processingType === 'translate' && results.translated_text && (
          <div className="results-section">
            {/* Language Info */}
            <div className="translation-info">
              <div className="lang-flow">
                <span className="lang-tag">
                  {results.detected_language || results.source_language || 'Auto'}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="lang-tag lang-tag-target">{results.target_language}</span>
              </div>
              {results.detected_language && results.detected_language !== results.source_language && (
                <span className="detected-lang-note">
                  Auto-detected: {results.detected_language}
                </span>
              )}
            </div>

            <div className="result-text-block result-text-primary">
              <div className="result-text-header">
                <span>Translated Text</span>
                <div className="result-text-actions">
                  <button
                    className="result-action-btn"
                    onClick={() => copyToClipboard(results.translated_text, 'translated')}
                  >
                    {copiedIndex === 'translated' ? '✓ Copied' : 'Copy'}
                  </button>
                  {onUseText && (
                    <button
                      className="result-action-btn result-action-primary"
                      onClick={() => onUseText(results.translated_text)}
                    >
                      Use Text
                    </button>
                  )}
                </div>
              </div>
              <p className="result-text-content">{results.translated_text}</p>
            </div>
          </div>
        )}

        {/* ===== OCR Results ===== */}
        {processingType === 'ocr' && results.extracted_text && (
          <div className="results-section">
            {/* OCR Stats */}
            <div className="ocr-stats-grid">
              <div className="ocr-stat">
                <span className="ocr-stat-value">
                  {(results.confidence_score * 100).toFixed(0)}%
                </span>
                <span className="ocr-stat-label">Confidence</span>
              </div>
              {results.image_dimensions && (
                <div className="ocr-stat">
                  <span className="ocr-stat-value">
                    {results.image_dimensions.width}×{results.image_dimensions.height}
                  </span>
                  <span className="ocr-stat-label">Image Size</span>
                </div>
              )}
              <div className="ocr-stat">
                <span className="ocr-stat-value">
                  {results.extracted_text.split(/\s+/).filter(Boolean).length}
                </span>
                <span className="ocr-stat-label">Words</span>
              </div>
            </div>

            <div className="result-text-block result-text-primary">
              <div className="result-text-header">
                <span>Extracted Text</span>
                <div className="result-text-actions">
                  <button
                    className="result-action-btn"
                    onClick={() => copyToClipboard(results.extracted_text, 'ocr')}
                  >
                    {copiedIndex === 'ocr' ? '✓ Copied' : 'Copy'}
                  </button>
                  {onUseText && (
                    <button
                      className="result-action-btn result-action-primary"
                      onClick={() => onUseText(results.extracted_text)}
                    >
                      Use Text
                    </button>
                  )}
                </div>
              </div>
              <p className="result-text-content">{results.extracted_text}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ResultsPanel
