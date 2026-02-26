import { useState, useRef } from 'react'
import { useEffect } from 'react'
import toast from 'react-hot-toast'
import './TextEditor.css'

function TextEditor({
  text,
  onChange,
  placeholder = 'Paste or type text here...',
  readOnly = false,
  locateRange = null
}) {
  const textareaRef = useRef(null)
  const [highlightPulse, setHighlightPulse] = useState(false)

  const charCount = text.length
  const wordCount = text.trim().length > 0
    ? text.trim().split(/\s+/).filter(w => w.length > 0).length
    : 0
  const lineCount = text.split('\n').length
  const charPercent = Math.min(Math.round((charCount / 50000) * 100), 100)

  const handleChange = (e) => {
    onChange(e.target.value)
  }

  const handleClear = () => {
    onChange('')
    textareaRef.current?.focus()
  }

  const handleCopy = async () => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Text copied to clipboard!')
    } catch {
      toast.error('Failed to copy')
    }
  }

  const handleSelectAll = () => {
    textareaRef.current?.select()
  }

  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText()
      if (clipText) {
        onChange(text + clipText)
        toast.success('Text pasted!')
      }
    } catch {
      toast.error('Failed to paste. Use Ctrl+V instead.')
    }
  }

  useEffect(() => {
    if (!locateRange || !textareaRef.current) return

    const start = Math.max(0, Number(locateRange.start || 0))
    const end = Math.max(start, Number(locateRange.end || start))
    const target = textareaRef.current

    target.focus()
    target.setSelectionRange(start, end)

    // Ensure located issue is visible even in very long text blocks.
    const before = (target.value || '').slice(0, start)
    const linesBefore = before.split('\n').length
    const lineHeightPx = 26
    const desiredTop = Math.max(0, (linesBefore - 3) * lineHeightPx)
    target.scrollTop = desiredTop

    setHighlightPulse(false)
    requestAnimationFrame(() => setHighlightPulse(true))

    const timer = setTimeout(() => setHighlightPulse(false), 1200)
    return () => clearTimeout(timer)
  }, [locateRange])

  return (
    <div className="text-editor">
      {/* Editor Header */}
      <div className="text-editor-header">
        <div className="editor-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Text Editor</span>
        </div>
        <div className="editor-toolbar">
          <button
            className="editor-tool-btn"
            onClick={handlePaste}
            disabled={readOnly}
            title="Paste from clipboard"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Paste
          </button>
          <button
            className="editor-tool-btn"
            onClick={handleCopy}
            disabled={!text}
            title="Copy all text"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Copy
          </button>
          <button
            className="editor-tool-btn editor-tool-danger"
            onClick={handleClear}
            disabled={!text || readOnly}
            title="Clear all text"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Clear
          </button>
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        className={`editor-textarea ${highlightPulse ? 'editor-textarea-focus-pulse' : ''}`}
        value={text}
        onChange={handleChange}
        placeholder={placeholder}
        readOnly={readOnly}
        spellCheck={true}
      />

      {/* Editor Footer */}
      <div className="text-editor-footer">
        <div className="editor-stats">
          <span className="editor-stat">
            <strong>{wordCount.toLocaleString()}</strong> words
          </span>
          <span className="editor-stat-divider">·</span>
          <span className="editor-stat">
            <strong>{charCount.toLocaleString()}</strong> chars
          </span>
          <span className="editor-stat-divider">·</span>
          <span className="editor-stat">
            <strong>{lineCount}</strong> lines
          </span>
        </div>

        {charCount > 0 && (
          <div className="editor-progress">
            <div
              className="editor-progress-bar"
              style={{
                width: `${charPercent}%`,
                background: charPercent > 80 ? 'var(--warning-yellow)' : 'var(--primary-navy)'
              }}
            ></div>
            <span className="editor-progress-label">{charPercent}% of 50k</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default TextEditor
