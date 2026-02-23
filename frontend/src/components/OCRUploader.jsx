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
        if (item.type.startsWith('image/')) {
          const blob = await item.getType(item.type)
          processFile(blob)
          return
        }
      }
      toast.error('No image found in clipboard')
    } catch (err) {
      toast.error('Failed to read clipboard')
    }
  }

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
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
      <div className="uploader-header">
        <h3>Upload Image for OCR</h3>
        <p>Extract text from images, screenshots, and documents</p>
      </div>

      {/* Drag & Drop Zone */}
      <div
        className={`drag-drop-zone ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="drop-content">
          <div className="drop-icon">📤</div>
          <p className="drop-text">Drag and drop an image here</p>
          <p className="drop-subtext">or use one of the options below</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileInput}
          className="file-input"
          disabled={processing}
        />
      </div>

      {/* Action Buttons */}
      <div className="uploader-actions">
        <button
          className="btn btn-primary action-btn upload-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={processing}
        >
          <span className="btn-icon">📁</span>
          <span className="btn-text">Upload File</span>
        </button>

        <button
          className="btn btn-primary action-btn camera-btn"
          onClick={() => cameraInputRef.current?.click()}
          disabled={processing}
        >
          <span className="btn-icon">📷</span>
          <span className="btn-text">Take Photo</span>
        </button>

        <button
          className="btn btn-primary action-btn paste-btn"
          onClick={handlePaste}
          disabled={processing}
        >
          <span className="btn-icon">📋</span>
          <span className="btn-text">Paste Image</span>
        </button>

        <button
          className="btn btn-primary action-btn url-btn"
          onClick={() => setShowUrlInput(!showUrlInput)}
          disabled={processing}
        >
          <span className="btn-icon">🔗</span>
          <span className="btn-text">From URL</span>
        </button>
      </div>

      {/* URL Input Section */}
      {showUrlInput && (
        <div className="url-input-section">
          <input
            type="url"
            placeholder="Enter image URL..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
            className="form-input url-input"
            disabled={processing}
          />
          <div className="url-buttons">
            <button
              className="btn btn-primary btn-sm"
              onClick={handleUrlSubmit}
              disabled={processing}
            >
              Load Image
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                setShowUrlInput(false)
                setUrlInput('')
              }}
              disabled={processing}
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
        className="file-input"
        disabled={processing}
      />

      {/* Info Section */}
      <div className="uploader-info">
        <p>✓ Supported: JPG, PNG, WebP, PDF</p>
        <p>✓ Maximum file size: 10MB</p>
        <p>✓ Your images are processed securely</p>
      </div>
    </div>
  )
}

export default OCRUploader
