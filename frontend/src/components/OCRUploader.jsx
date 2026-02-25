import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import './OCRUploader.css'

function OCRUploader({ onImageSelect, processing = false }) {
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const processFile = (file) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Please upload an image or PDF file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      onImageSelect({
        type: 'upload',
        data: e.target.result,
        fileName: file.name
      })
    }
    reader.readAsDataURL(file)
  }

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
    }
  }

  const handleCameraCapture = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
    }
  }

  const handlePaste = async () => {
    try {
      const items = await navigator.clipboard.read()
      for (let item of items) {
        for (let type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type)
            processFile(blob)
            return
          }
        }
      }
      toast.error('No image found in clipboard')
    } catch (err) {
      toast.error('Failed to read clipboard. Try Ctrl+V in the text area.')
    }
  }

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      toast.error('Please enter a valid URL')
      return
    }
    try {
      new URL(urlInput)
    } catch {
      toast.error('Please enter a valid URL')
      return
    }
    onImageSelect({
      type: 'url',
      url: urlInput,
      fileName: 'image-from-url'
    })
    setUrlInput('')
    setShowUrlInput(false)
  }

  return (
    <div className="ocr-uploader">
      {/* Header */}
      <div className="uploader-header">
        <div className="uploader-header-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M7 8h10M7 12h6M7 16h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="18" cy="18" r="5" fill="#3B82F6" stroke="white" strokeWidth="1.5"/>
            <path d="M16.5 18l1 1 2-2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h3>OCR Text Extraction</h3>
          <p>Upload an image to extract text using AI</p>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        className={`drag-drop-zone ${dragActive ? 'drag-active' : ''} ${processing ? 'processing' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !processing && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && !processing && fileInputRef.current?.click()}
        aria-label="Upload image for OCR"
      >
        {processing ? (
          <div className="drop-processing">
            <div className="processing-spinner"></div>
            <p>Extracting text from image...</p>
            <span>This may take a few seconds</span>
          </div>
        ) : (
          <div className="drop-content">
            <div className="drop-icon-wrap">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="drop-title">
              {dragActive ? 'Drop image here' : 'Drag & drop image here'}
            </p>
            <p className="drop-subtitle">or click to browse files</p>
            <div className="drop-formats">
              <span>JPG</span>
              <span>PNG</span>
              <span>WebP</span>
              <span>PDF</span>
              <span className="format-limit">Max 10MB</span>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileInput}
          className="file-input-hidden"
          disabled={processing}
        />
      </div>

      {/* Action Buttons */}
      <div className="uploader-actions">
        <button
          className="upload-action-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={processing}
          title="Upload from computer"
        >
          <div className="action-btn-icon" style={{ background: '#DBEAFE', color: '#2563EB' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span>Browse Files</span>
        </button>

        <button
          className="upload-action-btn"
          onClick={() => cameraInputRef.current?.click()}
          disabled={processing}
          title="Take photo with camera"
        >
          <div className="action-btn-icon" style={{ background: '#D1FAE5', color: '#059669' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <span>Camera</span>
        </button>

        <button
          className="upload-action-btn"
          onClick={handlePaste}
          disabled={processing}
          title="Paste from clipboard"
        >
          <div className="action-btn-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <span>Paste</span>
        </button>

        <button
          className="upload-action-btn"
          onClick={() => setShowUrlInput(!showUrlInput)}
          disabled={processing}
          title="Load from URL"
        >
          <div className="action-btn-icon" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span>From URL</span>
        </button>
      </div>

      {/* URL Input */}
      {showUrlInput && (
        <div className="url-input-section animate-fadeIn">
          <div className="url-input-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="url-input-icon">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              className="form-input url-input"
              disabled={processing}
              autoFocus
            />
          </div>
          <div className="url-actions">
            <button
              className="btn btn-primary btn-sm"
              onClick={handleUrlSubmit}
              disabled={processing || !urlInput.trim()}
            >
              Load Image
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setShowUrlInput(false)
                setUrlInput('')
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Hidden Camera Input */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="file-input-hidden"
        disabled={processing}
      />

      {/* Info Footer */}
      <div className="uploader-info">
        <div className="info-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Powered by local OCR engine
        </div>
        <div className="info-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Secure processing
        </div>
        <div className="info-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          ~2-5 seconds
        </div>
      </div>
    </div>
  )
}

export default OCRUploader
