import { useState } from 'react'
import Modal from './Modal'
import './ExportModal.css'

function ExportModal({ isOpen, onClose, onExport, hasResults = false }) {
  const [selectedFormat, setSelectedFormat] = useState('pdf')

  const formats = [
    {
      id: 'pdf',
      name: 'PDF Document',
      description: 'Professional PDF with formatting',
      icon: '📄'
    },
    {
      id: 'docx',
      name: 'Word Document',
      description: 'Edit in Microsoft Word or similar',
      icon: '📋'
    },
    {
      id: 'txt',
      name: 'Plain Text',
      description: 'Simple text file',
      icon: '📝'
    }
  ]

  const handleExport = () => {
    onExport(selectedFormat)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      title="Export Results"
      onClose={onClose}
      size="md"
    >
      <div className="export-modal-content">
        <p className="export-description">
          Choose a format to download your results
        </p>

        <div className="format-options">
          {formats.map(format => (
            <label key={format.id} className="format-option">
              <input
                type="radio"
                name="export-format"
                value={format.id}
                checked={selectedFormat === format.id}
                onChange={(e) => setSelectedFormat(e.target.value)}
                disabled={!hasResults}
              />
              <div className="option-content">
                <span className="option-icon">{format.icon}</span>
                <div className="option-text">
                  <span className="option-name">{format.name}</span>
                  <span className="option-desc">{format.description}</span>
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className="export-actions">
          <button
            className="btn btn-outline"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={!hasResults}
          >
            Download
          </button>
        </div>

        {!hasResults && (
          <p className="export-warning">
            Process your text first to enable export
          </p>
        )}
      </div>
    </Modal>
  )
}

export default ExportModal
