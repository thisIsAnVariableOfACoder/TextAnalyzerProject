import { useState } from 'react'
import './ToolPanel.css'

function ToolPanel({
  onGrammarCheck,
  onParaphrase,
  onTranslate,
  onExport,
  hasText = false,
  disabled = false,
  selectedLanguage = 'en'
}) {
  const [expandedTool, setExpandedTool] = useState(null)

  const tools = [
    {
      id: 'grammar',
      icon: '✓',
      label: 'Grammar Check',
      description: 'Find and fix grammar errors',
      action: onGrammarCheck,
      color: '#3B82F6'
    },
    {
      id: 'paraphrase',
      icon: '✨',
      label: 'Paraphrase',
      description: 'Improve and rewrite text',
      action: onParaphrase,
      color: '#F59E0B',
      submenu: [
        { label: 'Normal', value: 'normal' },
        { label: 'Formal', value: 'formal' },
        { label: 'Casual', value: 'casual' }
      ]
    },
    {
      id: 'translate',
      icon: '🌐',
      label: 'Translate',
      description: 'Translate to another language',
      action: onTranslate,
      color: '#10B981'
    },
    {
      id: 'export',
      icon: '📥',
      label: 'Export',
      description: 'Download results',
      action: onExport,
      color: '#8B5CF6',
      submenu: [
        { label: 'PDF', value: 'pdf' },
        { label: 'DOCX', value: 'docx' },
        { label: 'TXT', value: 'txt' }
      ]
    }
  ]

  const handleToolClick = (tool, submenuValue = null) => {
    if (tool.submenu) {
      if (expandedTool === tool.id) {
        setExpandedTool(null)
      } else {
        setExpandedTool(tool.id)
      }
    } else {
      tool.action(submenuValue)
      setExpandedTool(null)
    }
  }

  return (
    <div className="tool-panel">
      <div className="panel-header">
        <h3>Processing Tools</h3>
        <p>Select a tool to process your text</p>
      </div>

      <div className="tools-grid">
        {tools.map(tool => (
          <div key={tool.id} className="tool-wrapper">
            <button
              className={`tool-button ${expandedTool === tool.id ? 'expanded' : ''}`}
              onClick={() => handleToolClick(tool)}
              disabled={disabled || (tool.id !== 'export' && !hasText)}
              style={{
                borderTopColor: tool.color
              }}
              title={tool.description}
            >
              <span className="tool-icon" style={{ color: tool.color }}>
                {tool.icon}
              </span>
              <span className="tool-label">{tool.label}</span>
              {tool.submenu && (
                <span className="tool-arrow">
                  {expandedTool === tool.id ? '▲' : '▼'}
                </span>
              )}
            </button>

            {/* Submenu */}
            {tool.submenu && expandedTool === tool.id && (
              <div className="tool-submenu">
                {tool.submenu.map(item => (
                  <button
                    key={item.value}
                    className="submenu-item"
                    onClick={() => {
                      tool.action(item.value)
                      setExpandedTool(null)
                    }}
                    disabled={disabled || !hasText}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="panel-info">
        <p className="info-text">
          {hasText ? (
            <>✓ Ready to process text</>
          ) : (
            <>Start by uploading an image or entering text</>
          )}
        </p>
      </div>
    </div>
  )
}

export default ToolPanel
