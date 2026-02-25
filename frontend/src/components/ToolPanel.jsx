import { useState } from 'react'
import LanguageSelector from './LanguageSelector'
import './ToolPanel.css'

function ToolPanel({
  onGrammarCheck,
  onParaphrase,
  onTranslate,
  onExport,
  hasText = false,
  disabled = false,
  targetLanguage = 'vi',
  onLanguageChange
}) {
  const [paraphraseStyle, setParaphraseStyle] = useState('normal')
  const [showTranslateOptions, setShowTranslateOptions] = useState(false)

  const paraphraseStyles = [
    { value: 'normal', label: 'Normal', desc: 'Preserve meaning' },
    { value: 'formal', label: 'Formal', desc: 'Professional tone' },
    { value: 'casual', label: 'Casual', desc: 'Conversational' },
  ]

  return (
    <div className="tool-panel">
      <div className="tool-panel-header">
        <h3>Processing Tools</h3>
        <span className={`tool-status ${hasText ? 'status-ready' : 'status-waiting'}`}>
          {hasText ? (
            <>
              <span className="status-dot"></span>
              Ready
            </>
          ) : (
            <>
              <span className="status-dot waiting"></span>
              Waiting for text
            </>
          )}
        </span>
      </div>

      <div className="tools-list">
        {/* Grammar Check */}
        <div className="tool-item">
          <div className="tool-item-info">
            <div className="tool-item-icon" style={{ background: '#DBEAFE', color: '#2563EB' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="tool-name">Grammar Check</p>
              <p className="tool-desc">Find & fix grammar errors</p>
            </div>
          </div>
          <button
            className="btn btn-sm tool-run-btn"
            onClick={onGrammarCheck}
            disabled={disabled || !hasText}
            style={{ '--tool-color': '#2563EB' }}
          >
            Check
          </button>
        </div>

        {/* Paraphrase */}
        <div className="tool-item tool-item-expandable">
          <div className="tool-item-info">
            <div className="tool-item-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="tool-name">Paraphrase</p>
              <p className="tool-desc">Rewrite with AI</p>
            </div>
          </div>
          <button
            className="btn btn-sm tool-run-btn"
            onClick={() => onParaphrase(paraphraseStyle)}
            disabled={disabled || !hasText}
            style={{ '--tool-color': '#D97706' }}
          >
            Rewrite
          </button>

          {/* Style Selector */}
          <div className="tool-options">
            <span className="tool-options-label">Style:</span>
            <div className="style-pills">
              {paraphraseStyles.map(style => (
                <button
                  key={style.value}
                  className={`style-pill ${paraphraseStyle === style.value ? 'style-pill-active' : ''}`}
                  onClick={() => setParaphraseStyle(style.value)}
                  disabled={disabled}
                  title={style.desc}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Translate */}
        <div className="tool-item tool-item-expandable">
          <div className="tool-item-info">
            <div className="tool-item-icon" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M3 5h12M9 3v2m-3.232 13.232l2.828-2.829m0 0l3.536 3.536M8.596 17.403L12 14M2 21l4.5-4.5M21 15l-3-3-3 3M18 12v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="tool-name">Translate</p>
              <p className="tool-desc">28+ languages</p>
            </div>
          </div>
          <button
            className="btn btn-sm tool-run-btn"
            onClick={onTranslate}
            disabled={disabled || !hasText}
            style={{ '--tool-color': '#7C3AED' }}
          >
            Translate
          </button>

          {/* Language Selector */}
          <div className="tool-options">
            <span className="tool-options-label">Target:</span>
            <div className="tool-lang-select">
              <LanguageSelector
                value={targetLanguage}
                onChange={onLanguageChange}
                includeAuto={false}
                compact={true}
              />
            </div>
          </div>
        </div>

        {/* Export */}
        <div className="tool-item">
          <div className="tool-item-info">
            <div className="tool-item-icon" style={{ background: '#D1FAE5', color: '#059669' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="tool-name">Export Results</p>
              <p className="tool-desc">PDF, DOCX, TXT</p>
            </div>
          </div>
          <button
            className="btn btn-sm tool-run-btn"
            onClick={onExport}
            disabled={disabled}
            style={{ '--tool-color': '#059669' }}
          >
            Export
          </button>
        </div>
      </div>

      {!hasText && (
        <div className="tool-panel-hint">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Enter text in the editor or upload an image to get started
        </div>
      )}
    </div>
  )
}

export default ToolPanel
