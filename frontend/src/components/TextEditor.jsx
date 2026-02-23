import { useState } from 'react'
import './TextEditor.css'

function TextEditor({ text, onChange, placeholder = 'Paste or type text here...', readOnly = false }) {
  const [charCount, setCharCount] = useState(0)
  const [wordCount, setWordCount] = useState(0)

  const handleChange = (e) => {
    const newText = e.target.value
    onChange(newText)

    // Calculate stats
    setCharCount(newText.length)
    const words = newText.trim().split(/\s+/).filter(w => w.length > 0).length
    setWordCount(newText.trim().length > 0 ? words : 0)
  }

  const handleClear = () => {
    onChange('')
    setCharCount(0)
    setWordCount(0)
  }

  const handleSelectAll = () => {
    document.querySelector('.text-editor textarea')?.select()
  }

  return (
    <div className="text-editor">
      <div className="editor-header">
        <h3>Text Editor</h3>
        <div className="editor-stats">
          <span className="stat">
            <strong>{wordCount}</strong> words
          </span>
          <span className="stat">
            <strong>{charCount}</strong> characters
          </span>
        </div>
      </div>

      <textarea
        className="editor-textarea"
        value={text}
        onChange={handleChange}
        placeholder={placeholder}
        readOnly={readOnly}
      />

      <div className="editor-footer">
        <div className="editor-actions">
          <button
            className="btn btn-sm btn-outline"
            onClick={handleSelectAll}
            title="Select all text"
          >
            Select All
          </button>
          <button
            className="btn btn-sm btn-outline"
            onClick={handleClear}
            title="Clear text"
          >
            Clear
          </button>
        </div>
        <p className="editor-hint">
          {text.length > 0 ? (
            <>
              Support up to 50,000 characters. Using {Math.round((charCount / 50000) * 100)}%
            </>
          ) : (
            'Start typing or paste text to analyze'
          )}
        </p>
      </div>
    </div>
  )
}

export default TextEditor
